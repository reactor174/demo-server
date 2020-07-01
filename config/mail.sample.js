const config = {
  nodemailer : {    
    service: 'Yandex',
    requireTLS: true,
    auth: {
      user: 'user@yandex.ru',
      pass: 'password',
    },
    tls: {
      rejectUnauthorized: false
    },
  },
  from : 'user@yandex.ru',
};

module.exports = config;