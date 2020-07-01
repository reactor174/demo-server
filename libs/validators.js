exports.checkLoginType = login => {
  if (login.length > 0) {
    
    // если логин не содержит символов, кроме тех, что используются в номерах телефонов
    const reg = /[^0-9()\s+-]/g;
    
    if (!reg.test(login)) {
      return 'phone';
    }
    else {
      
      // если логин не содержит символов кроме тех, что используется в адресах e-mail
      const reg = /[^0-9A-Za-z\\.@_-]/g;
      
      if (!reg.test(login)) {
        return 'mail';
      }
      else return 'unknown';
    }
  }
  else return 'unknown';
}

exports.validateLogin = login => {
  if (login === '') {
    return { status : false, message : 'Логин не может быть пустым', };
  }
  const loginType = exports.checkLoginType(login);
  if (loginType === 'phone') {
    return exports.validatePhone(login);
  }
  else if (loginType === 'mail') {
    return exports.validateMail(login);
  }
  else {    
    return { status : false, message : 'Введенный логин не является номером телефона или адресом e-mail', };
  }
}

exports.validateMail = mail => {
  return { status : true, };
}

exports.validatePhone = phone => {
  return { status : true, };
}

exports.validatePassword = password => {
  if (password === '') {
    return { status : false, message : 'Необходимо ввести пароль', };
  }
  if (password.length < 6) {
    return { status : false, message : 'Длина пароля должна быть не менее 6 символов', };
  }
  return { status : true, };
}

exports.validateName = name => {
  if (name === '') {
    return { status : false, message : 'Поле не может быть пустым', };
  }
  if (name.length < 2) {
    return { status : false, message : 'Должно быть 2 или более символов', };
  }
  const reg = /[^А-ЯЁа-яё-]/g;
  if (reg.test(name)) {
    return { status : false, message : 'Допустимы только русские буквы и дефис', };
  }
  return { status : true, };
}

exports.validateCaptcha = captcha => {
  if (captcha === '') {
    return { status : false, message : 'Поле не может быть пустым', };
  }
  if (captcha.length !== 5) {
    return { status : false, message : 'Код должен состоять из 5 символов', };
  }
  return { status : true, };
}

exports.validateConfirmationCode = code => {
  if (code === '') {
    return { status : false, message : 'Поле не может быть пустым', };
  }
  if (code.length !== 5) {
    return { status : false, message : 'Код должен состоять из 5 символов', };
  }
  const reg = /[^0-9]/g;
  if (reg.test(code)) {
    return { status : false, message : 'Код может содержать только цифры', };
  }
  return { status : true, };
}