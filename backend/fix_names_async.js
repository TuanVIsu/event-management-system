const mysql = require('mysql2/promise');

async function fixNames() {
    try {
        const db = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'quanlysukien3',
            charset: 'utf8mb4'
        });

        console.log('Connected to DB');

        await db.execute("UPDATE users SET full_name = 'Nguyễn Văn A (KHMT)' WHERE mssv = 'KHMT2311001'");
        await db.execute("UPDATE users SET full_name = 'Trần Thị B (KTPM)' WHERE mssv = 'KTPM2311002'");
        await db.execute("UPDATE users SET full_name = 'Lê Văn C (HTTT)' WHERE mssv = 'HTTT2311003'");
        await db.execute("UPDATE users SET full_name = 'Cán Bộ Lớp HTTT' WHERE mssv = 'HTTT2311004'");
        await db.execute("UPDATE events SET name = 'Sự kiện Mockup', description = 'Mock Event' WHERE id = 'EV_MOCK_1'");

        console.log('Update successful!');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

fixNames();
