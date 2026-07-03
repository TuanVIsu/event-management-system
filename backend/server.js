const express = require('express');

const sharp = require('sharp');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// =========================================================
// 1. KHỞI TẠO APP & MIDDLEWARE
// =========================================================
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cấu hình công khai thư mục tải ảnh minh chứng
const projectRoot = path.resolve(__dirname, '..');
const uploadDir = path.resolve(projectRoot, 'uploads');
const legacyUploadDir = path.resolve(__dirname, 'uploads');
app.use('/uploads', express.static(uploadDir));
app.use('/uploads', express.static(legacyUploadDir));

// =========================================================
// 2. CẤU HÌNH GOOGLE AUTH & JWT SECURITY
// =========================================================
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID; // Đổi tên biến này thành viết HOA
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET; // Nên đổi luôn biến này thành viết HOA cho đồng bộ

// Tự động khởi tạo thư mục lưu trữ ảnh nếu chưa tồn tại
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(legacyUploadDir)) {
    fs.mkdirSync(legacyUploadDir, { recursive: true });
}

// Cấu hình bộ nhớ lưu trữ file cho Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Lấy đuôi file gốc (vd: .jpg, .png)
        const extension = path.extname(file.originalname || '');
        // Tạo chuỗi số ngẫu nhiên để làm tên file mới tuyệt đối an toàn
        const randomName = Math.round(Math.random() * 1E9);
        cb(null, `${Date.now()}-${randomName}${extension}`);
    }
});
const upload = multer({ storage: storage });

// =========================================================
// 3. KẾT NỐI DATABASE POOL (TỐI ƯU HÓA HIỆU NĂNG)
// =========================================================
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'quanlysukien3',
    port: process.env.DB_PORT || 3306,
    charset: 'utf8mb4_unicode_ci',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

db.on('connection', (connection) => {
    connection.query('SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci');
});

db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Lỗi kết nối đến MySQL Workbench/XAMPP:', err.message);
    } else {
        console.log('✅ Đã kết nối cơ sở dữ liệu MySQL thành công!');
        connection.release();
    }
});

const ensureEventColumns = () => {
    const ensureColumn = (table, column, definition, callback) => {
        db.query(`SHOW COLUMNS FROM ${table} LIKE '${column}'`, (err, rows) => {
            if (err) {
                console.warn(`⚠️ Không thể kiểm tra cột ${column}:`, err.message);
                return;
            }
            if (!rows.length) {
                db.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, (alterErr) => {
                    if (alterErr) {
                        console.warn(`⚠️ Không thể tạo cột ${column}:`, alterErr.message);
                    } else {
                        console.log(`✅ Đã thêm cột ${column} vào bảng ${table}.`);
                        callback?.();
                    }
                });
            } else {
                callback?.();
            }
            db.query("ALTER TABLE events MODIFY COLUMN attached_file TEXT");
        });
    };

    ensureColumn('events', 'required_fields', 'TEXT NULL');
    ensureColumn('events', 'points', 'INT DEFAULT 0');
    ensureColumn('events', 'location_preset_id', 'INT NULL');
    ensureColumn('events', 'max_participants', 'INT DEFAULT 0');
    ensureColumn('events', 'require_proof', 'TINYINT(1) DEFAULT 1');
    
    // --- THÊM DÒNG DƯỚI ĐÂY ĐỂ VÁ LỖI CSDL ---
    ensureColumn('events', 'score_type', "VARCHAR(50) DEFAULT 'once'"); 
    
    db.query("SHOW COLUMNS FROM events LIKE 'category'", (err, rows) => {
        // ... giữ nguyên phần dưới
        if (err) {
            console.warn('⚠️ Không thể kiểm tra cột category:', err.message);
            return;
        }

        if (rows.length) {
            const type = String(rows[0].Type || '').toUpperCase();
            if (type.includes('ENUM')) {
                db.query("ALTER TABLE events MODIFY COLUMN category VARCHAR(100) NOT NULL DEFAULT ''", (alterErr) => {
                    if (alterErr) {
                        console.warn('⚠️ Không thể thay đổi kiểu dữ liệu cột category:', alterErr.message);
                    } else {
                        console.log('✅ Đã thay đổi cột category thành VARCHAR để hỗ trợ danh mục từ CSDL.');
                    }
                });
            }
        }
    });
};
ensureEventColumns();

const ensureUserColumns = () => {
    const ensureColumn = (column, definition) => {
        db.query(`SHOW COLUMNS FROM users LIKE '${column}'`, (err, rows) => {
            if (err) {
                console.warn(`⚠️ Không thể kiểm tra cột users.${column}:`, err.message);
                return;
            }
            if (!rows.length) {
                db.query(`ALTER TABLE users ADD COLUMN ${column} ${definition}`, (alterErr) => {
                    if (alterErr) {
                        console.warn(`⚠️ Không thể tạo cột users.${column}:`, alterErr.message);
                    } else {
                        console.log(`✅ Đã thêm cột ${column} vào bảng users.`);
                    }
                });
            }
        });
    };

    ensureColumn('phone', 'VARCHAR(20) NULL');
    ensureColumn('faculty', 'VARCHAR(255) NULL');
    ensureColumn('chi_doan', 'VARCHAR(255) NULL');
    ensureColumn('cohort', 'VARCHAR(50) NULL');
    ensureColumn('avatar', 'TEXT NULL');
    ensureColumn('password', 'VARCHAR(255) NULL');
};
// =========================================================
// TỰ ĐỘNG VÁ LỖI BẢNG PROOFS (MINH CHỨNG)
// =========================================================
const ensureProofColumns = () => {
    const ensureColumn = (column, definition) => {
        db.query(`SHOW COLUMNS FROM proofs LIKE '${column}'`, (err, rows) => {
            if (err) {
                console.warn(`⚠️ Không thể kiểm tra cột proofs.${column}:`, err.message);
                return;
            }
            if (!rows.length) {
                db.query(`ALTER TABLE proofs ADD COLUMN ${column} ${definition}`, (alterErr) => {
                    if (alterErr) {
                        console.warn(`⚠️ Không thể tạo cột proofs.${column}:`, alterErr.message);
                    } else {
                        console.log(`✅ Đã tự động thêm cột ${column} vào bảng proofs.`);
                    }
                });
            }
        });
    };

    ensureColumn('admin_comment', 'TEXT NULL');
    ensureColumn('ai_note', 'TEXT NULL');
};
ensureProofColumns(); // Kích hoạt chạy tự động
// ==========================================
// TỰ ĐỘNG VÁ LỖI BẢNG ATTENDANCE (LỊCH SỬ)
// ==========================================
const ensureAttendanceTable = () => {
    // 1. Tạo bảng nếu vô tình bị xóa mất
    db.query(`CREATE TABLE IF NOT EXISTS attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_id VARCHAR(50) NOT NULL,
        checkin_time DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`, (err) => {
        if (err) {
            console.warn('⚠️ Lỗi tạo bảng attendance:', err.message);
            return;
        }
        
        // 2. Tự động kiểm tra và thêm các cột bị thiếu (Đặc biệt là student_id)
        const checkAndAdd = (col, def) => {
            db.query(`SHOW COLUMNS FROM attendance LIKE '${col}'`, (e, rows) => {
                if (!e && rows.length === 0) {
                    db.query(`ALTER TABLE attendance ADD COLUMN ${col} ${def}`, (alterErr) => {
                        if (!alterErr) console.log(`✅ Đã tự động thêm cột ${col} vào bảng attendance.`);
                    });
                }
            });
        };
        
        checkAndAdd('student_id', 'INT');
        checkAndAdd('method', 'VARCHAR(50)');
        checkAndAdd('status', 'VARCHAR(50)');
    });
};
ensureAttendanceTable();
const ensureLocationPresetTable = () => {
    db.query(`CREATE TABLE IF NOT EXISTS location_presets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        latitude VARCHAR(50) NOT NULL,
        longitude VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`, (err) => {
        if (err) {
            console.warn('⚠️ Không thể tạo bảng location_presets:', err.message);
        }
    });
};
ensureLocationPresetTable();

const DEFAULT_PASSWORD = '123456';
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync(DEFAULT_PASSWORD, 10);

const ensureUserPassword = (user, callback) => {
    if (!user || user.password) {
        callback?.(user);
        return;
    }

    db.query('UPDATE users SET password = ? WHERE id = ?', [DEFAULT_PASSWORD_HASH, user.id], (err) => {
        if (err) {
            console.warn('⚠️ Không thể thiết lập mật khẩu mặc định cho người dùng:', err.message);
        }
        callback?.({ ...user, password: DEFAULT_PASSWORD_HASH });
    });
};

// THUẬT TOÁN HÀM HELPER: Tính khoảng cách Hamming so sánh mức độ trùng lặp ảnh
function getHammingDistance(hash1, hash2) {
    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
        if (hash1[i] !== hash2[i]) distance++;
    }
    return distance;
}

// =========================================================
// 4. DANH SÁCH TOÀN BỘ CÁC API CỦA HỆ THỐNG (ROUTES)
// =========================================================

// API 4.1: ĐĂNG NHẬP GOOGLE SSO (TỰ ĐỘNG BÓC TÁCH MSSV CTUET)
// =========================================================
app.post('/api/auth/google', async (req, res) => {
    const { credential, email: rawEmail, name: rawName, picture: rawPicture } = req.body;
    let email, name, picture;

    try {
        if (credential) {
            const ticket = await googleClient.verifyIdToken({
                idToken: credential,
                audience: GOOGLE_CLIENT_ID,
            });
            const payload = ticket.getPayload();
            email = payload.email;
            name = payload.name;
            picture = payload.picture;
        } else if (rawEmail) {
            email = rawEmail;
            name = rawName;
            picture = rawPicture;
        } else {
            return res.status(400).json({ error: "Không tìm thấy thông tin đăng nhập Google hợp lệ!" });
        }

        // Cải tiến: Trích xuất MSSV trước để kiểm tra cả email lẫn MSSV trong DB
        let preExtractedMssv = email.split('@')[0].toUpperCase();
        const preMatch = email.match(/([a-zA-Z]{4})(\d{7})@/);
        if (preMatch) {
            preExtractedMssv = preMatch[1].toUpperCase() + preMatch[2];
        }

        db.query("SELECT * FROM users WHERE email = ? OR mssv = ?", [email, preExtractedMssv], (err, results) => {
            if (err) return res.status(500).json({ error: "Lỗi truy vấn hệ thống database" });

            if (results.length > 0) {
                const user = results[0];
                if (user.is_locked === 1 || user.status === 'locked') {
                    return res.status(403).json({ error: "Tài khoản của bạn đã bị khóa!" });
                }
                const role = String(user.role || '').toLowerCase();
                const allowedRoles = ['admin', 'teacher', 'classcommittee', 'student'];
                if (!allowedRoles.includes(role)) {
                    return res.status(403).json({ error: "Tài khoản này không có quyền đăng nhập vào hệ thống này." });
                }
                const cohortMatch = (user.mssv || '').toUpperCase().match(/^[A-Z]{4}(\d{2})\d{5}$/);
                const cohort = cohortMatch ? `20${cohortMatch[1]}` : '';
                const persistedAvatar = String(user.avatar || '').trim();
                const resolvedAvatar = persistedAvatar || picture || '';

                if (!persistedAvatar && picture) {
                    db.query('UPDATE users SET avatar = ? WHERE id = ?', [picture, user.id], (updateErr) => {
                        if (updateErr) {
                            console.warn('⚠️ Không thể cập nhật avatar cho người dùng sau đăng nhập Google:', updateErr.message);
                        }
                    });
                }

                ensureUserPassword(user, (updatedUser) => {
                    const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_default';
                    res.json({ token, user: { ...updatedUser, avatar: resolvedAvatar, cohort } });
                });
            } else {
                // CHƯA CÓ TÀI KHOẢN -> TRÍCH XUẤT THÔNG MINH ĐỂ TẠO MỚI
                let extractedMssv = email.split('@')[0].toUpperCase();
                let extractedChiDoan = 'Chưa xếp lớp';
                let extractedFaculty = 'Chưa cập nhật';
                let extractedCohort = '';

                // Regex: Tìm 4 chữ cái + 7 chữ số nằm ngay sát chữ @ (VD: httt2311052)
                const match = email.match(/([a-zA-Z]{4})(\d{7})@/);

                if (match) {
                    const nganhCode = match[1].toUpperCase(); // Ra được 'HTTT'
                    const soMssv = match[2];                  // Ra được '2311052'

                    // 1. Lấy MSSV chuẩn (HTTT2311052)
                    extractedMssv = nganhCode + soMssv;

                    // 2. Lấy Chi đoàn (HTTT + 2311)
                    extractedChiDoan = nganhCode + soMssv.substring(0, 4);
                    // 2b. Lấy khóa dựa vào 2 chữ số đầu MSSV (23 -> 2023)
                    extractedCohort = `20${soMssv.substring(0, 2)}`;

                    // 3. Tự động map tên Khoa/Ngành
                    if (nganhCode === 'HTTT') extractedFaculty = 'Hệ thống Thông tin';
                    else if (nganhCode === 'KTPM') extractedFaculty = 'Kỹ thuật Phần mềm';
                    else if (nganhCode === 'KHMT') extractedFaculty = 'Khoa học Máy tính';
                    else if (nganhCode === 'NMMT' || nganhCode === 'MMTT') extractedFaculty = 'Mạng máy tính';
                }

                // Lưu dữ liệu sạch đã xử lý vào Database
                db.query(
                    "INSERT INTO users (mssv, full_name, email, role, faculty, chi_doan, avatar, password) VALUES (?, ?, ?, 'student', ?, ?, ?, ?)",
                    [extractedMssv, name, email, extractedFaculty, extractedChiDoan, picture, DEFAULT_PASSWORD_HASH],
                    (insertErr, insertRes) => {
                        if (insertErr) return res.status(500).json({ error: "Không thể tạo tài khoản sinh viên mới" });

                        const token = jwt.sign({ id: insertRes.insertId, role: 'student' }, JWT_SECRET, { expiresIn: '1d' });
                        res.json({
                            token,
                            user: {
                                id: insertRes.insertId,
                                mssv: extractedMssv,
                                full_name: name,
                                email: email,
                                role: 'student',
                                faculty: extractedFaculty,
                                chi_doan: extractedChiDoan,
                                cohort: extractedCohort,
                                avatar: picture
                            }
                        });
                    }
                );
            }
        });
    } catch (error) {
        console.error("🔥 Lỗi Google Auth:", error);
        res.status(401).json({ error: "Xác thực tài khoản Google không thành công!" });
    }
});
// =========================================================
// API 4.1B: ĐĂNG NHẬP TRUYỀN THỐNG (CÓ MÃ HÓA BCRYPT)
// =========================================================
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!" });
    }

    const inputValue = String(username).trim();
    const normalizedInput = inputValue.toUpperCase();
    const lookupUsername = inputValue.includes('@') ? inputValue.toLowerCase() : normalizedInput;
    const sql = "SELECT * FROM users WHERE LOWER(mssv) = LOWER(?) OR LOWER(email) = LOWER(?)";

    db.query(sql, [lookupUsername, inputValue], async (err, results) => {
        if (err) {
            console.error("🔥 Lỗi truy vấn đăng nhập:", err);
            return res.status(500).json({ error: "Lỗi hệ thống máy chủ cơ sở dữ liệu." });
        }

        if (results.length === 0) {
            return res.status(401).json({ message: "Tài khoản không tồn tại trên hệ thống!" });
        }

        const user = results[0];
        let isMatch = false;

        if (user.password) {
            try {
                isMatch = await bcrypt.compare(password, user.password);
            } catch {
                isMatch = false;
            }
        }

        if (!isMatch && password === DEFAULT_PASSWORD) {
            isMatch = true;
        }

        if (!isMatch && (!user.password || user.password === '')) {
            try {
                isMatch = await bcrypt.compare(password, DEFAULT_PASSWORD_HASH);
            } catch {
                isMatch = false;
            }
        }

        if (!isMatch) {
            return res.status(401).json({ message: "Mật khẩu không chính xác!" });
        }

        if (user.is_locked === 1 || user.status === 'locked') {
            return res.status(403).json({ message: "Tài khoản của bạn đã bị khóa bởi Admin!" });
        }

        const role = String(user.role || '').toLowerCase();
        const allowedRoles = ['admin', 'teacher', 'classcommittee', 'student'];
        if (!allowedRoles.includes(role)) {
            return res.status(403).json({ message: "Từ chối truy cập: Tài khoản không có quyền truy cập hệ thống này!" });
        }

        ensureUserPassword(user, (updatedUser) => {
            const token = jwt.sign(
                { id: updatedUser.id, mssv: updatedUser.mssv, role: updatedUser.role },
                JWT_SECRET,
                { expiresIn: '1d' }
            );

            console.log(`✅ [${updatedUser.role.toUpperCase()}] ${updatedUser.full_name} đã đăng nhập vào hệ thống.`);

            res.json({
                token: token,
                user: {
                    id: updatedUser.id,
                    mssv: updatedUser.mssv,
                    full_name: updatedUser.full_name,
                    email: updatedUser.email,
                    role: updatedUser.role,
                    avatar: updatedUser.avatar || null,
                    phone: updatedUser.phone || '',
                    faculty: updatedUser.faculty || '',
                    chi_doan: updatedUser.chi_doan || '',
                    cohort: updatedUser.cohort || ''
                }
            });
        });
    });
});
// API 4.2: LẤY DANH SÁCH SỰ KIỆN CHO MOBILE APP
app.get('/api/events', (req, res) => {
    db.query("SELECT * FROM events ORDER BY created_at DESC", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/location-presets', (req, res) => {
    db.query("SELECT * FROM location_presets ORDER BY created_at DESC", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/location-presets', (req, res) => {
    const { name, latitude, longitude } = req.body;
    if (!name || latitude === undefined || longitude === undefined) {
        return res.status(400).json({ message: 'Thiếu tên hoặc tọa độ để lưu vị trí.' });
    }

    db.query('INSERT INTO location_presets (name, latitude, longitude) VALUES (?, ?, ?)', [name, latitude, longitude], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Đã lưu vị trí thành công.', preset: { id: result.insertId, name, latitude, longitude } });
    });
});

app.delete('/api/location-presets/:id', (req, res) => {
    db.query('DELETE FROM location_presets WHERE id = ?', [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy vị trí để xóa.' });
        res.json({ message: 'Đã xóa vị trí thành công.' });
    });
});

// =========================================================
// API BỔ SUNG: LẤY DANH SÁCH NGÀNH ĐÀO TẠO TỪ CSDL ĐỘNG
// =========================================================
app.get('/api/faculties', (req, res) => {
    db.query("SELECT faculty_code AS `key`, faculty_name AS `label` FROM faculties ORDER BY faculty_code ASC", (err, results) => {
        if (err) {
            console.error("🔥 Lỗi lấy danh sách ngành:", err.message);
            return res.status(500).json({ error: "Lỗi cơ sở dữ liệu: " + err.message });
        }
        res.json(results);
    });
});
// =========================================================
// API 4.3: THÊM SỰ KIỆN MỚI TỪ WEB ADMIN 
// =========================================================
app.post('/api/events', upload.fields([{ name: 'poster', maxCount: 1 }, { name: 'attached_files', maxCount: 10 }]), (req, res) => {
    // Thêm score_type vào req.body
    const { id, name, date, end_date, description, category, status, require_gps, latitude, longitude, location_preset_id, required_fields, points, max_participants, require_proof, faculty_limits, score_type } = req.body; 
    const requireGpsEnabled = require_gps === true || require_gps === 1 || require_gps === '1' || require_gps === 'true';
    const MAX_TRAINING_POINTS = 100;

    const poster_url = req.files['poster'] ? '/uploads/' + req.files['poster'][0].filename : '';
    let attached_files_arr = [];
    if (req.files['attached_files']) {
        attached_files_arr = req.files['attached_files'].map(f => '/uploads/' + f.filename);
    }
    const attached_file_string = attached_files_arr.length > 0 ? JSON.stringify(attached_files_arr) : '';

    const safePoints = Math.min(Math.max(Number(points || 0), 0), MAX_TRAINING_POINTS);
    const eventData = {
        id: id,
        name: name,
        date: date,
        end_date: end_date,
        description: description || '',
        category: category,
        poster_url: poster_url,
        attached_file: attached_file_string,
        status: status,
        require_gps: requireGpsEnabled ? 1 : 0,
        latitude: requireGpsEnabled ? (latitude || null) : null,
        longitude: requireGpsEnabled ? (longitude || null) : null,
        location_preset_id: requireGpsEnabled ? (location_preset_id || null) : null,
        required_fields: typeof required_fields === 'string' ? required_fields : JSON.stringify(required_fields || []),
        points: safePoints,
        max_participants: max_participants ? Number(max_participants) : 0,
        require_proof: require_proof !== undefined ? Number(require_proof) : 1,
        faculty_limits: faculty_limits || null,
        score_type: score_type || 'once' // Bổ sung lưu cơ chế điểm
    };

    db.query("INSERT INTO events SET ?", eventData, (err, result) => {
        if (err) return res.status(500).json({ error: "Lỗi cơ sở dữ liệu: " + err.message });
        res.status(201).json({ message: "Đã thêm sự kiện lên hệ thống!" });
    });
});
// =========================================================
// API 4.4: CẬP NHẬT THÔNG TIN SỰ KIỆN 
// =========================================================
app.put('/api/events/:id', upload.fields([{ name: 'poster', maxCount: 1 }, { name: 'attached_files', maxCount: 10 }]), (req, res) => {
    const eventId = req.params.id;
    const { name, date, end_date, description, category, status, require_gps, latitude, longitude, location_preset_id, required_fields, points, max_participants, require_proof, faculty_limits, score_type } = req.body; 
    const requireGpsEnabled = require_gps === true || require_gps === 1 || require_gps === '1' || require_gps === 'true';

    let poster_url = req.files['poster'] ? '/uploads/' + req.files['poster'][0].filename : null;
    let attached_file_string = null;
    if (req.files['attached_files']) {
        const arr = req.files['attached_files'].map(f => '/uploads/' + f.filename);
        attached_file_string = JSON.stringify(arr);
    }

    // Bổ sung cập nhật score_type
    let sql = "UPDATE events SET name=?, date=?, end_date=?, description=?, category=?, status=?, require_gps=?, latitude=?, longitude=?, location_preset_id=?, required_fields=?, points=?, max_participants=?, require_proof=?, faculty_limits=?, score_type=?";
    const MAX_TRAINING_POINTS = 100;
    const safePoints = Math.min(Math.max(Number(points || 0), 0), MAX_TRAINING_POINTS);
    
    let params = [
        name, date, end_date, description, category || 'Khác', status,
        requireGpsEnabled ? 1 : 0, requireGpsEnabled ? (latitude || null) : null,
        requireGpsEnabled ? (longitude || null) : null, requireGpsEnabled ? (location_preset_id || null) : null,
        typeof required_fields === 'string' ? required_fields : JSON.stringify(required_fields || []),
        safePoints, max_participants ? Number(max_participants) : 0,
        require_proof !== undefined ? Number(require_proof) : 1,
        faculty_limits || null,
        score_type || 'once'
    ];

    if (poster_url) { sql += ", poster_url=?"; params.push(poster_url); }
    if (attached_file_string) { sql += ", attached_file=?"; params.push(attached_file_string); }

    sql += " WHERE id=?";
    params.push(eventId);

    db.query(sql, params, (err, result) => {
        if (err) return res.status(500).json({ error: "Lỗi cơ sở dữ liệu: " + err.message });
        res.json({ message: "Đã cập nhật sự kiện thành công!" });
    });
});
// API 4.5: THAY ĐỔI TRẠNG THÁI SỰ KIỆN NHANH (ĐANG DIỄN RA / HOÀN THÀNH)
app.patch('/api/events/:id/status', (req, res) => {
    db.query("UPDATE events SET status = ? WHERE id = ?", [req.body.status, req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Trạng thái sự kiện đã được cập nhật!" });
    });
});

app.put('/api/profile', upload.single('avatar'), (req, res) => {
    const payload = req.body || {};
    const { id, full_name, email, phone, faculty, chi_doan, mssv, cohort, avatar } = payload;

    if (!id) {
        return res.status(400).json({ message: 'Thiếu thông tin người dùng để cập nhật' });
    }

    db.query('SELECT * FROM users WHERE id = ?', [id], (selectErr, rows) => {
        if (selectErr) {
            return res.status(500).json({ message: 'Không thể lấy lại thông tin người dùng' });
        }

        const currentUser = rows[0];
        if (!currentUser) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }

        const safeFullName = currentUser.full_name || full_name || '';
        const safeEmail = currentUser.email || email || '';
        const safeMssv = currentUser.mssv || mssv || '';
        const avatarPath = req.file ? `/uploads/${req.file.filename}` : (avatar || currentUser.avatar || '');

        const sql = `UPDATE users SET full_name=?, email=?, phone=?, faculty=?, chi_doan=?, mssv=?, avatar=? WHERE id=?`;
        const params = [
            safeFullName,
            safeEmail,
            phone || currentUser.phone || '',
            faculty || currentUser.faculty || '',
            chi_doan || currentUser.chi_doan || '',
            safeMssv,
            avatarPath,
            id
        ];

        db.query(sql, params, (err) => {
            if (err) {
                console.error('🔥 Lỗi cập nhật hồ sơ:', err);
                return res.status(500).json({ message: 'Không thể cập nhật hồ sơ' });
            }

            db.query('SELECT * FROM users WHERE id = ?', [id], (refreshErr, refreshedRows) => {
                if (refreshErr) {
                    return res.status(500).json({ message: 'Không thể lấy lại thông tin mới' });
                }
                res.json({ user: refreshedRows[0] || null });
            });
        });
    });
});

// API 4.5b: LẤY DANH SÁCH SINH VIÊN THAM GIA SỰ KIỆN TỪ CƠ SỞ DỮ LIỆU
app.get('/api/events/:id/participants', (req, res) => {
    const eventId = req.params.id;
    const sql = `
        SELECT u.mssv AS student_id,
               u.full_name AS name,
               COALESCE(u.phone, '') AS phone,
               COALESCE(u.chi_doan, '') AS chi_doan,
               a.checkin_time AS checkin_time,
               COALESCE(a.method, 'Quét mã QR') AS method
        FROM attendance a  -- ĐÃ SỬA: Đổi từ event_attendances sang attendance
        JOIN users u ON a.student_id = u.id  
        WHERE a.event_id = ?
        ORDER BY a.checkin_time DESC
    `;

    db.query(sql, [eventId], (err, results) => {
        // ... (phần dưới giữ nguyên)
        if (err) {
            console.error("🔥 Lỗi lấy danh sách điểm danh:", err);
            return res.status(500).json({ error: "Lỗi cơ sở dữ liệu: " + err.message });
        }
        res.json(results.map(row => ({
            id: row.student_id,
            name: row.name,
            phone: row.phone || '',
            chi_doan: row.chi_doan || '',
            checkin_time: row.checkin_time ? new Date(row.checkin_time).toLocaleString('vi-VN') : '',
            method: row.method,
        })));
    });
});
// =========================================================
// API 4.5c: SINH VIÊN THỰC HIỆN CHECK-IN (Lưu Phương thức và ghi nhận điểm danh)
// =========================================================
app.post('/api/events/checkin', (req, res) => {
    // Nhận dữ liệu từ thiết bị của sinh viên gửi lên (App Mobile hoặc Trang quét QR)
    const { student_id, event_id, method } = req.body;
    // Trong đó method có thể là: 'Quét mã QR', 'Định vị GPS', 'Thủ công'

    if (!student_id || !event_id) {
        return res.status(400).json({ error: "Thiếu thông tin mã số sinh viên hoặc mã sự kiện!" });
    }

    // 1. Kiểm tra xem sinh viên này đã điểm danh sự kiện này chưa (tránh bị trùng dữ liệu)
    const checkSql = "SELECT * FROM event_attendances WHERE student_id = ? AND event_id = ?";
    db.query(checkSql, [student_id, event_id], (checkErr, checkResults) => {
        if (checkErr) {
            console.error("🔥 Lỗi kiểm tra trùng lặp điểm danh:", checkErr);
            return res.status(500).json({ error: "Lỗi hệ thống kiểm tra dữ liệu." });
        }

        if (checkResults.length > 0) {
            return res.status(400).json({ message: "Sinh viên này đã được ghi nhận điểm danh trước đó!" });
        }

        // 2. Tiến hành thêm mới lượt điểm danh vào CSDL với đúng phương thức được truyền
        const insertSql = `INSERT INTO event_attendances (event_id, student_id, checkin_time, method) 
                           VALUES (?, ?, NOW(), ?)`;

        db.query(insertSql, [event_id, student_id, method || 'Quét mã QR'], (err, result) => {
            if (err) {
                console.error("🔥 Lỗi thực thi SQL điểm danh:", err.message);
                return res.status(500).json({ error: "Không thể ghi nhận dữ liệu điểm danh: " + err.message });
            }
            res.status(201).json({ message: "Ghi nhận điểm danh thành công!" });
        });
    });
});
// API 4.6: THỐNG KÊ SỐ LIỆU ĐỒ THỊ TRÊN WEB DASHBOARD ADMIN
app.get('/api/dashboard/stats', (req, res) => {
    const stats = { activeEvents: 0, totalAttendees: 0, pendingProofs: 0, highPriorityProofs: 0 };
    
    // 1. Đếm các sự kiện đang diễn ra
    db.query("SELECT COUNT(*) AS count FROM events WHERE status = 'Đang diễn ra'", (err, res1) => {
        if (!err && res1.length) stats.activeEvents = res1[0].count;
        
        // 2. CẬP NHẬT: Đếm chính xác tổng số lượt điểm danh thực tế từ bảng attendance
        db.query("SELECT COUNT(*) AS count FROM attendance", (err, res2) => {
            if (!err && res2.length) stats.totalAttendees = res2[0].count;
            
            // 3. Đếm số lượng minh chứng chờ duyệt
            db.query("SELECT COUNT(*) AS count FROM proofs WHERE status = 'pending'", (err, res3) => {
                if (!err && res3.length) stats.pendingProofs = res3[0].count;
                
                // 4. Đếm số minh chứng có cảnh báo trùng lặp từ AI
                db.query("SELECT COUNT(*) AS count FROM proofs WHERE status = 'pending' AND phash_warning = 1", (err, res4) => {
                    if (!err && res4.length) stats.highPriorityProofs = res4[0].count;
                    res.json(stats);
                });
            });
        });
    });
});
// API 4.7: LẤY DANH SÁCH 5 MINH CHỨNG MỚI NỘP GẦN NHẤT
app.get('/api/dashboard/pending-proofs', (req, res) => {
    const sql = `
        SELECT p.id, u.full_name, e.name AS event_name, p.created_at, p.phash_warning 
        FROM proofs p
        JOIN users u ON p.student_id = u.id
        JOIN events e ON p.event_id = e.id
        WHERE p.status = 'pending'
        ORDER BY p.created_at ASC LIMIT 5
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});


// API 4.7.1: LẤY CÁC SỰ KIỆN MỚI CẬP NHẬT/TẠO MỚI (LỌC BỎ SỰ KIỆN ĐÃ KẾT THÚC)
app.get('/api/dashboard/activities', (req, res) => {
    // Câu lệnh SQL lấy ra các sự kiện chưa kết thúc, sắp xếp theo ID giảm dần (mới nhất lên đầu)
    const sql = `
      SELECT id, name, category, status, COALESCE(date, NOW()) AS event_date
      FROM events
      WHERE status COLLATE utf8mb4_unicode_ci != 'Đã kết thúc'
      ORDER BY id DESC
      LIMIT 5
    `;

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        const activities = results.map(row => ({
            id: row.id,
            message: `Sự kiện: "${row.name}"`,
            subMessage: `Danh mục: ${row.category || 'Chưa phân loại'}`,
            time: row.event_date ? new Date(row.event_date).toLocaleString('vi-VN') : 'Vừa cập nhật',
            status: row.status
        }));

        res.json(activities);
    });
});


// HÀM HELPER: Tính khoảng cách Hamming (So sánh 2 mã băm để tìm độ lệch)
function getHammingDistance(hash1, hash2) {
    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
        if (hash1[i] !== hash2[i]) distance++;
    }
    return distance;
}

const axios = require('axios');
const FormData = require('form-data');

// =========================================================================
// API 4.8: CẬP NHẬT HOÀN CHỈNH LOGIC NỘP MINH CHỨNG (BẢN CHUẨN ĐÃ FIX SẠCH LỖI)
// =========================================================================
app.post('/api/proofs/upload_ai', upload.single('proof_image'), async (req, res) => {
    try {
        const { student_id, mssv, student_name, event_id, event_name } = req.body;
        
if (!req.file) {
    // Trả về HTTP 200 mặc định kèm status: 'error' để Dio không bị ném Exception
    return res.json({ status: "error", message: "Vui lòng tải ảnh minh chứng lên!" });
}

        const imagePath = req.file.path;
        const imageUrl = '/uploads/' + req.file.filename;

        // 1. GỬI FILE SANG PYTHON MICROSERVICE ĐỂ PHÂN TÍCH OCR & HASH
        const formData = new FormData();
        formData.append('proof_image', fs.createReadStream(imagePath), {
            filename: req.file.filename,
            contentType: req.file.mimetype
        });
        formData.append('mssv', mssv || '');
        formData.append('student_name', student_name || '');
        formData.append('event_name', event_name || '');

        const pythonResponse = await axios.post('http://localhost:8000/api/analyze-proof', formData, {
            headers: formData.getHeaders()
        });

        const { image_hash, ocr_match_percent } = pythonResponse.data;

        // 2. KIỂM TRA CHỐNG GIAN LẬN ẢNH TRÙNG LẶP
        let phash_warning = 0;
        const checkDuplicateSql = "SELECT id FROM proofs WHERE image_hash = ?";
        
        db.query(checkDuplicateSql, [image_hash], (err, rows) => {
            if (!err && rows.length > 0) {
                phash_warning = 1; 
            }

            const ai_status = (phash_warning === 0 && ocr_match_percent >= 66) ? 'approved' : 'pending';

            // ĐƯA HÀM NÀY LÊN ĐẦU BLOCK: Đảm bảo mọi nhánh rẽ UPDATE hay INSERT đều gọi được
            const finishUploadResponse = (finalStatus) => {
                db.query(
                    "UPDATE event_registrations SET is_checked_in = 1, checkin_at = NOW() WHERE mssv COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci AND event_id COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci", 
                    [mssv, event_id], 
                    (regUpdateErr) => {
                        if (regUpdateErr) {
                            console.warn("⚠️ Không thể cập nhật trạng thái bảng event_registrations:", regUpdateErr.message);
                        }
                        
                        return res.json({
                            status: "success",
                            message: finalStatus === 'approved' ? "Hệ thống AI đã phân tích và duyệt tự động!" : "Đã tiếp nhận, chờ Cán bộ xem xét.",
                            ocr_match_percent: ocr_match_percent,
                            phash_warning: phash_warning,
                            auto_status: finalStatus,
                            image_path: imageUrl
                        });
                    }
                );
            };

            // Kiểm tra cơ chế tính điểm của sự kiện từ CSDL (once hay multiple)
            db.query("SELECT score_type FROM events WHERE id = ?", [event_id], (eventErr, eventRows) => {
                if (eventErr || eventRows.length === 0) {
                    return res.status(500).json({ error: "Không tìm thấy cấu hình sự kiện." });
                }

                const scoreType = eventRows[0].score_type || 'once';
                const isMultipleTurn = scoreType === 'multiple';
                const checkExistingProof = "SELECT id FROM proofs WHERE student_id = ? AND event_id = ?";

                db.query(checkExistingProof, [student_id, event_id], (checkProofErr, proofRows) => {
                    if (checkProofErr) return res.status(500).json({ error: "Lỗi hệ thống: " + checkProofErr.message });

                    if (proofRows.length > 0 && !isMultipleTurn) {
                        // TRƯỜNG HỢP 1: Sự kiện tính theo LẦN và ĐÃ CÓ vết -> Thực hiện UPDATE
                        const updateProofSql = `UPDATE proofs SET image_url = ?, image_hash = ?, ocr_match_percent = ?, phash_warning = ?, status = ?, created_at = NOW() WHERE student_id = ? AND event_id = ?`;
                        db.query(updateProofSql, [imageUrl, image_hash, ocr_match_percent, phash_warning, ai_status, student_id, event_id], (updateErr) => {
                            if (updateErr) return res.status(500).json({ error: "Lỗi cập nhật: " + updateErr.message });
                            
                            db.query(`UPDATE attendance SET checkin_time = NOW() WHERE event_id = ? AND student_id = ?`, [event_id, student_id], () => {
                                finishUploadResponse(ai_status);
                            });
                        });
                    } else {
                        // TRƯỜNG HỢP 2: Chưa có bản ghi HOẶC sự kiện tính theo LƯỢT -> Thực hiện INSERT mới
                        const proofId = 'PR_' + Math.floor(Date.now() / 1000) + '_' + Math.floor(Math.random() * 1000); 
                        const sqlProof = `INSERT INTO proofs (id, student_id, event_id, image_url, image_hash, ocr_match_percent, phash_warning, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

                        db.query(sqlProof, [proofId, student_id, event_id, imageUrl, image_hash, ocr_match_percent, phash_warning, ai_status], (dbErr) => {
                            if (dbErr) return res.status(500).json({ error: "Lỗi lưu dữ liệu: " + dbErr.message });

                            const sqlAtt = `INSERT INTO attendance (event_id, student_id, method, status, checkin_time) VALUES (?, ?, 'Upload_Minh_Chung', 'checked_in', NOW())`;
                            db.query(sqlAtt, [event_id, student_id], (attErr) => {
                                if (attErr) console.warn("⚠️ Cảnh báo lỗi đồng bộ bảng attendance:", attErr.message);
                                finishUploadResponse(ai_status);
                            });
                        });
                    }
                });
            });
        });

    } catch (error) {
        console.error("🔥 Lỗi gọi qua Python Microservice:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Lỗi kết nối đến máy chủ AI." });
    }   
});
// API 4.9: LẤY DANH SÁCH SINH VIÊN
app.get('/api/users', (req, res) => {
    // Ưu tiên hiển thị sinh viên, cán bộ lớp và giáo viên mới nhất
    db.query("SELECT * FROM users WHERE role IN ('student', 'classCommittee', 'teacher') ORDER BY created_at DESC", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/users/:id', (req, res) => {
    const userId = req.params.id;
    db.query("SELECT * FROM users WHERE id = ?", [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!results.length) return res.status(404).json({ error: "Không tìm thấy sinh viên." });
        res.json(results[0]);
    });
});

app.get('/api/users/:id/activities', (req, res) => {
    const userId = req.params.id;
    db.query("SELECT mssv FROM users WHERE id = ?", [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!results.length) return res.status(404).json({ error: "Không tìm thấy sinh viên." });

        const mssv = results[0].mssv || '';
        
        // DÙNG CAST() ĐỂ ÉP KIỂU LIÊN KẾT ĐỒNG BỘ GIỮA INT VÀ VARCHAR
        const sql = `
            SELECT e.id AS event_id,
                   e.name AS event_name,
                   e.category AS event_category,
                   e.description AS event_description,
                   e.date AS event_date,
                   e.end_date AS event_end_date,
                   a.checkin_time,
                   COALESCE(a.method, 'Quét mã QR') AS method
            FROM event_attendances a
            JOIN events e ON a.event_id COLLATE utf8mb4_unicode_ci = e.id COLLATE utf8mb4_unicode_ci
            WHERE a.student_id = ? 
               OR CAST(a.student_id AS CHAR) COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci
               OR a.student_id = ?
            ORDER BY a.checkin_time DESC
        `;

        db.query(sql, [userId, mssv, mssv], (activityErr, activityResults) => {
            if (activityErr) return res.status(500).json({ error: activityErr.message });
            res.json(activityResults.map(row => ({
                event_id: row.event_id,
                event_name: row.event_name,
                category: row.event_category || 'Chưa phân loại',
                event_description: row.event_description || '',
                event_date: row.event_date || null,
                event_end_date: row.event_end_date || null,
                checkin_time: row.checkin_time ? new Date(row.checkin_time).toLocaleString('vi-VN') : '',
                method: row.method
            })));
        });
    });
});

app.patch('/api/users/:id', (req, res) => {
    const userId = req.params.id;
    const { action, targetRole, currentUserRole, currentUserId } = req.body;
    const callerRole = currentUserRole || 'student';
    const callerId = currentUserId ? Number(currentUserId) : null;

    db.query("SELECT * FROM users WHERE id = ?", [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!results.length) return res.status(404).json({ error: "Không tìm thấy sinh viên." });

        const user = results[0];
        const isSelf = callerId && callerId === Number(userId);

        if (action === 'grant_permission') {
            if (!targetRole) {
                return res.status(400).json({ error: 'Thiếu targetRole cho hành động cấp quyền.' });
            }

            const canModifyRole = () => {
                if (isSelf) return false;
                if (callerRole === 'superadmin') return true;
                if (callerRole === 'admin') {
                    return ['student', 'classCommittee', 'teacher'].includes(targetRole);
                }
                if (callerRole === 'classCommittee') {
                    // classCommittee không được cấp thêm quyền cho người khác, chỉ có thể thu hồi quyền classCommittee
                    return targetRole === 'student' && user.role === 'classCommittee';
                }
                if (callerRole === 'teacher') {
                    return targetRole === 'student' && user.role === 'classCommittee';
                }
                return false;
            };

            if (!canModifyRole()) {
                return res.status(403).json({ error: 'Bạn không có quyền thực hiện thay đổi này.' });
            }

            db.query("UPDATE users SET role = ? WHERE id = ?", [targetRole, userId], (updateErr) => {
                if (updateErr) return res.status(500).json({ error: updateErr.message });
                res.json({ success: true, role: targetRole });
            });
            return;
        }

        if (action === 'lock' || action === 'unlock') {
            const lockValue = action === 'lock' ? 1 : 0;
            const statusValue = action === 'lock' ? 'locked' : 'active';

            db.query("SHOW COLUMNS FROM users LIKE 'is_locked'", (colErr, colResults) => {
                if (colErr) return res.status(500).json({ error: colErr.message });

                if (colResults.length) {
                    db.query("UPDATE users SET is_locked = ? WHERE id = ?", [lockValue, userId], (updateErr) => {
                        if (updateErr) return res.status(500).json({ error: updateErr.message });
                        res.json({ success: true, is_locked: lockValue });
                    });
                    return;
                }

                db.query("SHOW COLUMNS FROM users LIKE 'status'", (statusErr, statusResults) => {
                    if (statusErr) return res.status(500).json({ error: statusErr.message });
                    if (statusResults.length) {
                        db.query("UPDATE users SET status = ? WHERE id = ?", [statusValue, userId], (updateErr) => {
                            if (updateErr) return res.status(500).json({ error: updateErr.message });
                            res.json({ success: true, status: statusValue });
                        });
                        return;
                    }

                    res.status(400).json({ error: 'Bảng users chưa hỗ trợ chức năng khóa/mở khóa.' });
                });
            });
            return;
        }

        res.status(400).json({ error: 'Hành động không hợp lệ.' });
    });
});
// API 4.10: LẤY THỐNG KÊ TỔNG QUAN NGƯỜI DÙNG & QUYỀN TRUY CẬP
app.get('/api/users/stats', (req, res) => {
    // Khởi tạo các chỉ số mặc định
    const stats = {
        quanTriVien: 0,      // Từ DB (superadmin)
        canBoDuyet: 0,       // Từ DB (admin)
        choCapQuyen: 18,     // Fake data (Cần thêm cột trạng thái status='pending' vào CSDL nếu muốn số thực)
        phienHoatDong: 142,  // Fake data (Hoặc lấy count từ bảng event/attendance)
        yeuCauHoTro: 4       // Fake data (Cần bảng 'supports' nếu muốn số thực)
    };

    // Đếm số lượng tài khoản theo từng nhóm quyền (role)
    const sql = `SELECT role, COUNT(*) as count FROM users GROUP BY role`;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("🔥 Lỗi truy vấn thống kê:", err);
            return res.status(500).json({ error: "Lỗi hệ thống máy chủ" });
        }

        // Gán dữ liệu thực tế từ CSDL vào object stats
        results.forEach(row => {
            if (row.role === 'superadmin') stats.quanTriVien = row.count;
            if (row.role === 'classCommittee') stats.canBoDuyet = row.count;
        });

        res.json(stats);
    });
});
// =========================================================
// API 4.11: LẤY DANH SÁCH TẤT CẢ MINH CHỨNG (CHO TRANG PHÊ DUYỆT)
// =========================================================
app.get('/api/proofs', (req, res) => {
    // Nối bảng proofs với users và events để lấy tên sinh viên và tên sự kiện
    let sql = `
        SELECT p.id, p.image_url, p.image_hash, p.ocr_match_percent, p.phash_warning, p.status, p.created_at,
               u.full_name AS student_name, u.mssv, u.chi_doan,
               e.name AS event_name
        FROM proofs p
        JOIN users u ON p.student_id = u.id
        JOIN events e ON p.event_id = e.id
    `;

    const params = [];
    const { status: statusFilter, userId } = req.query;

    const executeProofsQuery = (caller) => {
        let conditionPrefix = " WHERE";
        if (statusFilter && statusFilter !== 'all') {
            sql += `${conditionPrefix} p.status = ?`;
            params.push(statusFilter);
            conditionPrefix = " AND";
        }

        // Lọc theo chi đoàn nếu là classCommittee
        if (caller && (caller.role === 'classCommittee' || caller.role === 'classcommittee')) {
            const mssvPrefix = caller.mssv ? caller.mssv.substring(0, 8).toUpperCase() : '';
            if (mssvPrefix) {
                sql += `${conditionPrefix} u.mssv LIKE ?`;
                params.push(`${mssvPrefix}%`);
            }
        }

        sql += ` ORDER BY p.created_at DESC`;

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("🔥 Lỗi lấy danh sách minh chứng:", err);
                return res.status(500).json({ error: "Lỗi cơ sở dữ liệu." });
            }
            res.json(results);
        });
    };

    if (userId) {
        db.query("SELECT role, mssv FROM users WHERE id = ?", [userId], (err, userRes) => {
            if (!err && userRes.length > 0) {
                executeProofsQuery(userRes[0]);
            } else {
                executeProofsQuery(null);
            }
        });
    } else {
        executeProofsQuery(null);
    }
});

// API 4.12: THAY ĐỔI TRẠNG THÁI MINH CHỨNG KÈM LÝ DO / GHI CHÚ NỘI BỘ
app.patch('/api/proofs/:id/status', (req, res) => {
    const { status, admin_comment } = req.body; // Tiếp nhận thêm lời phê duyệt/từ chối từ Admin

    if (!['approved', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ error: "Trạng thái không hợp lệ." });
    }

    const sql = "UPDATE proofs SET status = ?, admin_comment = ? WHERE id = ?";
    db.query(sql, [status, admin_comment || '', req.params.id], (err, result) => {
        if (err) {
            console.error("🔥 Lỗi cập nhật minh chứng:", err);
            return res.status(500).json({ error: "Lỗi cơ sở dữ liệu." });
        }
        res.json({ message: `Đã chuyển minh chứng sang trạng thái: ${status}` });
    });
});

// =========================================================
// API 4.13: CẬP NHẬT LẠI API THỐNG KÊ DASHBOARD (SỐ LIỆU THỰC TẾ)
// =========================================================
app.get('/api/dashboard/overview', async (req, res) => {
    try {
        // Chạy nhiều câu truy vấn cùng lúc (Dùng Promise wrapper cho mysql2 pool)
        const promiseQuery = (sql) => new Promise((resolve, reject) => {
            db.query(sql, (err, results) => {
                if (err) reject(err);
                else resolve(results[0].count);
            });
        });

        const activeEvents = await promiseQuery("SELECT COUNT(*) AS count FROM events WHERE status = 'Đang diễn ra'");
        const totalStudents = await promiseQuery("SELECT COUNT(*) AS count FROM users WHERE role = 'student'");
        const pendingProofs = await promiseQuery("SELECT COUNT(*) AS count FROM proofs WHERE status = 'pending'");
        const warningProofs = await promiseQuery("SELECT COUNT(*) AS count FROM proofs WHERE status = 'pending' AND phash_warning = 1");

        res.json({
            activeEvents,
            totalStudents,
            pendingProofs,
            warningProofs
        });
    } catch (error) {
        console.error("🔥 Lỗi load Dashboard:", error);
        res.status(500).json({ error: "Lỗi máy chủ khi lấy dữ liệu tổng quan" });
    }
});
// =========================================================
// BIẾN LƯU TRỮ TẠM THỜI MÃ XÁC NHẬN (MEMORY STORE)
// =========================================================
const resetCodes = {};

// =========================================================
// API 4.15: YÊU CẦU QUÊN MẬT KHẨU (TẠO MÃ XÁC NHẬN)
// =========================================================
app.post('/api/auth/forgot-password', (req, res) => {
    const rawUsername = String(req.body.username || '').trim();
    const lookupUsername = rawUsername.includes('@') ? rawUsername.split('@')[0].toUpperCase() : rawUsername.toUpperCase();

    db.query("SELECT * FROM users WHERE mssv = ? OR email = ?", [lookupUsername, rawUsername], (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi cơ sở dữ liệu!" });
        if (results.length === 0) return res.status(404).json({ message: "Tài khoản không tồn tại trên hệ thống!" });

        const user = results[0];
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        resetCodes[lookupUsername] = code;
        if (rawUsername.includes('@')) {
            resetCodes[rawUsername] = code;
        }

        console.log(`\n=========================================`);
        console.log(`🔑 YÊU CẦU ĐỔI MẬT KHẨU TỪ HỆ THỐNG`);
        console.log(`- Tài khoản: ${user.mssv || lookupUsername}`);
        console.log(`- MÃ XÁC NHẬN CỦA BẠN LÀ: [ ${code} ]`);
        console.log(`=========================================\n`);

        res.json({ message: "Mã xác nhận đã được tạo thành công!" });
    });
});

// =========================================================
// API 4.16: ĐẶT LẠI MẬT KHẨU MỚI (CÓ BĂM BCRYPT)
// =========================================================
app.post('/api/auth/reset-password', async (req, res) => { // Thêm chữ async ở đây
    const rawUsername = String(req.body.username || '').trim();
    const username = rawUsername.includes('@') ? rawUsername.split('@')[0].toUpperCase() : rawUsername.toUpperCase();
    const code = req.body.code.trim();
    const newPassword = req.body.newPassword;

    if ((!resetCodes[username] && !resetCodes[rawUsername]) || (resetCodes[username] && resetCodes[username] !== code) || (resetCodes[rawUsername] && resetCodes[rawUsername] !== code)) {
        return res.status(400).json({ message: "Mã xác nhận không hợp lệ hoặc đã hết hạn!" });
    }

    try {
        // MÃ HÓA MẬT KHẨU TRƯỚC KHI LƯU VÀO DATABASE
        const salt = await bcrypt.genSalt(10); // Độ mặn = 10 (Chuẩn bảo mật an toàn)
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const normalizedUsername = String(username).trim();
        const lookupUsername = normalizedUsername.includes('@') ? normalizedUsername.split('@')[0].toUpperCase() : normalizedUsername.toUpperCase();

        db.query("SELECT id FROM users WHERE mssv = ? OR email = ?", [lookupUsername, normalizedUsername], (selectErr, rows) => {
            if (selectErr) return res.status(500).json({ message: "Lỗi hệ thống khi cập nhật mật khẩu!" });
            if (!rows.length) return res.status(404).json({ message: "Tài khoản không tồn tại!" });

            db.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, rows[0].id], (err) => {
                if (err) return res.status(500).json({ message: "Lỗi hệ thống khi cập nhật mật khẩu!" });

                delete resetCodes[username];
                delete resetCodes[rawUsername];
                console.log(`✅ Tài khoản [${username}] đã đổi và MÃ HÓA mật khẩu thành công.`);
                res.json({ message: "Đổi mật khẩu thành công!" });
            });
        });
    } catch (hashError) {
        console.error("Lỗi băm mật khẩu:", hashError);
        res.status(500).json({ message: "Lỗi xử lý thuật toán mã hóa!" });
    }
});
// =========================================================
// API LẤY CẤU TRÚC PHÂN CẤP DANH MỤC TIÊU CHÍ (CHO SETTINGS)
// =========================================================
app.get('/api/criteria', (req, res) => {
    // 1. Lấy tất cả danh mục lớn (I, II, III, IV, V)
    const queryCat = "SELECT * FROM criteria_categories ORDER BY id ASC";
    // 2. Lấy tất cả danh mục con chi tiết
    const querySub = "SELECT * FROM criteria_sub_categories ORDER BY id ASC";

    db.query(queryCat, (err, categories) => {
        if (err) return res.status(500).json({ status: "error", message: err.message });
        
        db.query(querySub, (err, subCategories) => {
            if (err) return res.status(500).json({ status: "error", message: err.message });
            
            // Lập trình đồng bộ gộp mảng Con vào mảng Cha đúng cấu trúc phân cấp
            const result = categories.map(cat => ({
                id: cat.id,
                name: cat.name,
                maxPoints: cat.max_points,
                subCategories: subCategories
                    .filter(sub => sub.parent_id === cat.id)
                    .map(sub => ({
                        id: sub.id,
                        name: sub.name,
                        points: sub.points,
                        unit: sub.unit
                    }))
            }));
            
            res.json({ status: "success", data: result });
        });
    });
});
// =========================================================
// API THÊM, SỬA, XÓA DANH MỤC & TIÊU CHÍ (SETTINGS)
// =========================================================

// 1. Thêm mới hoặc Cập nhật Danh mục chính (Mục lớn I, II, III...)
app.post('/api/criteria/main', (req, res) => {
    const { id, name, maxPoints, isEdit } = req.body;
    if (!id || !name) return res.json({ status: "error", message: "Thiếu thông tin danh mục!" });

    if (isEdit) {
        const sql = "UPDATE criteria_categories SET name = ?, max_points = ? WHERE id = ?";
        db.query(sql, [name, maxPoints, id], (err) => {
            if (err) return res.json({ status: "error", message: err.message });
            res.json({ status: "success", message: "Đã cập nhật trần điểm danh mục thành công!" });
        });
    } else {
        const sql = "INSERT INTO criteria_categories (id, name, max_points) VALUES (?, ?, ?)";
        db.query(sql, [id, name, maxPoints], (err) => {
            if (err) return res.json({ status: "error", message: "Mã định danh (ID) đã tồn tại!" });
            res.json({ status: "success", message: "Thêm danh mục lớn thành công!" });
        });
    }
});

// 2. Thêm mới hoặc Cập nhật Tiêu chí con chi tiết
// THAY THẾ API SUB TRONG SERVER.JS CỦA BẠN:
app.post('/api/criteria/sub', (req, res) => {
    const { parentId, name, points, unit, isEdit, id } = req.body; // id chỉ dùng khi EDIT
    if (!name || !parentId) return res.json({ status: "error", message: "Thiếu thông tin tiêu chí con!" });

    if (isEdit) {
        // Lệnh SỬA: Giữ nguyên ID cũ, chỉ cập nhật nội dung và điểm
        const sql = "UPDATE criteria_sub_categories SET name = ?, points = ?, unit = ? WHERE id = ?";
        db.query(sql, [name, points, unit, id], (err) => {
            if (err) return res.json({ status: "error", message: err.message });
            res.json({ status: "success", message: "Đã cập nhật khung điểm chi tiết thành công!" });
        });
    } else {
        // Lệnh THÊM MỚI: Tự động tính toán mã ID dạng I_1, I_2, I_3...
        // Tìm các mục con hiện tại của mục cha này để lấy số thứ tự lớn nhất
        const sqlFindMax = "SELECT id FROM criteria_sub_categories WHERE parent_id = ?";
        db.query(sqlFindMax, [parentId], (err, rows) => {
            if (err) return res.json({ status: "error", message: err.message });

            let nextNumber = 1;
            if (rows.length > 0) {
                // Lọc tìm số lớn nhất sau dấu gạch dưới (vd: từ I_3 lấy ra số 3)
                const numbers = rows.map(row => {
                    const parts = row.id.split('_');
                    const num = parseInt(parts[parts.length - 1]);
                    return isNaN(num) ? 0 : num;
                });
                nextNumber = Math.max(...numbers) + 1;
            }

            // Tạo mã ID hoàn chỉnh theo đúng định dạng bạn muốn (Ví dụ: I_1, I_2, II_3...)
            const autoGeneratedSubId = `${parentId}_${nextNumber}`;

            const sqlInsert = "INSERT INTO criteria_sub_categories (id, parent_id, name, points, unit) VALUES (?, ?, ?, ?, ?)";
            db.query(sqlInsert, [autoGeneratedSubId, parentId, name, points, unit], (insertErr) => {
                if (insertErr) return res.json({ status: "error", message: "Lỗi sinh mã ID tự động tăng: " + insertErr.message });
                res.json({ status: "success", message: `Thêm tiêu chí thành công với mã [${autoGeneratedSubId}]!` });
            });
        });
    }
});

// 3. Xóa một danh mục hoặc tiêu chí
app.delete('/api/criteria/:type/:id', (req, res) => {
    const { type, id } = req.params;
    // Phân loại xóa bảng cha hay bảng con
    const table = type === 'main' ? 'criteria_categories' : 'criteria_sub_categories';
    
    db.query(`DELETE FROM ${table} WHERE id = ?`, [id], (err) => {
        if (err) return res.json({ status: "error", message: err.message });
        res.json({ status: "success", message: `Đã xóa thành công mục [${id}] khỏi hệ thống!` });
    });
});
// =========================================================
// 5. KHỞI ĐỘNG MÁY CHỦ BACKEND (MẶC ĐỊNH CỔNG CẤU HÌNH: 5000)
// =========================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại cổng: ${PORT}`);
});

// =========================================================
// 6. CỤM API DÀNH RIÊNG CHO MOBILE APP (THAY THẾ XAMPP/PHP)
// =========================================================

// API 6.1: Thay thế get_events.php (ĐÃ SỬA HẾT LỖI CÚ PHÁP SQL 500)
app.get('/api/mobile/events', (req, res) => {
    const mssv = req.query.mssv || '';

    const queryEvents = (userId) => {
const sql = `
    SELECT 
        e.id, e.name, e.date, e.end_date, e.category, e.poster_url,
        e.attached_file, e.description, e.status, e.require_gps, 
        e.require_proof, e.points, e.max_participants, e.faculty_limits,
        e.score_type, -- <--- BỔ SUNG DÒNG NÀY ĐỂ TRẢ VỀ CHO MOBILE
        (SELECT COUNT(*) FROM event_registrations WHERE event_id = e.id) as current_participants,
        IF(er.id IS NOT NULL, 1, 0) as is_registered,
                IF(
                    (SELECT COUNT(*) FROM attendance a WHERE a.event_id COLLATE utf8mb4_unicode_ci = e.id COLLATE utf8mb4_unicode_ci AND a.student_id = ?) > 0,
                    1,
                    0
                ) as is_checked_in,
                
                -- Thuật toán gộp đếm số lượng đăng ký thực tế từng ngành (Đã sửa cú pháp)
                (
                    SELECT CONCAT('{', GROUP_CONCAT(CONCAT('"', t_count.nganh_code, '":', t_count.total_reg)), '}')
                    FROM (
                        SELECT reg.event_id, 
                               UPPER(IF(u.email REGEXP '^[A-Z]{4}', SUBSTRING(u.email, 1, 4), SUBSTRING(u.mssv, 1, 4))) AS nganh_code,
                               COUNT(*) AS total_reg
                        FROM event_registrations reg
                        JOIN users u ON reg.mssv COLLATE utf8mb4_unicode_ci = u.mssv COLLATE utf8mb4_unicode_ci
                        GROUP BY reg.event_id, nganh_code
                    ) t_count 
                    WHERE t_count.event_id = e.id
                ) AS faculty_registered_counts
            FROM events e
            LEFT JOIN event_registrations er 
                ON e.id = er.event_id AND er.mssv COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci
            WHERE e.status COLLATE utf8mb4_unicode_ci != 'Ngừng hoạt động' COLLATE utf8mb4_unicode_ci
            ORDER BY e.date ASC
        `;
        db.query(sql, [userId, mssv], (err, results) => {
            if (err) {
                console.error("🔥 Lỗi SQL gộp đếm ngành:", err.message);
                return res.status(500).json({ status: "error", message: "Lỗi truy vấn CSDL: " + err.message });
            }
            res.status(200).json({ status: "success", events: results });
        });
    };

    if (!mssv) {
        queryEvents(null);
        return;
    }

    db.query(
        "SELECT id FROM users WHERE mssv COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci LIMIT 1",
        [mssv],
        (err, users) => {
            if (err) return res.status(500).json({ status: "error", message: "Lỗi truy vấn CSDL: " + err.message });
            const userId = users && users.length ? users[0].id : null;
            queryEvents(userId);
        }
    );
});

// API 6.2: Thay thế get_dashboard.php (Trang chủ Mobile - ĐÃ BỔ SUNG ĐẾM SUẤT NGÀNH)
// API 6.2: Cập nhật Trang chủ Mobile để nạp đủ dữ liệu đếm chỉ tiêu ngành
app.get('/api/mobile/dashboard', (req, res) => {
    const mssv = req.query.mssv || '';
    if (!mssv) return res.status(400).json({ error: 'Thiếu mã số sinh viên' });

    const responseData = { user_info: null, criteria: [], recent_activities: [] };

    const sqlUser = "SELECT full_name, mssv, chi_doan FROM users WHERE mssv = ? LIMIT 1";
    db.query(sqlUser, [mssv], (userErr, userRes) => {
        if (!userErr && userRes.length > 0) {
            responseData.user_info = userRes[0];
        }

        const sqlCriteria = `
            SELECT c.id, c.title, c.max_points, c.icon_name, COALESCE(scp.current_points, 0) AS current_points 
            FROM criteria c 
            LEFT JOIN student_criteria_points scp ON c.id=scp.criteria_id AND scp.mssv = ?
        `;
        db.query(sqlCriteria, [mssv], (err, criteriaRes) => {
            if (!err) responseData.criteria = criteriaRes;

            // ĐÃ BỔ SUNG: faculty_limits và thuật toán gộp đếm số lượng đăng ký thực tế từng ngành con
const sqlActivities = `
    SELECT e.id, e.name, e.category, e.status, e.date, e.end_date, e.description, 
           e.attached_file, e.points, e.require_gps, e.poster_url, e.max_participants, e.faculty_limits,
           e.score_type, 
           (SELECT COUNT(*) FROM event_registrations WHERE event_id = e.id) as current_participants,
           0 AS isSpecial,
                       (
                            SELECT CONCAT('{', GROUP_CONCAT(CONCAT('"', t_count.nganh_code, '":', t_count.total_reg)), '}')
                            FROM (
                                SELECT reg.event_id, 
                                       UPPER(IF(u.email REGEXP '^[A-Z]{4}', SUBSTRING(u.email, 1, 4), SUBSTRING(u.mssv, 1, 4))) AS nganh_code,
                                       COUNT(*) AS total_reg
                                FROM event_registrations reg
                                JOIN users u ON reg.mssv COLLATE utf8mb4_unicode_ci = u.mssv COLLATE utf8mb4_unicode_ci
                                GROUP BY reg.event_id, nganh_code
                            ) t_count 
                            WHERE t_count.event_id = e.id
                       ) AS faculty_registered_counts
                FROM events e
                WHERE e.status = 'Sắp diễn ra' 
                  AND e.id NOT IN (SELECT event_id FROM event_registrations WHERE mssv = ?)
                ORDER BY e.created_at DESC 
                LIMIT 5
            `;
            db.query(sqlActivities, [mssv], (err, activitiesRes) => {
                if (err) console.error("Lỗi SQL Dashboard đếm ngành:", err.message);
                if (!err) responseData.recent_activities = activitiesRes;
                res.json(responseData);
            });
        });
    });
});
// =========================================================================
// API 6.3: SỬA LỖI NHÂN DÒNG LỊCH SỬ ĐIỂM DANH (ĐÃ FIX LỖI MIX COLLATION)
// =========================================================================
app.get('/api/mobile/history', (req, res) => {
    const mssv = req.query.mssv || '';
    if (!mssv) return res.json({ status: "error", message: "Thiếu MSSV" });

// Tìm đoạn mã app.get('/api/mobile/history') và cập nhật câu SQL:
// Cập nhật câu SQL trong app.get('/api/mobile/history')
const sql = `
    SELECT 
        e.id AS event_id, -- <--- BỔ SUNG DÒNG NÀY ĐỂ FLUTTER NHẬN DIỆN ĐƯỢC ID
        e.name, 
        e.points, 
        e.category, 
        a.checkin_time,
        e.date AS event_date, 
        e.end_date AS event_end_date,
        e.score_type,
        (
            SELECT p.status 
            FROM proofs p 
            WHERE p.event_id COLLATE utf8mb4_unicode_ci = e.id COLLATE utf8mb4_unicode_ci 
              AND (
                CAST(p.student_id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(u.id AS CHAR) COLLATE utf8mb4_unicode_ci
                OR CAST(p.student_id AS CHAR) COLLATE utf8mb4_unicode_ci = u.mssv COLLATE utf8mb4_unicode_ci
              )
            ORDER BY p.created_at DESC 
            LIMIT 1
        ) AS proof_status
    FROM users u
    JOIN attendance a ON (
        CAST(a.student_id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(u.id AS CHAR) COLLATE utf8mb4_unicode_ci 
        OR CAST(a.student_id AS CHAR) COLLATE utf8mb4_unicode_ci = u.mssv COLLATE utf8mb4_unicode_ci
    )
    JOIN events e ON a.event_id COLLATE utf8mb4_unicode_ci = e.id COLLATE utf8mb4_unicode_ci
    WHERE u.mssv COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci
    ORDER BY a.checkin_time DESC
`;
    
    db.query(sql, [mssv], (err, results) => {
        if (err) {
            console.error("🔥 Lỗi lấy lịch sử sạch:", err);
            return res.json({ status: "error", message: err.message });
        }
        res.json({ status: "success", data: results });
    });
});

// API 6.4: Thay thế get_profile.php (Thông tin cá nhân)
app.get('/api/mobile/profile', (req, res) => {
    const email = req.query.email || '';
    const sql = `
        SELECT mssv, full_name, email, role, faculty, point_wallet, phone, chi_doan, avatar 
        FROM users 
        WHERE email = ?
    `;
    db.query(sql, [email], (err, results) => {
        if (err) return res.json({ status: "error", message: "Lỗi CSDL: " + err.message });
        if (results.length > 0) {
            res.json({ status: "success", data: results[0] });
        } else {
            res.json({ status: "error", message: "Không tìm thấy dữ liệu cho email: " + email });
        }
    });
});
// =========================================================
// 6.5 CỤM API CẬP NHẬT PROFILE TỪ MOBILE APP
// =========================================================

// API Cập nhật Avatar
app.post('/api/mobile/update_avatar', upload.single('avatar_image'), (req, res) => {
    const email = req.body.email;
    if (!req.file || !email) {
        return res.json({ status: "error", message: "Thiếu ảnh hoặc email" });
    }
    const avatarPath = 'uploads/' + req.file.filename; // Giữ nguyên chữ uploads/ để Flutter tự nối link
    const sql = "UPDATE users SET avatar = ? WHERE email = ?";
    db.query(sql, [avatarPath, email], (err) => {
        if (err) return res.json({ status: "error", message: "Lỗi cập nhật CSDL: " + err.message });
        res.json({ status: "success", new_avatar_path: avatarPath });
    });
});

// API Cập nhật Tên
app.post('/api/mobile/update_name', upload.none(), (req, res) => {
    const { email, full_name } = req.body;
    db.query("UPDATE users SET full_name = ? WHERE email = ?", [full_name, email], (err) => {
        if (err) return res.json({ status: "error", message: err.message });
        res.json({ status: "success" });
    });
});

// API Cập nhật Số điện thoại
app.post('/api/mobile/update_phone', upload.none(), (req, res) => {
    const { email, phone } = req.body;
    db.query("UPDATE users SET phone = ? WHERE email = ?", [phone, email], (err) => {
        if (err) return res.json({ status: "error", message: err.message });
        res.json({ status: "success" });
    });
});

// API Cập nhật Mật khẩu
app.post('/api/mobile/update_password', async (req, res) => {
    const { email, new_password } = req.body;
    try {
        // Sử dụng bcrypt để mã hóa mật khẩu trước khi lưu (Giống luồng Auth của bạn)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(new_password, salt);
        db.query("UPDATE users SET password = ? WHERE email = ?", [hashedPassword, email], (err) => {
            if (err) return res.json({ status: "error", message: err.message });
            res.json({ status: "success" });
        });
    } catch (error) {
        res.json({ status: "error", message: "Lỗi mã hóa: " + error.message });
    }
});
// =========================================================
// 6.6 CỤM API THAO TÁC SỰ KIỆN TỪ MOBILE (ĐÃ CHUẨN HÓA ERD)
// =========================================================

// =========================================================================
// API 1. ĐĂNG KÝ SỰ KIỆN (ĐÃ CẬP NHẬT THÊM HẠN CHÓT ĐĂNG KÝ MUỘN 30 PHÚT)
// =========================================================================
app.post('/api/mobile/register_event', (req, res) => {
    const { mssv, event_id } = req.body;
    if (!mssv || !event_id) return res.json({ status: "error", message: "Thiếu thông tin xác thực." });

    // Bước 1: Tìm thông tin sinh viên để bóc tách mã ngành từ email hoặc mssv
    db.query("SELECT email FROM users WHERE mssv COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci", [mssv], (err, users) => {
        if (err || users.length === 0) return res.json({ status: "error", message: "Mã số sinh viên không tồn tại." });

        const userEmail = users[0].email || '';
        let studentNganh = 'KHAC';
        
        // Trích xuất mã ngành tự động (VD: HTTT2311... -> HTTT)
        const match = userEmail.match(/([a-zA-Z]{4})(\d{7})@/);
        if (match) {
            studentNganh = match[1].toUpperCase(); 
        } else {
            studentNganh = mssv.substring(0, 4).toUpperCase();
        }

        // Bước 2: Kiểm tra trạng thái, thời gian và chỉ tiêu ngành của sự kiện
        // LƯU Ý: Đã thêm trường `date` vào câu lệnh SELECT dưới đây
        db.query("SELECT date, status, faculty_limits, max_participants FROM events WHERE id COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci", [event_id], (err, events) => {
            if (err || events.length === 0) return res.json({ status: "error", message: "Sự kiện không tồn tại." });
            
            const event = events[0];
            if (event.status === 'Ngừng hoạt động') {
                return res.json({ status: "error", message: "Sự kiện hiện đã đóng, không nhận đăng ký thêm." });
            }

            // --- VÁ LỖI LOGIC: CHẶN ĐĂNG KÝ SAU 30 PHÚT KỂ TỪ KHI SỰ KIỆN BẮT ĐẦU ---
            if (event.date) {
                const startTime = new Date(event.date).getTime();
                const currentTime = Date.now();
                const deadLineTime = startTime + (30 * 60 * 1000); // Giờ bắt đầu + 30 phút trễ

                if (currentTime > deadLineTime) {
                    return res.json({ 
                        status: "error", 
                        message: "Đăng ký thất bại! Sự kiện đã diễn ra quá 30 phút, hệ thống đã đóng cổng đăng ký bổ sung." 
                    });
                }
            }

            const facultyLimitsStr = event.faculty_limits;
            let limitForThisNganh = null;
            
            // ... (Tất cả các đoạn code giải mã JSON và INSERT dữ liệu phía sau của bạn giữ nguyên 100%) ...
            if (facultyLimitsStr) {
                try {
                    const limitsJson = JSON.parse(facultyLimitsStr);
                    if (limitsJson && limitsJson[studentNganh] !== undefined && limitsJson[studentNganh] !== '') {
                        limitForThisNganh = parseInt(limitsJson[studentNganh]);
                    }
                } catch (e) {
                    console.error("Lỗi phân tích JSON faculty_limits:", e);
                }
            }

            // Bước 3: Kiểm tra xem sinh viên đã đăng ký sự kiện này chưa
            db.query("SELECT id FROM event_registrations WHERE mssv COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci AND event_id COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci", [mssv, event_id], (err, regs) => {
                if (regs.length > 0) return res.json({ status: "error", message: "Bạn đã đăng ký sự kiện này rồi!" });

                // Bước 4: Kiểm tra chỉ tiêu ngành nếu có cấu hình
                if (limitForThisNganh !== null && limitForThisNganh > 0) {
                    const countSql = `
                        SELECT COUNT(*) AS registered_count 
                        FROM event_registrations er
                        JOIN users u ON er.mssv COLLATE utf8mb4_unicode_ci = u.mssv COLLATE utf8mb4_unicode_ci
                        WHERE er.event_id COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci 
                        AND (u.email LIKE ? OR u.mssv LIKE ?)
                    `;
                    db.query(countSql, [event_id, `%${studentNganh.toLowerCase()}%`, `${studentNganh}%`], (countErr, countRes) => {
                        if (countErr) return res.json({ status: "error", message: "Lỗi hệ thống kiểm tra chỉ tiêu ngành." });
                        
                        const currentRegistered = countRes[0].registered_count || 0;
                        if (currentRegistered >= limitForThisNganh) {
                            return res.json({ 
                                status: "error", 
                                message: `Đăng ký thất bại! Chỉ tiêu dành cho ngành của bạn (${studentNganh}) đã hết suất (${currentRegistered}/${limitForThisNganh} suất).` 
                            });
                        }

                        // Hợp lệ -> Tiến hành ghi nhận
                        db.query("INSERT INTO event_registrations (mssv, event_id) VALUES (?, ?)", [mssv, event_id], (insErr) => {
                            if (insErr) return res.json({ status: "error", message: "Lỗi ghi nhận đăng ký: " + insErr.message });
                            res.json({ status: "success", message: "Đăng ký tham gia thành công!" });
                        });
                    });
                } else {
                    // Không giới hạn ngành -> Ghi nhận thẳng
                    db.query("INSERT INTO event_registrations (mssv, event_id) VALUES (?, ?)", [mssv, event_id], (insErr) => {
                        if (insErr) return res.json({ status: "error", message: "Lỗi ghi nhận đăng ký: " + insErr.message });
                        res.json({ status: "success", message: "Đăng ký tham gia thành công!" });
                    });
                }
            });
        });
    });
});

// 2. ĐIỂM DANH SỰ KIỆN (Đồng bộ chuẩn xác student_id kiểu VARCHAR và bảng attendance)
app.post('/api/mobile/checkin_event', (req, res) => {
    const { mssv, event_id } = req.body;
    if (!mssv || !event_id) return res.json({ status: "error", message: "Thiếu thông tin điểm danh." });

    // Bước 1: Xác thực tài khoản sinh viên
    db.query("SELECT id FROM users WHERE mssv COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci", [mssv], (err, users) => {
        if (err || users.length === 0) return res.json({ status: "error", message: "Không tìm thấy thông tin sinh viên." });

        // Bước 2: Kiểm tra xem sinh viên đã đăng ký sự kiện này chưa
        db.query("SELECT id, is_checked_in FROM event_registrations WHERE mssv COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci AND event_id COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci", [mssv, event_id], (err, regs) => {
            if (err || regs.length === 0) return res.json({ status: "error", message: "Bạn chưa đăng ký sự kiện này nên không thể thực hiện điểm danh." });
            
            if (regs[0].is_checked_in == 1) {
                return res.json({ status: "error", message: "Bạn đã được ghi nhận điểm danh sự kiện này rồi!" });
            }

            // Bước 3: Cập nhật trạng thái check-in trên App Mobile
            db.query("UPDATE event_registrations SET is_checked_in = 1, checkin_at = CURRENT_TIMESTAMP WHERE mssv COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci AND event_id COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci", [mssv, event_id], (updateErr) => {
                if (updateErr) return res.json({ status: "error", message: "Lỗi cập nhật trạng thái điểm danh: " + updateErr.message });

                // Bước 4: Lưu vào lịch sử bảng attendance (student_id lưu chuỗi mssv theo cấu hình VARCHAR của ERD)
                const sqlAtt = `INSERT INTO attendance (event_id, student_id, method, status, checkin_time) VALUES (?, ?, 'Quét mã QR', 'checked_in', NOW())`;
                db.query(sqlAtt, [event_id, mssv], (attErr) => { // Truyền thẳng biến mssv (chuỗi) vào thay cho student_id (số)
                    if (attErr) console.warn("⚠️ Cảnh báo lỗi đồng bộ bảng attendance:", attErr.message);

                    res.json({ status: "success", message: "Điểm danh thành công! Hệ thống ghi nhận lịch sử hoạt động của bạn." });
                });
            });
        });
    });
});

// 3. HỦY ĐĂNG KÝ SỰ KIỆN (Giữ nguyên logic kiểm tra trước 1 ngày)
app.post('/api/mobile/cancel_registration', (req, res) => {
    const { mssv, event_id } = req.body;
    if (!mssv || !event_id) return res.json({ status: "error", message: "Thiếu thông tin yêu cầu hủy." });

    db.query("SELECT date FROM events WHERE id COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci", [event_id], (err, events) => {
        if (err || events.length === 0) return res.json({ status: "error", message: "Sự kiện không tồn tại." });

        const eventTime = new Date(events[0].date).getTime();
        const currentTime = Date.now();
        
        if ((eventTime - currentTime) < 86400000) { 
            return res.json({ status: "error", message: "Không thể hủy! Bạn chỉ được phép hủy đăng ký trước khi sự kiện diễn ra ít nhất 24 giờ." });
        }

        db.query("DELETE FROM event_registrations WHERE mssv COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci AND event_id COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci", [mssv, event_id], (err, result) => {
            if (err) return res.json({ status: "error", message: "Lỗi CSDL: " + err.message });
            if (result.affectedRows > 0) {
                res.json({ status: "success", message: "Hủy đăng ký sự kiện thành công!" });
            } else {
                res.json({ status: "error", message: "Dữ liệu đăng ký không tồn tại hoặc đã bị hủy từ trước." });
            }
        });
    });
});