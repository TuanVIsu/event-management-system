const mysql = require('mysql2');
const db = mysql.createConnection({host:'localhost',user:'root',password:'',database:'quanlysukien3'});
db.query("SHOW VARIABLES LIKE 'character_set_%'", (err, rows) => {
  if (err) {
    console.error(err);
  } else {
    console.table(rows);
  }
  db.end();
});
