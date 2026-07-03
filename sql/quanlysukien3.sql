-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Máy chủ: 127.0.0.1
-- Thời gian đã tạo: Th6 23, 2026 lúc 03:28 PM
-- Phiên bản máy phục vụ: 10.4.32-MariaDB
-- Phiên bản PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Cơ sở dữ liệu: `quanlysukien3`
--

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `attendance`
--

CREATE TABLE `attendance` (
  `id` int(11) NOT NULL,
  `event_id` varchar(20) DEFAULT NULL,
  `student_id` varchar(20) DEFAULT NULL,
  `checkin_time` datetime DEFAULT NULL,
  `method` varchar(20) DEFAULT NULL,
  `status` enum('checked_in','absent','late') NOT NULL DEFAULT 'checked_in'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `attendance`
--

INSERT INTO `attendance` (`id`, `event_id`, `student_id`, `checkin_time`, `method`, `status`) VALUES
(34, 'EVT-26020', '1', '2026-06-16 20:06:19', 'Upload_Minh_Chung', 'checked_in'),
(35, 'EVT-26010', 'HTTT2311052', '2026-06-16 20:15:52', 'Upload_Minh_Chung', 'checked_in'),
(36, 'EVT-26020', 'HTTT2311052', '2026-06-16 20:21:31', 'Upload_Minh_Chung', 'checked_in');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `criteria`
--

CREATE TABLE `criteria` (
  `id` int(11) NOT NULL,
  `title` varchar(100) NOT NULL,
  `max_points` int(11) NOT NULL CHECK (`max_points` between 0 and 100),
  `icon_name` varchar(50) DEFAULT 'star',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `criteria`
--

INSERT INTO `criteria` (`id`, `title`, `max_points`, `icon_name`, `created_at`) VALUES
(1, 'Tham gia học tập', 20, 'menu_book', '2026-06-05 08:33:33'),
(2, 'Chấp hành nội quy', 25, 'volunteer_activism', '2026-06-05 08:33:33'),
(3, 'Hoạt động xã hội', 20, 'nature_people', '2026-06-05 08:33:33'),
(4, 'Quan hệ cộng đồng', 25, 'psychology_outlined', '2026-06-05 08:33:33'),
(5, 'Khác', 10, 'extension', '2026-06-05 08:33:33');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `events`
--

CREATE TABLE `events` (
  `id` varchar(20) NOT NULL,
  `name` varchar(255) NOT NULL,
  `date` datetime NOT NULL,
  `end_date` datetime DEFAULT NULL,
  `description` text DEFAULT NULL,
  `category` varchar(100) NOT NULL DEFAULT '',
  `poster_url` varchar(500) DEFAULT NULL,
  `attached_file` text DEFAULT NULL,
  `status` enum('Sắp diễn ra','Đang diễn ra','Đã kết thúc','Ngừng hoạt động') DEFAULT 'Sắp diễn ra',
  `require_gps` tinyint(1) DEFAULT 0,
  `require_proof` tinyint(1) DEFAULT 1,
  `points` int(11) NOT NULL DEFAULT 0 CHECK (`points` between 0 and 100),
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `required_fields` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `location_preset_id` int(11) DEFAULT NULL,
  `allowed_radius` int(11) NOT NULL DEFAULT 50 COMMENT 'Bán kính hợp lệ (mét)',
  `max_participants` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `events`
--

INSERT INTO `events` (`id`, `name`, `date`, `end_date`, `description`, `category`, `poster_url`, `attached_file`, `status`, `require_gps`, `require_proof`, `points`, `latitude`, `longitude`, `required_fields`, `created_at`, `location_preset_id`, `allowed_radius`, `max_participants`) VALUES
('EV-1593', 'trsatyud', '2026-06-14 00:19:00', '2026-06-23 22:03:00', '', 'Học thuật', '', '', 'Đang diễn ra', 0, 1, 2, NULL, NULL, '[\"mssv\",\"name\",\"phone\",\"chi_doan\"]', '2026-06-09 15:03:48', NULL, 50, 0),
('EV-1718', 'teest111', '2026-06-15 09:32:00', '2026-06-30 20:33:00', 'dấdasd', 'Học thuật', '', '', 'Đang diễn ra', 0, 1, 0, NULL, NULL, '[\"mssv\",\"name\",\"phone\",\"chi_doan\",\"checkin_time\",\"method\"]', '2026-06-09 13:33:28', NULL, 50, 0),
('EV-3574', 'te222w', '2026-06-29 20:37:00', '2026-06-24 20:37:00', '', '', '', '', NULL, 0, 1, 0, NULL, NULL, '[\"mssv\",\"name\",\"phone\",\"chi_doan\",\"checkin_time\",\"method\"]', '2026-06-09 13:37:15', NULL, 50, 0),
('EV-5121', 'tesw12', '2026-06-09 12:49:00', '2026-06-12 20:49:00', 'dsadasdsad', '', '', '', 'Đã kết thúc', 0, 1, 0, NULL, NULL, '[\"mssv\",\"name\",\"phone\",\"chi_doan\",\"checkin_time\",\"method\"]', '2026-06-09 13:49:55', NULL, 50, 0),
('EV-7454', 'huhuh', '2026-06-14 23:30:00', '2026-06-30 23:30:00', 'dấdasddấdasdad', 'Học thuật', '', '', 'Đang diễn ra', 0, 1, 5, NULL, NULL, '[\"mssv\",\"name\",\"phone\",\"chi_doan\",\"checkin_time\",\"method\"]', '2026-06-09 16:31:06', NULL, 50, 100),
('EV-7816', 'alibaba', '2026-06-03 16:51:00', '2026-06-12 15:50:00', 'đâbjsdhkjnalsndál;d', 'Học thuật', '/uploads/1781018919776-Shi Hao ç³æ à¸ªà¸·à¸­à¹à¸®à¹à¸² Huang è à¸®à¸§à¸ _ Perfect World å®ç¾ä¸ç à¹à¸¥à¸à¸­à¸±à¸à¸ªà¸¡à¸à¸¹à¸£à¸à¹à¹à¸à¸.jpg', '/uploads/1781019672492-indexhtml.php', 'Đã kết thúc', 1, 1, 0, 10.02108100, 99.99999999, '[\"mssv\",\"name\",\"phone\",\"chi_doan\",\"checkin_time\",\"method\"]', '2026-06-09 08:50:48', NULL, 50, 0),
('EV-8393', 'test', '2026-06-09 19:45:00', '2026-06-13 15:45:00', 'https://meet.google.com/xyz  adadasdasdacaca', '', '/uploads/1780994720848-Shi Hao ç³æ à¸ªà¸·à¸­à¹à¸®à¹à¸² Huang è à¸®à¸§à¸ _ Perfect World å®ç¾ä¸ç à¹à¸¥à¸à¸­à¸±à¸à¸ªà¸¡à¸à¸¹à¸£à¸à¹à¹à¸à¸.jpg', '', 'Đã kết thúc', 0, 1, 0, NULL, NULL, '[\"mssv\",\"name\",\"phone\",\"chi_doan\",\"checkin_time\",\"method\"]', '2026-06-09 08:45:20', NULL, 50, 0),
('EV-9050', 'testtgday', '2026-06-10 00:16:00', '2026-06-12 21:17:00', 'ádasdsad', '', '', '', 'Đã kết thúc', 0, 1, 0, NULL, NULL, '[\"mssv\",\"name\",\"phone\",\"chi_doan\",\"checkin_time\",\"method\"]', '2026-06-09 14:17:44', NULL, 50, 0),
('EV-9340', 'ko', '2026-06-09 20:05:00', '2026-06-23 23:13:00', '', 'Học thuật', '/uploads/1780654645063-Shi Hao ç³æ à¸ªà¸·à¸­à¹à¸®à¹à¸² Huang è à¸®à¸§à¸ _ Perfect World å®ç¾ä¸ç à¹à¸¥à¸à¸­à¸±à¸à¸ªà¸¡à¸à¸¹à¸£à¸à¹à¹à¸à¸.jpg', '', 'Đã kết thúc', 0, 1, 0, NULL, NULL, '[\"mssv\",\"name\",\"phone\",\"chi_doan\",\"checkin_time\",\"method\"]', '2026-06-04 16:13:32', NULL, 50, 0),
('EV-9522', 'test2', '2026-06-16 00:03:00', '2026-06-23 22:01:00', 'sdadadadsad', '', '', '', NULL, 0, 1, 0, NULL, NULL, '[\"mssv\",\"name\",\"phone\",\"chi_doan\",\"checkin_time\",\"method\"]', '2026-06-09 15:01:59', NULL, 50, 0),
('EVT-26001', 'Đại hội Chi đoàn Hệ thống Thông tin Khóa 2023', '2026-05-15 14:00:00', '2026-05-15 17:30:00', '', '', '/uploads/poster_daihoi.jpg', '/uploads/kehoach_daihoi.pdf', 'Đã kết thúc', 1, 1, 0, 10.04530000, 99.99999999, '[\"mssv\", \"full_name\"]', '2026-05-01 01:00:00', NULL, 50, 0),
('EVT-26002', 'Sinh hoạt Chuyên đề Web Fullstack: PHP & ReactJS', '2026-05-20 08:00:00', '2026-05-20 11:30:00', 'https://meet.google.com/abc', 'Học thuật', '', '', 'Đã kết thúc', 0, 1, 0, NULL, NULL, '[\"mssv\"]', '2026-05-05 02:15:00', NULL, 50, 0),
('EVT-26003', 'Hội thảo Ứng dụng AI & Machine Learning', '2026-06-04 07:30:00', '2026-06-04 11:30:00', '', 'Học thuật', '/uploads/poster_ai.jpg', '', 'Đã kết thúc', 1, 1, 0, 10.04530000, 99.99999999, '[\"mssv\", \"full_name\", \"faculty\"]', '2026-05-25 03:00:00', NULL, 50, 0),
('EVT-26004', 'Chiến dịch Mùa Hè Xanh 2026', '2026-06-12 06:00:00', '2026-07-15 17:00:00', 'https://muahexanh.sv.ctuet.edu.vn', 'Tham gia học tập', '/uploads/poster_mhx.png', '/uploads/dk_mhx.docx', 'Đang diễn ra', 1, 1, 10, 10.04086600, 105.76257700, '[\"mssv\",\"phone\",\"chi_doan\"]', '2026-06-01 07:30:00', 6, 50, 0),
('EVT-26005', 'Giải bóng đá Sinh viên Công nghệ', '2026-06-09 00:00:00', '2026-06-20 18:00:00', '', '', '', '', 'Đã kết thúc', 1, 1, 0, 10.04600000, 99.99999999, '[\"mssv\",\"full_name\"]', '2026-06-02 01:20:00', NULL, 50, 0),
('EVT-26006', 'Tiếp sức Mùa thi THPT Quốc gia 2026', '2026-06-12 06:00:00', '2026-06-28 17:00:00', '', 'Tình nguyện', '/uploads/tsmt_2026.jpg', '', 'Đang diễn ra', 1, 1, 5, 10.04086600, 105.76257700, '[\"mssv\",\"phone\"]', '2026-06-03 02:00:00', 6, 50, 100),
('EVT-26007', 'Ngày hội Sinh viên 5 Tốt cấp Trường', '2026-06-15 08:00:00', '2026-06-30 11:30:00', '', 'Tham gia học tập', '/uploads/sv5t.png', '', 'Đang diễn ra', 0, 1, 2, NULL, NULL, '[\"mssv\"]', '2026-04-25 08:00:00', NULL, 50, 0),
('EVT-26008', 'Seminar: Xây dựng Recommendation System', '2026-06-13 14:00:00', '2026-06-15 16:30:00', 'https://zoom.us/j/123456789', 'Quan hệ cộng đồng', '/uploads/nlp_seminar.jpg', '/uploads/slide_nlp.pdf', 'Đã kết thúc', 0, 1, 5, NULL, NULL, '[\"mssv\",\"full_name\",\"phone\"]', '2026-06-01 03:10:00', NULL, 50, 0),
('EVT-26009', 'lolo', '2026-06-27 14:00:00', '2026-06-04 17:00:00', '', 'Tình nguyện', '/uploads/1780654351135-Shi Hao ç³æ à¸ªà¸·à¸­à¹à¸®à¹à¸² Huang è à¸®à¸§à¸ _ Perfect World å®ç¾ä¸ç à¹à¸¥à¸à¸­à¸±à¸à¸ªà¸¡à¸à¸¹à¸£à¸à¹à¹à¸à¸.jpg', '', 'Đã kết thúc', 1, 1, 0, 10.04530000, 99.99999999, '[\"mssv\"]', '2026-05-28 01:00:00', NULL, 50, 0),
('EVT-26010', 'Cuộc thi Thiết kế UI/UX Ứng dụng Quản lý', '2026-06-15 08:00:00', '2026-07-05 17:00:00', 'https://uiux.ctuet.edu.vn', 'Quan hệ cộng đồng', '/uploads/uiux_contest.png', '/uploads/thele_uiux.pdf', 'Đang diễn ra', 0, 1, 5, NULL, NULL, '[\"mssv\",\"full_name\",\"email\"]', '2026-06-02 07:00:00', NULL, 50, 0),
('EVT-26011', 'Workshop Kỹ năng viết CV ngành IT', '2026-05-25 18:30:00', '2026-05-25 21:00:00', '', '', '', '', 'Đã kết thúc', 1, 1, 0, 10.04530000, 99.99999999, '[\"mssv\"]', '2026-05-15 01:00:00', NULL, 50, 0),
('EVT-26012', 'Giao lưu văn nghệ Chào mừng năm học mới', '2026-06-13 06:30:00', '2026-08-15 22:00:00', '', 'Hoạt động xã hội', '/uploads/van_nghe.jpg', '', 'Đang diễn ra', 0, 1, 5, NULL, NULL, '[\"mssv\",\"chi_doan\"]', '2026-06-01 00:30:00', NULL, 50, 0),
('EVT-26013', 'Sinh hoạt Chi đoàn chủ điểm tháng 6', '2026-06-04 19:00:00', '2026-06-04 21:00:00', 'https://meet.google.com/xyz', '', '/uploads/1780654382384-Shi Hao ç³æ à¸ªà¸·à¸­à¹à¸®à¹à¸² Huang è à¸®à¸§à¸ _ Perfect World å®ç¾ä¸ç à¹à¸¥à¸à¸­à¸±à¸à¸ªà¸¡à¸à¸¹à¸£à¸à¹à¹à¸à¸.jpg', '', 'Đã kết thúc', 0, 1, 0, NULL, NULL, '[\"mssv\",\"full_name\"]', '2026-06-01 02:00:00', NULL, 50, 0),
('EVT-26014', 'Tọa đàm Định hướng nghề nghiệp Data Science', '2026-06-13 08:00:00', '2026-06-18 11:30:00', '', 'Hoạt động xã hội', '/uploads/datascience.png', '', 'Đã kết thúc', 1, 1, 20, 10.04086600, 105.76257700, '[\"mssv\",\"full_name\",\"chi_doan\",\"checkin_time\"]', '2026-06-03 08:45:00', 6, 50, 0),
('EVT-26015', 'Chuyên đề An toàn thông tin mạng', '2026-05-05 14:00:00', '2026-05-05 16:30:00', '', 'Học thuật', '', '', 'Đã kết thúc', 1, 1, 0, 10.04530000, 99.99999999, '[\"mssv\"]', '2026-04-20 03:00:00', NULL, 50, 0),
('EVT-26016', 'Hiến máu tình nguyện đợt 2 - Năm 2026', '2026-06-09 07:00:00', '2026-06-12 11:30:00', '', 'Tình nguyện', '/uploads/hien_mau.jpg', '/uploads/phieu_dangky.pdf', 'Đã kết thúc', 1, 1, 0, 10.04530000, 99.99999999, '[\"mssv\",\"full_name\",\"phone\"]', '2026-06-02 01:00:00', NULL, 50, 0),
('EVT-26017', 'Tham quan doanh nghiệp phần mềm', '2026-06-13 07:30:00', '2026-06-22 17:00:00', '', 'Học thuật', '', '', 'Đã kết thúc', 0, 1, 0, NULL, NULL, '[\"mssv\",\"phone\",\"chi_doan\"]', '2026-06-04 02:00:00', NULL, 50, 0),
('EVT-26018', 'Lớp tập huấn Kỹ năng cán bộ Đoàn - Hội', '2026-05-28 08:00:00', '2026-05-29 17:00:00', '', '', '/uploads/tap_huan.png', '', 'Đã kết thúc', 1, 1, 0, 10.04530000, 99.99999999, '[\"mssv\", \"chi_doan\"]', '2026-05-10 07:00:00', NULL, 50, 0),
('EVT-26019', 'Ngày hội Sinh viên Đổi mới sáng tạo', '2026-06-04 08:00:00', '2026-06-04 17:00:00', '', '', '/uploads/startup.jpg', '', 'Đã kết thúc', 1, 1, 0, 10.04530000, 99.99999999, '[\"mssv\", \"full_name\"]', '2026-05-20 03:30:00', NULL, 50, 0),
('EVT-26020', 'Cuộc thi Tiếng Anh chuyên ngành CNTT', '2026-06-15 08:00:00', '2026-06-30 11:30:00', '', 'Tham gia học tập', '', '', 'Đang diễn ra', 0, 1, 3, NULL, NULL, '[\"mssv\",\"full_name\",\"checkin_time\",\"method\"]', '2026-06-03 09:00:00', NULL, 50, 0);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `event_attendances`
--

CREATE TABLE `event_attendances` (
  `id` int(11) NOT NULL,
  `mssv` varchar(20) NOT NULL,
  `event_id` int(11) NOT NULL,
  `checkin_time` datetime DEFAULT current_timestamp(),
  `status` enum('checked_in','absent') DEFAULT 'checked_in'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `event_registrations`
--

CREATE TABLE `event_registrations` (
  `id` int(11) NOT NULL,
  `mssv` varchar(20) NOT NULL,
  `event_id` varchar(50) DEFAULT NULL,
  `is_checked_in` tinyint(1) DEFAULT 0,
  `checkin_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `event_registrations`
--

INSERT INTO `event_registrations` (`id`, `mssv`, `event_id`, `is_checked_in`, `checkin_at`, `created_at`) VALUES
(71, 'HTTT2311052', 'EVT-26020', 1, '2026-06-16 20:21:31', '2026-06-16 12:37:48'),
(72, 'HTTT2311052', 'EVT-26010', 1, '2026-06-16 20:15:52', '2026-06-16 12:51:37');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `location_presets`
--

CREATE TABLE `location_presets` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `location_presets`
--

INSERT INTO `location_presets` (`id`, `name`, `latitude`, `longitude`, `created_at`) VALUES
(6, 'cafe', 10.04086600, 105.76257700, '2026-06-13 09:34:50');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `proofs`
--

CREATE TABLE `proofs` (
  `id` varchar(50) NOT NULL,
  `student_id` int(11) NOT NULL,
  `event_id` varchar(50) NOT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `image_hash` varchar(64) DEFAULT NULL,
  `ocr_match_percent` float DEFAULT 0,
  `phash_warning` tinyint(1) DEFAULT 0,
  `status` varchar(20) DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `proofs`
--

INSERT INTO `proofs` (`id`, `student_id`, `event_id`, `image_url`, `image_hash`, `ocr_match_percent`, `phash_warning`, `status`, `created_at`) VALUES
('PR_1781615179', 1, 'EVT-26020', '/uploads/1781615179109-469523712.jpg', 'd201c97f99765be9e88d5a0607e716dc7a9cf9a18667124330e4e8cc99983aeb', 0, 0, 'rejected', '2026-06-16 13:06:19'),
('PR_1781615752', 1, 'EVT-26010', '/uploads/1781615751575-626561687.jpg', 'd201c97f99765be9e88d5a0607e716dc7a9cf9a18667124330e4e8cc99983aeb', 0, 1, 'approved', '2026-06-16 13:15:52'),
('PR_1781616091', 1, 'EVT-26020', '/uploads/1781616090853-778074096.jpg', 'd201c97f99765be9e88d5a0607e716dc7a9cf9a18667124330e4e8cc99983aeb', 0, 1, 'pending', '2026-06-16 13:21:31');

--
-- Bẫy `proofs`
--
DELIMITER $$
CREATE TRIGGER `trg_proof_approved_insert` AFTER INSERT ON `proofs` FOR EACH ROW BEGIN
    DECLARE v_mssv VARCHAR(20);
    DECLARE v_points INT;
    DECLARE v_category VARCHAR(100);
    DECLARE v_criteria_id INT;
    DECLARE v_max_points INT;

    IF NEW.status = 'approved' THEN
        SELECT mssv INTO v_mssv FROM users WHERE id = NEW.student_id LIMIT 1;
        SELECT points, category INTO v_points, v_category FROM events WHERE id = NEW.event_id LIMIT 1;
        SELECT id, max_points INTO v_criteria_id, v_max_points FROM criteria WHERE title = v_category LIMIT 1;
        
        IF v_criteria_id IS NOT NULL THEN
            IF EXISTS (SELECT 1 FROM student_criteria_points WHERE mssv = v_mssv AND criteria_id = v_criteria_id) THEN
                UPDATE student_criteria_points 
                SET current_points = LEAST(current_points + v_points, v_max_points)
                WHERE mssv = v_mssv AND criteria_id = v_criteria_id;
            ELSE
                INSERT INTO student_criteria_points (mssv, criteria_id, current_points) 
                VALUES (v_mssv, v_criteria_id, LEAST(v_points, v_max_points));
            END IF;
            
            UPDATE users SET point_wallet = point_wallet + v_points WHERE id = NEW.student_id;
        END IF;
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_proof_approved_update` AFTER UPDATE ON `proofs` FOR EACH ROW BEGIN
    DECLARE v_mssv VARCHAR(20);
    DECLARE v_points INT;
    DECLARE v_criteria_id INT;
    DECLARE v_max_points INT;
    DECLARE v_current_points INT DEFAULT NULL;
    DECLARE v_actual_diff INT DEFAULT 0;

    -- TH1: DUYỆT MINH CHỨNG
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        SELECT u.mssv, e.points, c.id, c.max_points 
        INTO v_mssv, v_points, v_criteria_id, v_max_points
        FROM events e
        JOIN criteria c ON c.title = e.category
        JOIN users u ON u.id = NEW.student_id
        WHERE e.id = NEW.event_id LIMIT 1;
        
        IF v_criteria_id IS NOT NULL THEN
            SELECT current_points INTO v_current_points 
            FROM student_criteria_points WHERE mssv = v_mssv AND criteria_id = v_criteria_id LIMIT 1;
            
            IF v_current_points IS NOT NULL THEN
                -- Tính số điểm thực tế được phép cộng (không vượt max)
                SET v_actual_diff = LEAST(v_current_points + v_points, v_max_points) - v_current_points;
                IF v_actual_diff > 0 THEN
                    UPDATE student_criteria_points SET current_points = current_points + v_actual_diff WHERE mssv = v_mssv AND criteria_id = v_criteria_id;
                    UPDATE users SET point_wallet = point_wallet + v_actual_diff WHERE id = NEW.student_id;
                END IF;
            ELSE
                SET v_actual_diff = LEAST(v_points, v_max_points);
                INSERT INTO student_criteria_points (mssv, criteria_id, current_points) VALUES (v_mssv, v_criteria_id, v_actual_diff);
                UPDATE users SET point_wallet = point_wallet + v_actual_diff WHERE id = NEW.student_id;
            END IF;
        END IF;
    END IF;
    
    -- TH2: HỦY DUYỆT MINH CHỨNG
    IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
        SELECT u.mssv, e.points, c.id 
        INTO v_mssv, v_points, v_criteria_id
        FROM events e
        JOIN criteria c ON c.title = e.category
        JOIN users u ON u.id = NEW.student_id
        WHERE e.id = NEW.event_id LIMIT 1;
        
        IF v_criteria_id IS NOT NULL THEN
            SELECT current_points INTO v_current_points 
            FROM student_criteria_points WHERE mssv = v_mssv AND criteria_id = v_criteria_id LIMIT 1;
            
            IF v_current_points IS NOT NULL THEN
                -- Tính số điểm thực tế cần trừ
                SET v_actual_diff = v_current_points - GREATEST(v_current_points - v_points, 0);
                IF v_actual_diff > 0 THEN
                    UPDATE student_criteria_points SET current_points = current_points - v_actual_diff WHERE mssv = v_mssv AND criteria_id = v_criteria_id;
                    UPDATE users SET point_wallet = point_wallet - v_actual_diff WHERE id = NEW.student_id;
                END IF;
            END IF;
        END IF;
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `student_criteria_points`
--

CREATE TABLE `student_criteria_points` (
  `id` int(11) NOT NULL,
  `mssv` varchar(20) NOT NULL,
  `criteria_id` int(11) NOT NULL,
  `current_points` int(11) DEFAULT 0 CHECK (`current_points` between 0 and 100),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `student_criteria_points`
--

INSERT INTO `student_criteria_points` (`id`, `mssv`, `criteria_id`, `current_points`, `updated_at`) VALUES
(1, 'HTTT2311052', 1, 20, '2026-06-13 09:49:32'),
(2, 'HTTT2311052', 2, 25, '2026-06-09 08:25:17'),
(3, 'HTTT2311052', 3, 20, '2026-06-13 09:53:37'),
(4, 'HTTT2311052', 4, 20, '2026-06-09 08:25:34'),
(5, 'HTTT2311052', 5, 5, '2026-06-09 08:25:41'),
(6, 'httt2311', 4, 5, '2026-06-16 13:19:35');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `mssv` varchar(20) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `avatar` varchar(500) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `role` enum('classCommittee','student','teacher','admin') DEFAULT 'student',
  `is_locked` tinyint(1) NOT NULL DEFAULT 0,
  `faculty` varchar(100) DEFAULT NULL,
  `point_wallet` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `phone` varchar(20) DEFAULT NULL,
  `chi_doan` varchar(100) DEFAULT NULL,
  `cohort` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `users`
--

INSERT INTO `users` (`id`, `mssv`, `full_name`, `email`, `avatar`, `password`, `role`, `is_locked`, `faculty`, `point_wallet`, `created_at`, `phone`, `chi_doan`, `cohort`) VALUES
(3, 'HTTT2311017', 'Lưu Nhật Đông', 'lndonghttt2311017@student.ctuet.edu.vn\n', '/uploads/1782221215140-666932524.png', '123456', 'admin', 0, 'Hệ thống Thông tin', 120, '2025-10-15 01:10:00', '0923456789', 'HTTT Khóa 2023', NULL),
(31, 'HTTT2311052', 'Nguyễn Minh Anh Tuấn', 'nmatuanhttt2311052@student.ctuet.edu.vn', 'uploads/avatars/21578cef8b79596cca2975af69d0c745.jpg', '$2b$10$YmPGRUJM654EPby1DONYruSVcnqnj3CUm.Be9JpJ7H6l6AK.s3khS', 'admin', 0, 'Hệ thống Thông tin', 30, '2026-06-09 17:13:52', '01010101', 'HTTT2311', NULL),
(32, 'HTTT2311043', 'Nguyễn Anh Kiệt', 'nakiethttt2311043@student.ctuet.edu.vn', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(33, 'HTTT2311014', 'Bùi Thành Long', 'btlonghttt2311014@student.ctuet.edu.vn', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(34, 'HTTT2311053', 'Trần Thị Ngọc Mỹ', 'tranthingocmy92nd@gmail.com', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(35, 'HTTT2311010', 'Hồ Minh Thiện', 'thienvcf@gmail.com', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(36, 'HTTT2311042', 'Huỳnh Nguyên Toàn', 'hntoanhttt2311042@student.ctuet.edu.vn', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(37, 'HTTT2311004', 'Nguyễn Đức Lương', 'ndluonghttt2311004@student.ctuet.edu.vn', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(38, 'HTTT2311019', 'Quách Thành Danh', 'mrthanhdanh2005@gmail.com', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(39, 'HTTT2311054', 'Đỗ Quốc Đạt', 'doquocdatmxst@gmail.com', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(40, 'HTTT2311047', 'Đinh Thị Thu Cúc', 'dttcuchttt2311047@student.ctuet.edu.vn', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(41, 'HTTT2311007', 'Ngô Thị Anh Thư', 'ngothianhthu2005ck@gmail.com', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(42, 'HTTT2311032', 'Liễu Hiếu Nhi', 'lhnhihttt2311032@student.ctuet.edu.vn', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(43, 'HTTT2311013', 'Nguyễn Trần An Khang', 'ntakhanghttt2311013@student.ctuet.edu.vn', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(44, 'HTTT2311038', 'Trần Thanh Hương', 'tranthanhhuong07102005@gmail.com', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(45, 'HTTT2311055', 'Nguyễn Trung Hậu', 'nthauhttt2311055@student.ctuet.edu.vn', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(46, 'HTTT2311026', 'Đỗ Nguyễn Minh Thư', 'donguyenminhthutt2021@gmail.com', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(47, 'HTTT2311024', 'Nguyễn Vũ Khang', 'nvkhanghttt2311024@student.ctuet.edu.vn', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(48, 'HTTT2311022', 'Nguyễn Thị Thùy Trang', 'ntttranghttt2311022@student.ctuet.edu.vn', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(49, 'HTTT2311016', 'Doan Thanh Long', 'doanthanhl399@gmail.com', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(50, 'HTTT2311051', 'Trần Quỳnh Mai', 'trankhanh300781@gmail.com', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(51, 'HTTT2311046', 'Trần Thiên Phú', 'ttphuhttt2311046@student.ctuet.edu.vn', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(52, 'HTTT2311008', 'Lê Hồ Quang Thông', 'lhqthonghttt2311008@student.ctuet.edu.vn', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(53, 'HTTT2311018', 'Phan Đặng Đức Nguyên', 'ducnguyen612005@gmail.com', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(54, 'HTTT2311033', 'Nguyễn Lâm Quang Hà', 'nlqhahttt2311033@student.ctuet.edu.vn', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(55, 'HTTT2311049', 'Nguyễn Ngọc Nhi', 'nnnhihttt2311049@student.ctuet.edu.vn', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(56, 'HTTT2311036', 'Nguyễn Hữu Hào', 'nhhaohttt2311036@student.ctuet.edu.vn', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(57, 'HTTT2311048', 'Nguyễn Thị Cẩm Tiên', 'tiennguyenthicam1905@gmail.com', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(58, 'HTTT2311029', 'Võ Quốc Vinh', 'vqvinhhttt2311029@student.ctuet.edu.vn', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(59, 'HTTT2311057', 'Phạm Thúy Huỳnh', 'phamthuyhuynh0101.st@gmail.com', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(60, 'HTTT2311011', 'Phan Trần Minh Khuê', 'minhkhuephantran65@gmail.com', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(61, 'HTTT2311020', 'NGUYỄN ĐẬU TUỆ KHƯƠNG', 'nguyendautuekhuongln@gmail.com', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(62, 'HTTT2311037', 'Nguyễn Trần Duy Khang', 'ntdkhanghttt2311037@student.ctuet.edu.vn', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(63, 'HTTT2311021', 'Huỳnh Nguyễn Xuân Thi', 'xuanthi2020cm@gmail.com', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(64, 'HTTT2311058', 'Huỳnh Thị Bảo Hân', 'htbhanhttt2311058@student.ctuet.edu.vn', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(65, 'HTTT2311045', 'Trần Quốc Hùng', 'tqhunghttt2311045@student.ctuet.edu.vn', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(66, 'HTTT2311060', 'Võ Hoàng Nhã', 'vhnhahttt2311060@student.ctuet.edu.vn', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(67, 'HTTT2311066', 'Hoàng Thị Ngọc Mai', 'htnmaihttt2311066@student.ctuet.edu.vn', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(68, 'HTTT2311056', 'PHẠM VĂN TẤN PHƯỚC', 'pvtp.clx@gmail.com', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(69, 'HTTT2311039', 'Nguyễn Đắc Nhân', 'ndnhanhttt2311039@student.ctuet.edu.vn', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(70, 'HTTT2311009', 'Huỳnh Gia Tuấn', 'huynhgiatuan7105@gmail.com', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(71, 'HTTT2311023', 'Bùi Hữu Lộc', 'huulocbui48@gmail.com', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(72, 'HTTT2311015', 'Hồ Trần Phương Anh', 'htpanhhttt2311015@student.ctuet.edu.vn', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(73, 'HTTT2311061', 'Nguyễn Ngọc Tường Vy', 'nntvyhttt2311061@student.ctuet.edu.vn', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(74, 'HTTT2311030', 'Phan Thiện Nhân', 'phanthiennhan3007@gmail.com', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(75, 'HTTT2311062', 'Lý Minh Lộc', 'minhloc20052005@gmail.com', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(76, 'HTTT2311064', 'Trần Ngọc Ẩn', 'tnanhttt2311064@student.ctuet.edu.vn', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(77, 'HTTT2311040', 'Phạm Hoàng Thiện', 'phthienhttt2311040@student.ctuet.edu.vn', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(78, 'HTTT2311006', 'Bùi Diệp Ngọc Hân', 'bdnhanhttt2311006@student.ctuet.edu.vn', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(79, 'HTTT2311012', 'Trần Thị Huyền Trân', 'tthtranhttt2311012@student.ctuet.edu.vn', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(80, 'HTTT2311025', 'Trần Toàn Phát', 'ttphathttt2311025@student.ctuet.edu.vn', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(81, 'HTTT2311063', 'Kha Minh Khang', 'kmkhanghttt2311063@student.ctuet.edu.vn', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(82, 'HTTT2311041', 'Đặng Khánh Hoà', 'dkhoahttt2311041@student.ctuet.edu.vn', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(83, 'HTTT2311069', 'Lê Nhật Trường', 'lntruonghttt2311069@student.ctuet.edu.vn', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(84, 'HTTT2311065', 'Nguyễn Vũ Hà', 'nguyenduuha@gmail.com', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL),
(85, 'HTTT2311067', 'Phạm Thị Khánh Vy', 'phamthikhanhvy120125@gmail.com', NULL, '123456', 'student', 0, 'Hệ thống Thông tin', 0, '2026-06-23 13:20:28', NULL, 'HTTT Khóa 2023', NULL);

--
-- Chỉ mục cho các bảng đã đổ
--

--
-- Chỉ mục cho bảng `attendance`
--
ALTER TABLE `attendance`
  ADD PRIMARY KEY (`id`),
  ADD KEY `student_id` (`student_id`);

--
-- Chỉ mục cho bảng `criteria`
--
ALTER TABLE `criteria`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `events`
--
ALTER TABLE `events`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `event_attendances`
--
ALTER TABLE `event_attendances`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `event_registrations`
--
ALTER TABLE `event_registrations`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `location_presets`
--
ALTER TABLE `location_presets`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `proofs`
--
ALTER TABLE `proofs`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `student_criteria_points`
--
ALTER TABLE `student_criteria_points`
  ADD PRIMARY KEY (`id`),
  ADD KEY `criteria_id` (`criteria_id`);

--
-- Chỉ mục cho bảng `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `mssv` (`mssv`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT cho các bảng đã đổ
--

--
-- AUTO_INCREMENT cho bảng `attendance`
--
ALTER TABLE `attendance`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

--
-- AUTO_INCREMENT cho bảng `criteria`
--
ALTER TABLE `criteria`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT cho bảng `event_attendances`
--
ALTER TABLE `event_attendances`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT cho bảng `event_registrations`
--
ALTER TABLE `event_registrations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=73;

--
-- AUTO_INCREMENT cho bảng `location_presets`
--
ALTER TABLE `location_presets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT cho bảng `student_criteria_points`
--
ALTER TABLE `student_criteria_points`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT cho bảng `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=92;

--
-- Các ràng buộc cho các bảng đã đổ
--

--
-- Các ràng buộc cho bảng `student_criteria_points`
--
ALTER TABLE `student_criteria_points`
  ADD CONSTRAINT `student_criteria_points_ibfk_1` FOREIGN KEY (`criteria_id`) REFERENCES `criteria` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
