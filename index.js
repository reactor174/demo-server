const config = require('./config/config');

const express = require('express');
const cookieSession = require('cookie-session');
const bodyParser = require('body-parser');
// const cookieParser = require('cookie-parser');
const logger = require('morgan');
const path = require('path');
const svgCaptcha = require('svg-captcha');

require('colors');    // позволяет выделять цветом строки в консоли

console.log('Запуск сервера'.bgGreen);

const app = express();
app.use(logger(':method :url :status :response-time ms'));    // логгер запросов
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ limit : '10mb', extended : true, }));
// app.use(cookieParser());
app.use(cookieSession({
  name : 'session',
  keys : [ 'key1', 'key2' ],
  maxAge : ( 1000 * 60 * 60 * 24 * 3 ),    // время жизни сессии
}));
app.use(express.static(path.join(__dirname, 'front/build')));

// проверка и инициализация пользовательской сессии
app.use((req, res, next) => {
  if (typeof req.session.userId === "undefined") req.session.userId = false;
  // console.log(req.session.userId);
  next();
});

app.get('/captcha', function (req, res) {
  var captcha = svgCaptcha.create({
    size : 5,
    noise : 2,
    fontSize : 96,
    charPreset : 'abcdefghigkmnoprst123456789',
    width : 300,
    height : 100,
  });
  req.session.captcha = captcha.text;
  res.type('svg');
  res.status(200).send(captcha.data);
});

app.get('*', function (req, res) {
  console.log('Получен GET-запрос на адрес'.bgGreen + ' ' + req.url.bgYellow);
  res.sendFile(path.join(__dirname, "front/build/index.html"));
});

app.post('*', (req, res, next) => {
  console.log('Получен POST-запрос на адрес'.bgGreen + ' ' + req.url.bgCyan);
  next();
});
app.use('/api/auth', require('./api/auth'));
app.use('/api/maps', require('./api/maps'));
app.use('/api/stat', require('./api/stat'));

app.listen(config.port, () => {
  console.log(`Сервер успешно запущен на порту ${ config.port }`.bgGreen);
});