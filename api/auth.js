const md5 = require('md5');
const express = require('express');
const Router = express.Router();

const config = require('../config/config');

const Model = require('../models');
const Params = require('../libs/params');
const Validators = require('../libs/validators');
const Sms = require('../services/sms');
const Mail = require('../services/mail');

// создание объекта с данными об авторизации на основе записи о пользователе из БД
function createAuthData (user) {
  const authData = {
    userId : user.id,
    userName : [ user.surname, user.firstname, user.patronymic ].join(' ').trim(),
  };
  if (user.phone && !user.phone_confirmed) {
    authData.needConfirmation = 'phone';
  }
  else if (user.mail && !user.mail_confirmed) {
    authData.needConfirmation = 'mail';      
  }
  return authData;
}

// запрос статуса авториации
Router.post('/info', async (req, res, next) => {
  try {
    if (req.session.userId) {
      const [ user ] = await Model.users.get({ id : req.session.userId, });
      if (!user) {
        req.session.userId = false;
        res.send({ status : 'ok', data : { userId : false, }, });
      }
      const authData = createAuthData(user);
      res.send({ status : 'ok', data : authData, });
    }
    else {
      res.send({ status : 'ok', data : { userId : false, }, });
    }    
  }
  catch (error) {
    console.log(error);
    res.send({ status : 'bad', message : 'Ошибка выполнения запроса', });
  }
});

// авторизация
Router.post('/login', async (req, res, next) => {
  try {    
    Params.check(req.body, {
      'login' : { type : 'string', required : true, },
      'password' : { type : 'string', required : true, },
    });
    
    const { login, password } = req.body;
    
    // валидация параметров
    const validationResults = [
      Validators.validateLogin(login),
      Validators.validatePassword(password)      
    ];
    const validationErrors = [];
    validationResults.forEach(item => {
      if (!item.status) validationErrors.push(item.message);
    });
    if (validationErrors.length) {
      return res.send({ status : 'bad', message : validationErrors.join('; '), });
    }
    
    // запрос данных пользователя
    const loginType = Validators.checkLoginType(login);
    const getUserData = { password };
    if (loginType == 'phone') {
      getUserData.phone = login;
    }
    else {
      getUserData.mail = login;
    }
    const [ user ] = await Model.users.get(getUserData);
    
    if (typeof user === "undefined") {
      return res.send({ status : 'bad', message : 'Пользователь с указанныи данными не найден', });
    }
      
    // авторизация пользователя
    req.session.userId = user.id;
    
    const authData = createAuthData(user);
    res.send({ status : 'ok', data : authData, });
  }
  catch (error) {
    console.log(error);
    res.send({ status : 'bad', message : 'Ошибка выполнения запроса', });
  }
});

// выход
Router.post('/logout', (req, res, next) => {
  try {
    req.session.userId = false;
    res.send({ status : 'ok', });    
  }
  catch (error) {
    console.log(error);
    res.send({ status : 'bad', message : 'Ошибка выполнения запроса', });
  }
});

// регистрация пользователя
Router.post('/register', async (req, res, next) => {
  try {
    Params.check(req.body, {
      'surname' : { type : 'string', required : true, },
      'firstname' : { type : 'string', required : true, },
      'patronymic' : { type : 'string', },
      'login' : { type : 'string', required : true, },
      'password' : { type : 'string', required : true, },
    });
    
    const { surname, firstname, patronymic, login, password } = req.body;
    
    // валидация параметров
    const validationResults = [
      Validators.validateName(surname),
      Validators.validateName(firstname),
      patronymic ? Validators.validateName(patronymic) : { status : true, },
      Validators.validateLogin(login),
      Validators.validatePassword(password)      
    ];
    const validationErrors = [];
    validationResults.forEach(item => {
      if (!item.status) validationErrors.push(item.message);
    });
    if (validationErrors.length) {
      return res.send({ status : 'bad', message : validationErrors.join('; '), });
    }
        
    // добавление пользователя в БД
    const addUserData = { surname, firstname, password };
    if (patronymic) addUserData.patronymic = patronymic;
    let phoneConfirmCode;
    let mailConfirmCode;
    const loginType = Validators.checkLoginType(login);
    if (loginType == 'phone') {
      phoneConfirmCode = ( '00000' + String( Math.floor(Math.random() * 1000000)) ).slice(-5);
      addUserData.phone = login;
      addUserData.phoneConfirmCode = phoneConfirmCode;
    }
    else {
      mailConfirmCode = md5(Math.random());
      addUserData.mail = login;
      addUserData.mailConfirmCode = mailConfirmCode;
    }
    const newUserId = await Model.users.add(addUserData);
    
    // авторизация пользователя
    req.session.userId = newUserId;
    
    // отправка подтверждения
    if (loginType == 'phone') {
      Sms.send(login, 'Код подтверждения ' + phoneConfirmCode);
    }
    else {
      const link = config.url + '/confirm/?action=register&key=' + md5(login) + '&code=' + mailConfirmCode;
      Mail.send(
      // await Mail.send(
        login,
        'Подтверждение адреса электронной почты',
        'Ссылка для подтверждения <a href="' + link + '">' + link + '</a>'
      );
    }
    
    res.send({ 
      status : 'ok', 
      data : {        
        userId : newUserId, 
        userName : [ surname, firstname, patronymic ].join(' ').trim(),
        needConfirmation : loginType,
      },
    });
  }
  catch (error) {
    console.log(error);
    res.send({ status : 'bad', message : 'Ошибка выполнения запроса', });
  }
});

// повторная отправка кода подтверждения (ссылки)
Router.post('/repeat', async (req, res, next) => {
  try {
    console.log(req.body);
    Params.check(req.body, {
      'target' : { type : 'string', required : true, },
      'action' : { type : 'string', required : true, },
      'key' : { type : 'string', },
    });

    const { action, target, key } = req.body;
    
    if (( action !== 'register' && action !== 'restore' ) || ( target !== 'phone' && target !== 'mail' )) {
      throw new Error('Ошибка входных параметров');
    }
    
    if (action === 'register') {
      if (!req.session.userId) throw new Error('У пользователя отсутствует переменная сессии');
      
      const [ user ] = await Model.users.get({ id : req.session.userId, });
      
      if (target === 'phone') {
        Sms.send(user.phone, 'Код подтверждения ' + user.phone_confirm_code);
      }
      else {    // target == mail
        const link = config.url + '/confirm/?action=register&key=' + md5(user.mail) + '&code=' + user.mail_confirm_code;
        Mail.send(
          user.mail,
          'Подтверждение адреса электронной почты',
          'Ссылка для подтверждения <a href="' + link + '">' + link + '</a>'
        )
        .catch(error => { throw error; });
      }
    }
    else {    // action == restore
      if (typeof key == "undefined" || !key) throw new Error('Неверный параметр key');
      
      if (target == 'phone') {
        const [ user ] = await Model.users.get({ phone : key, });
        console.log(user);
        if (!user) throw new Error('Недействительный параметр key');
        
        await Sms.send(user.phone, 'Код восстановления ' + user.phone_restore_code);
      }
      else {
        const [ user ] = await Model.users.get({ mail : key, });
        if (!user) throw new Error('Недействительный параметр key');
        
        const link = config.url + '/confirm/?action=restore&key=' + md5(user.mail) + '&code=' + user.mail_restore_code;
        // await Mail.send(
        Mail.send(
          user.mail,
          'Восстановление доступа к аккаунту',
          'Ссылка для восстановления доступа <a href="' + link + '">' + link + '</a>'
        );
      }
    }
    
    res.send({ status : 'ok', });
  }
  catch (error) {
    console.log(error);
    res.send({ status : 'bad', message : 'Ошибка выполнения запроса', });
  }
});

// подтверждение телефона или почты
Router.post('/confirm', async (req, res, next) => {
  console.log(req.body);
  try {
    Params.check(req.body, {
      'target' : { type : 'string', required : true, },
      'action' : { type : 'string', required : true, },
      'key' : { type : 'string', },
      'code' : { type : 'string', required : true, },
    });
    
    const { action, target, key, code } = req.body;
    
    if (( action !== 'register' && action !== 'restore' ) || ( target !== 'phone' && target !== 'mail' )) {
      throw new Error('Ошибка входных параметров');
    }
    
    if (action === 'register') {
      if (target === 'phone') {
        if (!req.session.userId) throw new Error('У пользователя отсутствует переменная сессии');
        
        const [ user ] = await Model.users.get({ id : req.session.userId, });
        
        if (code !== user.phone_confirm_code) {
          return res.send({ status : 'bad', message : 'Неверный код подтверждения', });
        }
        await Model.users.set({
          id : user.id,
          phoneConfirmCode : 'NULL',
          phoneConfirmed : 1,
        });
        res.send({ status : 'ok', data : { needConfirmation : false, }, });
      }
      else {
        const mailHash = key;
        const [ user ] = await Model.users.get({ mailHash, });
        
        if (!user) throw new Error('Недействительный параметр key');
        
        if (code !== user.mail_confirm_code) {
          return res.send({ status : 'bad', message : 'Ссылка истекла или недействительна', });
        }
        
        await Model.users.set({
          id : user.id,
          mailConfirmCode : 'NULL',
          mailConfirmed : 1,
        });
        res.send({ status : 'ok', data : { needConfirmation : false, }, });
      }
    }
    else {
      if (target === 'phone') {
        const [ user ] = await Model.users.get({ phone : key, });
        if (!user) throw new Error('Недействительный параметр key');
        
        if (code !== user.phone_restore_code) {
          return res.send({ status : 'bad', message : 'Неверный код подтверждения', });
        }
        
        // авторизация пользователя
        req.session.userId = user.id;
        const authData = createAuthData(user);
        
        res.send({ status : 'ok', data : authData, });
      }
      else {
        const [ user ] = await Model.users.get({ mailHash : key, });
        if (!user) throw new Error('Недействительный параметр key');
        
        if (code !== user.mail_restore_code) {
          return res.send({ status : 'bad', message : 'Ссылка истекла или недействительна', });
        }
        
        await Model.users.set({
          id : user.id,
          mailRestoreCode : 'NULL',
        });
        
        // авторизация пользователя
        req.session.userId = user.id;
        const authData = createAuthData(user);
        
        res.send({ status : 'ok', data : authData, });
      }
    }
  }
  catch (error) {
    console.log(error);
    res.send({ status : 'bad', message : 'Ошибка выполнения запроса', });
  }
});

// восстановление доступа
Router.post('/restore', async (req, res, next) => {
  try {
    // console.log(req.body);
    
    Params.check(req.body, {
      'login' : { type : 'string', required : true, },
      'captcha' : { type : 'string', required : true, },
    });
    
    const { login, captcha } = req.body;
    
    // валидация параметров
    const validationResults = [
      Validators.validateLogin(login),
      Validators.validateCaptcha(captcha)      
    ];
    const validationErrors = [];
    validationResults.forEach(item => {
      if (!item.status) validationErrors.push(item.message);
    });
    if (validationErrors.length) {
      return res.send({ status : 'bad', message : validationErrors.join('; '), });
    }
    
    // проверка капчи
    if (captcha !== req.session.captcha) {
      return res.send({ status : 'bad', message : 'Неверный код с картинки', });
    }
    
    // запрос данных пользователя
    const loginType = Validators.checkLoginType(login);
    const getUserData = {};
    if (loginType == 'phone') {
      getUserData.phone = login;
    }
    else {
      getUserData.mail = login;
    }
    const [ user ] = await Model.users.get(getUserData);
    
    if (!user) return res.send({ status : 'bad', message : 'Пользователя с таким логином не существует', });
    
    // создание и отправка кода восстановления
    if (loginType == 'phone') {
      const phoneRestoreCode = ( '00000' + String( Math.floor(Math.random() * 1000000)) ).slice(-5);
      await Model.users.set({ id : user.id, phoneRestoreCode, });
      await Sms.send(user.phone, 'Код восстановления ' + phoneRestoreCode);
    }
    else {
      const mailRestoreCode = md5(Math.random());
      await Model.users.set({ id : user.id, mailRestoreCode, });
      const link = config.url + '/confirm/?action=restore&key=' + md5(user.mail) + '&code=' + mailRestoreCode;
      Mail.send(
        user.mail,
        'Восстановление доступа к аккаунту',
        'Ссылка для восстановления доступа <a href="' + link + '">' + link + '</a>'
      );
    }
    
    res.send({ status : 'ok', });
  }
  catch (error) {
    console.log(error);
    res.send({ status : 'bad', message : 'Ошибка выполнения запроса', });
  }
});

// изменение пароля
Router.post('/changepass', async (req, res, next) => {
  try {
    if (!req.session.userId) throw new Error('У пользователя отсутствует переменная сессии');
    
    Params.check(req.body, {
      'password' : { type : 'string', required : true, },
    });
    
    const { password } = req.body;
    
    // валидация
    const valid = Validators.validatePassword(password);
    if (!valid.status) return res.send({ status : 'bad', message : valid.message, });
    
    // запрос данных пользователя
    const [ user ] = await Model.users.get({ id : req.session.userId, });
    
    // установка нового пароля
    await Model.users.set({ id : user.id, password, });
    
    res.send({ status : 'ok', });
  }
  catch (error) {
    console.log(error);
    res.send({ status : 'bad', message : 'Ошибка выполнения запроса', });
  }
});

// удаление аккаунта
Router.post('/remove', async (req, res, next) => {
  try {
    if (!req.session.userId) throw new Error('У пользователя отсутствует переменная сессии');
    
    // запрос данных пользователя
    const [ user ] = await Model.users.get({ id : req.session.userId, });
    
    // установка нового пароля
    await Model.users.rm({ id : user.id, });
    
    res.send({ status : 'ok', });
  }
  catch (error) {
    console.log(error);
    res.send({ status : 'bad', message : 'Ошибка выполнения запроса', });
  }
});

module.exports = Router;