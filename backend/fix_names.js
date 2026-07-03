const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'quanlysukien3',
    charset: 'utf8mb4'
});

db.connect(err => {
    if (err) throw err;
    console.log('Connected!');
    
    db.query("UPDATE users SET full_name = 'Nguyễn Văn A (KHMT)' WHERE mssv = 'KHMT2311001'", () => {
        db.query("UPDATE users SET full_name = 'Trần Thị B (KTPM)' WHERE mssv = 'KTPM2311002'", () => {
            db.query("UPDATE users SET full_name = 'Lê Văn C (HTTT)' WHERE mssv = 'HTTT2311003'", () => {
                db.query("UPDATE users SET full_name = 'Cán Bộ Lớp HTTT' WHERE mssv = 'HTTT2311004'", () => {
                    console.log('Updated names!');
                    process.exit();
                });
            });
        });
    });
});
