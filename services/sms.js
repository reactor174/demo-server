const request = require('request');

const config = require('../config/sms');

class Sms {

  constructor() {
    this.config = config;
  }

  send (number, text) {
    if (!number) throw Error('Отсутствует номер телефона');
    if (!text) throw Error('Отсутствует текст сообщения');
    
    // text = text.split(' ').join('+');
    
    const url = 'https://sms.ru/sms/send?api_id=' + this.config.key + '&to=' + number + '&msg=' + text + '&json=1';
    const encodedUrl = encodeURI(url);
    console.log(url);
    console.log(encodedUrl);
    
    return new Promise((resolve, reject) => {
      request(
        encodedUrl,
        // url,
        (error, response, body) => {
          if (error) reject(error);
          try {
            body = JSON.parse(body);
            if (body.status == 'OK') resolve();
          }
          catch (error) {
            reject(error);
          }
        }
      );
    });    
  }

}

const sms = new Sms();

module.exports = sms;