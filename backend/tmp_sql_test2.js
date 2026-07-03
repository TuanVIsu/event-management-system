const mysql = require('mysql2');
const db = mysql.createConnection({host:'localhost',user:'root',password:'',database:'quanlysukien3'});
const sql = "SELECT ? COLLATE utf8mb4_unicode_ci = '123' COLLATE utf8mb4_unicode_ci AS ok";
db.query(sql,['123'],(err,rows)=>{if(err){console.error(err);} else {console.log(rows);} db.end();});
