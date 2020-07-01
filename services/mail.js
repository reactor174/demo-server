const nodemailer = require('nodemailer');

const config = require('../config/mail');

class Mail {

  constructor() {
    this.config = config.nodemailer;
    this.transporter = null;
  }

  async init() {
    this.transporter = await nodemailer.createTransport(this.config);
  }

  send(to, subject, html, attachments = false) {
    
    if (!to) throw Error('Отсутствует адрес для отправки');
    if (!subject) throw Error('Отсутствует тема письма');
    if (!html) throw Error('Отсутствует текст письма');
    
    const data = { from : config.from, to, subject, html, };
    if (attachments) data.attachments = attachments;
    
    console.log(data);
    
    return new Promise((resolve, reject) => {
      this.transporter.sendMail(data, function (error, info) {
        if (error) return reject(error);
        resolve({ status: 'ok' });
      });
    });    
  }

}

const mail = new Mail();
mail.init();

module.exports = mail;