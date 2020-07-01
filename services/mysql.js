const mysql = require('mysql');
const config = require('../config/config');

const db = mysql.createConnection(config.db);
db.connect(err => {
  if (err) throw err;
});

exports.exec = query => {
  // console.log('MySQL exec');
  return new Promise((resolve, reject) => {      
    db.query(query, (err, rows) => {
      // console.log(err);
      // console.log(rows);
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

exports.insert = query => {
  // console.log('MySQL insert');
  return new Promise((resolve, reject) => {
    exports.exec(query)
      .then(result => {
        resolve(result.insertId);
      })
      .catch(error => {
        reject(error);
      });
  });
}