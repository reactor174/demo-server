const db = require('../services/mysql');

exports.get = async arg => {
  
  let id = '';
  if (arg.id) id = `AND u.id = ${arg.id}`;
  
  let phone = '';
  if (arg.phone) phone = `AND u.phone = '${arg.phone}'`;
  
  let mail = '';
  if (arg.mail) mail = `AND u.mail = '${arg.mail}'`;
  
  let mailHash = '';
  if (arg.mailHash) mailHash = `AND MD5(u.mail) = '${arg.mailHash}'`;
  
  let password = '';
  if (arg.password) password = `AND u.password = MD5('${arg.password}')`;
  
  let order = '';
  if (arg.order) order = `ORDER BY ${arg.order}`;
  
  let limit = '';
  if (arg.limit) limit = `LIMIT ${arg.limit}`;
    
  const query = `
    SELECT u.*
    FROM users u
    WHERE 1
      ${id}
      ${phone}
      ${mail}
      ${mailHash}
      ${password}
    ${order}
    ${limit}
  `;
  
  // console.log(query);
  
  const result = await db.exec(query);
  
  return result;
}

exports.set = async arg => {
  
  if (typeof arg.id === "undefined") throw new Error('Не указан идентификатор обновляемой записи');
  
  let password = '';
  if (arg.password) password = `password = MD5('${arg.password}'),`;
  
  let phoneConfirmed = '';
  if (typeof arg.phoneConfirmed !== "undefined") phoneConfirmed = `phone_confirmed = ${arg.phoneConfirmed},`;
  
  let phoneConfirmCode = '';
  if (arg.phoneConfirmCode) {
    if (arg.phoneConfirmCode !== 'NULL') {
      phoneConfirmCode = `phone_confirm_code = '${arg.phoneConfirmCode}',`;
    }
    else {
      phoneConfirmCode = `phone_confirm_code = NULL,`;
    }
  }
  
  let phoneRestoreCode = '';
  if (arg.phoneRestoreCode) {
    if (arg.phoneRestoreCode !== 'NULL') {
      phoneRestoreCode = `phone_restore_code = '${arg.phoneRestoreCode}',`;
    }
    else {
      phoneRestoreCode = `phone_restore_code = NULL,`;
    }
  }

  let mailConfirmed = '';
  if (typeof arg.mailConfirmed !== "undefined") mailConfirmed = `mail_confirmed = ${arg.mailConfirmed},`;
  
  let mailConfirmCode = '';
  if (arg.mailConfirmCode) {
    if (arg.mailConfirmCode !== 'NULL') {
      mailConfirmCode = `mail_confirm_code = '${arg.mailConfirmCode}',`;
    }
    else {
      mailConfirmCode = `mail_confirm_code = NULL,`;
    }
  }

  let mailRestoreCode = '';
  if (arg.mailRestoreCode) {
    if (arg.mailRestoreCode !== 'NULL') {
      mailRestoreCode = `mail_restore_code = '${arg.mailRestoreCode}',`;
    }
    else {
      mailRestoreCode = `mail_restore_code = NULL,`;
    }
  }  
  
  const query = `
    UPDATE users
    SET
      ${password}
      ${phoneConfirmed}
      ${phoneConfirmCode}
      ${phoneRestoreCode}
      ${mailConfirmed}
      ${mailConfirmCode}
      ${mailRestoreCode}
      updated = NOW()
    WHERE id = ${arg.id}
    LIMIT 1
  `;
  
  return await db.exec(query);
  
}

exports.add = async arg => {
  
  if (!arg.surname) throw new Error('Не указана фамилия');
  if (!arg.firstname) throw new Error('Не указано имя');
  if (!arg.phone && !arg.mail) throw new Error('Должен быть указан телефон или e-mail');
  if (!arg.password) throw new Error('Не указан пароль');
  
  let patronymic = '';
  if (arg.patronymic) patronymic = `patronymic = '${arg.patronymic}',`;
  
  let phone = '';
  if (arg.phone) phone = `phone = '${arg.phone}',`;
  
  let phoneConfirmCode = '';
  if (arg.phoneConfirmCode) phoneConfirmCode = `phone_confirm_code = '${arg.phoneConfirmCode}',`;
  
  let mail = '';
  if (arg.mail) mail = `mail = '${arg.mail}',`;
  
  let mailConfirmCode = '';
  if (arg.mailConfirmCode) mailConfirmCode = `mail_confirm_code = '${arg.mailConfirmCode}',`;
  
  const query = `
    INSERT INTO users
    SET
      surname = '${arg.surname}',
      firstname = '${arg.firstname}',
      ${patronymic}
      ${phone}
      ${phoneConfirmCode}
      ${mail}
      ${mailConfirmCode}
      password = MD5('${arg.password}')
  `;
  
  const result = await db.insert(query);
  
  return result;
}

exports.rm = async arg => {
  
  if (!arg.id) throw new Error('Не указан идентификатор пользователя');
  
  const query = `DELETE FROM users WHERE id = ${arg.id} LIMIT 1`;
  
  return await db.exec(query);
}