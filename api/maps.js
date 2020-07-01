const express = require('express');
const Router = express.Router();

Router.post('/getMapsData', (req, res, next) => {
  console.log('get Maps Data');
  res.send({ status : 'bad', message : 'no api completed', });
});

module.exports = Router;