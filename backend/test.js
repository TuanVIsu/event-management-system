const mysql = require('mysql2');

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'quanlysukien3',
    charset: 'utf8mb4'
});

const mssv = 'HTTT2311052';
const sql = `
        SELECT 
            e.id, e.name, e.date, e.end_date, e.category, e.poster_url,
            e.attached_file, e.description, e.status, e.require_gps, 
            e.require_proof, e.points, e.max_participants,
            (SELECT COUNT(*) FROM event_registrations WHERE event_id = e.id) as current_participants,
            IF(er.id IS NOT NULL, 1, 0) as is_registered,
            (SELECT IF(COUNT(*) > 0, 1, 0) 
             FROM attendance a 
             JOIN users u ON a.student_id = u.mssv
             WHERE a.event_id = e.id AND u.mssv = ?) as is_checked_in
        FROM events e
        LEFT JOIN event_registrations er 
            ON e.id = er.event_id AND er.mssv = ?
        WHERE e.status != 'Ngừng hoạt động' 
        ORDER BY e.date ASC
    `;

db.query(sql, [mssv, mssv], (err, results) => {
    if (err) {
        console.error("ERROR:", err.message);
    } else {
        console.log("SUCCESS:", results.length + " rows");
    }
    db.end();
});
