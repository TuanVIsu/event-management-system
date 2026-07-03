const mysql = require('mysql2');
const db = mysql.createConnection({host:'localhost',user:'root',password:'',database:'quanlysukien3'});
db.query('SELECT 1 AS one', [1,2], (err, rows) => {
  if (err) console.error(err);
  else console.log(rows);
  db.end();
});
