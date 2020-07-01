const express = require('express');
const Router = express.Router();

const request = require('request');

const weatherConfig = require('../config/weather');

// запрос данных о запусках спутников
Router.post('/space', async (req, res, next) => {
  try {
    
    const { year } = req.body;
    
    const months = [ 'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек', ];
    const launchesByMonths = [];
    months.forEach(m => launchesByMonths.push(0));
    
    const launches = await new Promise((resolve, reject) => {      
      request(
        'https://api.spacexdata.com/v3/launches?launch_year=' + year,
        (error, response, body) => {
          if (error) reject(error);
          body = JSON.parse(body);
          resolve(body);
        }
      );
    });
    
    if (launches.length) {
      launches.forEach(launch => {
        const month = new Date(launch.launch_date_utc).getMonth();
        launchesByMonths[ month ]++;
      });
    }
    
    res.send({ status : 'ok', data : { launches : launchesByMonths, months, }, });
  }
  catch (error) {
    console.log(error);
    res.send({ status : 'bad', message : 'Ошибка выполнения запроса', });
  }
});

// запрос данных о погоде
Router.post('/weather', async (req, res, next) => {
  try {
    
    const { date } = req.body;
    
    const coord = [ 55.76, 37.57 ];
    const time = Math.round(new Date(date).getTime() / 1000);
        
    const weather = await new Promise((resolve, reject) => {
      const url = weatherConfig.apiUrl + 'timemachine?lat=' + coord[0] + '&lon=' + coord[1] + '&dt=' + time + '&units=metric&appid=' + weatherConfig.apiKey;
      request(
        url,
        (error, response, body) => {
          if (error) reject(error);
          body = JSON.parse(body);
          if (body.cod) reject(body.message);
          resolve(body);
        }
      );
    });
    
    // час - температура ( для отсутствующих часов будет 0 )
    const hours = {};
    for (let i = 7; i <= 23; i++) hours[i] = 0;
    
    weather.hourly.forEach(h => {
      const hour = new Date(h.dt * 1000).getHours();
      if (typeof hours[hour] !== "undefined") hours[hour] = h.temp;
    });
    
    const hoursArr = [];
    const tempsArr = [];
    for (let h in hours) {
      hoursArr.push(h + ":00");
      tempsArr.push(hours[h]);
    }
    
    res.send({ status : 'ok', data : { hours : hoursArr, temps : tempsArr, }, });
  }
  catch (error) {
    console.log(error);
    res.send({ status : 'bad', message : 'Ошибка выполнения запроса', });
  }
});

module.exports = Router;