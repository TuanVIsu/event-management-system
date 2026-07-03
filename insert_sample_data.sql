-- Thêm sinh viên mẫu cho ngành KHMT
INSERT IGNORE INTO users (id, mssv, full_name, email, role, faculty, chi_doan, password) VALUES 
(100, 'KHMT2311001', 'Nguyễn Văn A (KHMT)', 'nva_khmt2311@student.ctuet.edu.vn', 'student', 'Khoa học Máy tính', 'KHMT2311', '$2b$10$SYmPGRUJM654EPby1DONYru/5o/y7r931v8JkXmS7wEByoW7532B6');

-- Thêm sinh viên mẫu cho ngành KTPM
INSERT IGNORE INTO users (id, mssv, full_name, email, role, faculty, chi_doan, password) VALUES 
(101, 'KTPM2311002', 'Trần Thị B (KTPM)', 'ttb_ktpm2311@student.ctuet.edu.vn', 'student', 'Kỹ thuật Phần mềm', 'KTPM2311', '$2b$10$SYmPGRUJM654EPby1DONYru/5o/y7r931v8JkXmS7wEByoW7532B6');

-- Thêm sinh viên mẫu cho ngành HTTT
INSERT IGNORE INTO users (id, mssv, full_name, email, role, faculty, chi_doan, password) VALUES 
(102, 'HTTT2311003', 'Lê Văn C (HTTT)', 'lvc_httt2311@student.ctuet.edu.vn', 'student', 'Hệ thống Thông tin', 'HTTT2311', '$2b$10$SYmPGRUJM654EPby1DONYru/5o/y7r931v8JkXmS7wEByoW7532B6');

-- Thêm tài khoản classCommittee mẫu cho ngành HTTT
INSERT IGNORE INTO users (id, mssv, full_name, email, role, faculty, chi_doan, password) VALUES 
(103, 'HTTT2311004', 'Cán Bộ Lớp HTTT', 'cbl_httt2311@student.ctuet.edu.vn', 'classCommittee', 'Hệ thống Thông tin', 'HTTT2311', '$2b$10$SYmPGRUJM654EPby1DONYru/5o/y7r931v8JkXmS7wEByoW7532B6');

-- Thêm 1 sự kiện mẫu để gắn minh chứng
INSERT IGNORE INTO events (id, name, date, end_date, description, category, status, points) VALUES 
('EV_MOCK_1', 'Sự kiện Mockup', '2026-06-25 08:00:00', '2026-06-25 17:00:00', 'Mock Event', 'Khác', 'Đang diễn ra', 10);

-- Thêm minh chứng mẫu cho các sinh viên trên
INSERT IGNORE INTO proofs (id, student_id, event_id, image_url, image_hash, ocr_match_percent, phash_warning, status) VALUES 
('PR_MOCK_KHMT', 100, 'EV_MOCK_1', '', 'hash_khmt', 80, 0, 'pending'),
('PR_MOCK_KTPM', 101, 'EV_MOCK_1', '', 'hash_ktpm', 85, 0, 'pending'),
('PR_MOCK_HTTT', 102, 'EV_MOCK_1', '', 'hash_httt', 90, 0, 'pending');
