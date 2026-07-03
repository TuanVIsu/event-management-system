-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: May 17, 2026 at 06:22 AM
-- Server version: 8.0.43
-- PHP Version: 8.3.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `vieclamctut`
--

-- --------------------------------------------------------

--
-- Table structure for table `applications`
--

DROP TABLE IF EXISTS `applications`;
CREATE TABLE IF NOT EXISTS `applications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `job_post_id` int NOT NULL,
  `cv_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Đường dẫn file CV (PDF)',
  `cover_letter` text COLLATE utf8mb4_unicode_ci COMMENT 'Thư giới thiệu',
  `status` enum('submitted','reviewing','interviewing','accepted','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'submitted',
  `company_note` text COLLATE utf8mb4_unicode_ci COMMENT 'Ghi chú của doanh nghiệp',
  `interview_at` datetime DEFAULT NULL,
  `interview_location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `interview_note` text COLLATE utf8mb4_unicode_ci,
  `applied_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_application` (`student_id`,`job_post_id`),
  KEY `job_post_id` (`job_post_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `applications`
--

INSERT INTO `applications` (`id`, `student_id`, `job_post_id`, `cv_path`, `cover_letter`, `status`, `company_note`, `interview_at`, `interview_location`, `interview_note`, `applied_at`, `updated_at`) VALUES
(1, 7, 1, 'uploads/cv/69a64e98dfb3f_1772506776.pdf', '', 'submitted', NULL, NULL, NULL, NULL, '2026-03-03 09:59:36', '2026-03-03 09:59:36'),
(2, 5, 3, 'uploads/cv/69b956a1eea06_1773754017.pdf', 'do trường CTUT giới thiệu', 'accepted', '', NULL, NULL, NULL, '2026-03-17 20:26:57', '2026-04-20 15:05:58'),
(3, 5, 2, 'uploads/cv/69cb3489b5e6a_1774924937.pdf', '', 'submitted', NULL, NULL, NULL, NULL, '2026-03-31 09:42:17', '2026-03-31 09:42:17'),
(4, 5, 8, 'uploads/cv/auto/auto_cv_u5_20260420_162812_f99818.pdf', '', 'submitted', NULL, NULL, NULL, NULL, '2026-04-20 16:28:12', '2026-04-20 16:28:12');

-- --------------------------------------------------------

--
-- Table structure for table `chat_conversations`
--

DROP TABLE IF EXISTS `chat_conversations`;
CREATE TABLE IF NOT EXISTS `chat_conversations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `company_id` int NOT NULL,
  `last_message_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_conversation` (`student_id`,`company_id`),
  KEY `idx_conv_student` (`student_id`),
  KEY `idx_conv_company` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `chat_messages`
--

DROP TABLE IF EXISTS `chat_messages`;
CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `conversation_id` int NOT NULL,
  `sender_user_id` int NOT NULL,
  `sender_role` varchar(20) NOT NULL,
  `message_text` text NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `read_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_msg_conv` (`conversation_id`,`created_at`),
  KEY `idx_msg_sender` (`sender_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `companies`
--

DROP TABLE IF EXISTS `companies`;
CREATE TABLE IF NOT EXISTS `companies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `industry` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `logo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `admin_note` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `companies`
--

INSERT INTO `companies` (`id`, `user_id`, `name`, `industry`, `description`, `logo`, `website`, `address`, `phone`, `contact_email`, `status`, `admin_note`, `created_at`, `updated_at`) VALUES
(1, 3, 'FPT Software', 'Công nghệ thông tin', 'FPT Software là công ty phần mềm hàng đầu Việt Nam, cung cấp dịch vụ outsourcing và giải pháp CNTT.', NULL, 'https://www.fpt-software.com', 'Lô T2, đường D1, Khu CNC, Q.9, TP.HCM', '028 7300 7300', 'hr@fpt.com.vn', 'approved', NULL, '2026-02-28 13:39:17', '2026-02-28 13:39:17'),
(2, 6, 'Công ty Test hé', 'Công nghệ', 'Tài khoản doanh nghiệp để test hệ thống.', 'uploads/logos/69b92c250ff43_1773743141.png', '', 'Cần thơ', '', '', 'approved', NULL, '2026-02-28 14:44:22', '2026-03-17 17:30:48');

-- --------------------------------------------------------

--
-- Table structure for table `company_follows`
--

DROP TABLE IF EXISTS `company_follows`;
CREATE TABLE IF NOT EXISTS `company_follows` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `company_id` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_follow` (`student_id`,`company_id`),
  KEY `idx_follow_student` (`student_id`),
  KEY `idx_follow_company` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `company_update_requests`
--

DROP TABLE IF EXISTS `company_update_requests`;
CREATE TABLE IF NOT EXISTS `company_update_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int NOT NULL,
  `user_id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `industry` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `website` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `phone` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `contact_email` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `requested_logo` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_general_ci DEFAULT 'pending',
  `admin_note` text COLLATE utf8mb4_general_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `company_update_requests`
--

INSERT INTO `company_update_requests` (`id`, `company_id`, `user_id`, `name`, `industry`, `description`, `website`, `address`, `phone`, `contact_email`, `requested_logo`, `status`, `admin_note`, `created_at`) VALUES
(1, 2, 6, 'Công ty Bhjbd vhjf b', 'Công nghệ thông tin', 'Tài khoản doanh nghiệp để test hệ thống.', NULL, 'Cần thơ', NULL, NULL, 'uploads/logos/69b8cc74e0f14_1773718644.png', 'approved', '', '2026-03-17 03:37:24'),
(2, 2, 6, 'Công ty Test hé', 'Công nghệ', 'Tài khoản doanh nghiệp để test hệ thống.', NULL, 'Cần thơ', NULL, NULL, NULL, 'approved', '', '2026-03-17 10:25:11');

-- --------------------------------------------------------

--
-- Table structure for table `events`
--

DROP TABLE IF EXISTS `events`;
CREATE TABLE IF NOT EXISTS `events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_date` datetime NOT NULL,
  `end_date` datetime DEFAULT NULL,
  `location` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `image` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `max_participants` int DEFAULT NULL,
  `created_by` int NOT NULL,
  `status` enum('upcoming','ongoing','completed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'upcoming',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `events`
--

INSERT INTO `events` (`id`, `title`, `description`, `event_date`, `end_date`, `location`, `image`, `max_participants`, `created_by`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Hội thảo: Xu hướng AI trong doanh nghiệp', 'Hội thảo chia sẻ về ứng dụng trí tuệ nhân tạo trong doanh nghiệp, cơ hội việc làm cho sinh viên CNTT.', '2026-04-15 08:00:00', '2026-04-15 12:00:00', 'Hội trường A - Trường ĐH Kỹ thuật Cần Thơ', NULL, 200, 1, 'upcoming', '2026-02-28 13:39:17', '2026-02-28 13:39:17'),
(2, 'Ngày hội việc làm CNTT 2026', 'Kết nối sinh viên với các doanh nghiệp CNTT hàng đầu. Cơ hội phỏng vấn trực tiếp.', '2026-05-20 07:30:00', '2026-05-20 17:00:00', 'Sân trường - Trường ĐH Kỹ thuật Cần Thơ', NULL, 500, 1, 'upcoming', '2026-02-28 13:39:17', '2026-02-28 13:39:17');

-- --------------------------------------------------------

--
-- Table structure for table `event_registrations`
--

DROP TABLE IF EXISTS `event_registrations`;
CREATE TABLE IF NOT EXISTS `event_registrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `event_id` int NOT NULL,
  `student_id` int NOT NULL,
  `registered_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_registration` (`event_id`,`student_id`),
  KEY `student_id` (`student_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `event_registrations`
--

INSERT INTO `event_registrations` (`id`, `event_id`, `student_id`, `registered_at`) VALUES
(1, 2, 6, '2026-03-17 10:31:29');

-- --------------------------------------------------------

--
-- Table structure for table `job_interactions`
--

DROP TABLE IF EXISTS `job_interactions`;
CREATE TABLE IF NOT EXISTS `job_interactions` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id` bigint UNSIGNED DEFAULT NULL,
  `job_post_id` bigint UNSIGNED NOT NULL,
  `interaction_type` enum('view','click','save') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'view',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `job_interactions_student_id_index` (`student_id`),
  KEY `job_interactions_job_post_id_index` (`job_post_id`),
  KEY `job_interactions_type_index` (`interaction_type`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `job_interactions`
--

INSERT INTO `job_interactions` (`id`, `student_id`, `job_post_id`, `interaction_type`, `created_at`, `updated_at`) VALUES
(1, 5, 14, 'view', '2026-05-17 05:33:53', NULL),
(2, 5, 14, 'view', '2026-05-17 05:34:19', NULL),
(3, 5, 14, 'view', '2026-05-17 05:34:37', NULL),
(4, 5, 14, 'view', '2026-05-17 05:34:50', NULL),
(5, 5, 13, 'view', '2026-05-17 05:34:55', NULL),
(6, 5, 10, 'view', '2026-05-17 05:48:48', NULL),
(7, 5, 13, 'view', '2026-05-17 06:02:34', NULL),
(8, 5, 13, 'view', '2026-05-17 06:02:40', NULL),
(9, NULL, 14, 'view', '2026-05-17 06:08:41', NULL),
(10, NULL, 14, 'view', '2026-05-17 06:08:41', NULL),
(11, NULL, 14, 'view', '2026-05-17 06:10:21', NULL),
(12, 4, 14, 'view', '2026-05-17 06:11:42', NULL),
(13, 5, 13, 'view', '2026-05-17 06:13:39', NULL),
(14, 5, 13, 'view', '2026-05-17 06:13:52', NULL),
(15, 5, 14, 'view', '2026-05-17 06:15:05', NULL),
(16, NULL, 13, 'view', '2026-05-17 06:15:48', NULL),
(17, 5, 14, 'view', '2026-05-17 06:16:12', NULL),
(18, 5, 3, 'view', '2026-05-17 06:16:31', NULL),
(19, 5, 14, 'view', '2026-05-17 06:16:48', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `job_posts`
--

DROP TABLE IF EXISTS `job_posts`;
CREATE TABLE IF NOT EXISTS `job_posts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `requirements` text COLLATE utf8mb4_unicode_ci,
  `skills` text COLLATE utf8mb4_unicode_ci,
  `type` enum('job','internship') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'job',
  `work_mode` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `experience_level` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `industry` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `salary` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Mức lương (text)',
  `salary_min` int DEFAULT NULL,
  `salary_max` int DEFAULT NULL,
  `location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `slots` int DEFAULT '1' COMMENT 'Số lượng tuyển',
  `deadline` date NOT NULL,
  `status` enum('open','closed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `views` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `company_id` (`company_id`),
  KEY `idx_status` (`status`),
  KEY `idx_type` (`type`),
  KEY `idx_deadline` (`deadline`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `job_posts`
--

INSERT INTO `job_posts` (`id`, `company_id`, `title`, `description`, `requirements`, `skills`, `type`, `work_mode`, `experience_level`, `industry`, `salary`, `salary_min`, `salary_max`, `location`, `slots`, `deadline`, `status`, `views`, `created_at`, `updated_at`) VALUES
(1, 1, 'Thực tập sinh PHP Developer', 'Tham gia phát triển các dự án web sử dụng PHP/Laravel tại FPT Software.', 'Sinh viên năm 3-4 ngành CNTT\nCó kiến thức PHP, MySQL\nTiếng Anh đọc hiểu tài liệu', NULL, 'internship', NULL, NULL, 'Công nghệ thông tin', 'Thỏa thuận', NULL, NULL, 'TP. Hồ Chí Minh', 5, '2026-06-30', 'open', 19, '2026-02-28 13:39:17', '2026-05-13 15:10:00'),
(2, 1, 'Junior Java Developer', 'Phát triển và bảo trì các ứng dụng Java cho khách hàng quốc tế.', 'Tốt nghiệp đại học ngành CNTT\nCó kiến thức Java, Spring Boot\nTiếng Anh giao tiếp', NULL, 'job', NULL, NULL, 'Công nghệ thông tin', '10-15 triệu', NULL, NULL, 'TP. Hồ Chí Minh', 3, '2026-05-31', 'open', 9, '2026-02-28 13:39:17', '2026-05-12 14:04:09'),
(3, 2, 'tuyển dụng thực tập xinhhhh', 'làm việc 8 tiếng/ngày\r\n...', 'các sinh viên hoặc ứng viên có nhu cầu thực tập và cần làm để có kinh nghiệm', NULL, 'internship', NULL, NULL, 'Công nghệ thông tin', 'thỏa thuận', NULL, NULL, 'Cần thơ', 100, '2026-03-31', 'open', 16, '2026-03-17 20:25:48', '2026-05-17 13:16:31'),
(4, 2, 'test', 'test', '', NULL, 'job', NULL, NULL, 'Công nghệ', '', NULL, NULL, 'Cần thơ', 1, '2026-11-11', 'open', 1, '2026-04-20 15:07:14', '2026-04-20 15:07:38'),
(5, 2, '[TEST SKILL] Backend PHP Laravel', 'Phat trien API va he thong backend cho nen tang viec lam sinh vien.', 'PHP, Laravel, MySQL, REST API, Git, Tiếng Anh bậc 3', NULL, 'job', NULL, NULL, 'Cong nghe thong tin', '12-18 trieu', NULL, NULL, 'Can Tho', 3, '2026-07-19', 'open', 3, '2026-04-20 15:26:59', '2026-05-17 13:15:19'),
(6, 2, '[TEST SKILL] Frontend React TypeScript', 'Xay dung giao dien web va toi uu trai nghiem nguoi dung.', 'React, TypeScript, JavaScript, HTML/CSS, Bootstrap, Git', NULL, 'job', NULL, NULL, 'Cong nghe thong tin', '10-16 trieu', NULL, NULL, 'Can Tho', 2, '2026-07-19', 'open', 2, '2026-04-20 15:26:59', '2026-05-13 16:05:39'),
(7, 2, '[TEST SKILL] Java Spring Boot API', 'Phat trien dich vu backend tren he thong microservice.', 'Java, Spring Boot, PostgreSQL, REST API, Docker, Git', NULL, 'job', NULL, NULL, 'Cong nghe thong tin', '13-20 trieu', NULL, NULL, 'Remote/Can Tho', 2, '2026-07-19', 'open', 2, '2026-04-20 15:26:59', '2026-05-14 14:37:10'),
(8, 2, '[TEST SKILL] C# ASP.NET Core Developer', 'Lam viec voi he thong quan ly noi bo va dashboard doanh nghiep.', 'C#, ASP.NET Core, SQL Server, Docker, Testing/QA', NULL, 'job', NULL, NULL, 'Cong nghe thong tin', '12-19 trieu', NULL, NULL, 'Can Tho', 2, '2026-07-19', 'open', 2, '2026-04-20 15:26:59', '2026-05-12 14:07:19'),
(9, 2, '[TEST SKILL] Node.js REST API', 'Xay dung va van hanh REST API cho ung dung web.', 'Node.js, JavaScript, MongoDB, REST API, Docker, Git', NULL, 'job', NULL, NULL, 'Cong nghe thong tin', '11-17 trieu', NULL, NULL, 'Can Tho', 2, '2026-07-19', 'open', 2, '2026-04-20 15:26:59', '2026-05-14 14:37:14'),
(10, 2, '[TEST SKILL] Data Analysis Intern', 'Phan tich du lieu ung vien va xu huong tuyen dung.', 'Python, Data Analysis, Machine Learning, PostgreSQL, Tiếng Anh bậc 4', NULL, 'internship', NULL, NULL, 'Phan tich du lieu', '4-7 trieu', NULL, NULL, 'Can Tho', 3, '2026-07-19', 'open', 1, '2026-04-20 15:26:59', '2026-05-17 13:15:19'),
(11, 2, '[TEST SKILL] UI/UX Designer', 'Thiet ke wireframe, prototype va toi uu hanh trinh nguoi dung.', 'UI/UX, HTML/CSS, JavaScript, Bootstrap', NULL, 'job', NULL, NULL, 'Thiet ke san pham', '9-14 trieu', NULL, NULL, 'Can Tho', 2, '2026-07-19', 'open', 0, '2026-04-20 15:26:59', '2026-04-20 15:26:59'),
(12, 2, '[TEST SKILL] QA Engineer', 'Dam bao chat luong phan mem qua test case va regression test.', 'Testing/QA, JavaScript, REST API, Git', NULL, 'job', NULL, NULL, 'Kiem thu phan mem', '9-13 trieu', NULL, NULL, 'Can Tho', 2, '2026-07-19', 'open', 0, '2026-04-20 15:26:59', '2026-04-20 15:26:59'),
(13, 2, '[TEST SKILL] Fullstack Vue + PHP', 'Phat trien fullstack cho cong cu quan tri tuyen dung.', 'Vue.js, PHP, MySQL, REST API, Docker, Git, Tiếng Anh bậc 5', NULL, 'job', NULL, NULL, 'Cong nghe thong tin', '12-18 trieu', NULL, NULL, 'Can Tho', 2, '2026-07-19', 'open', 3, '2026-04-20 15:26:59', '2026-05-17 13:15:48'),
(14, 2, '[TEST SKILL] Angular Frontend Intern', 'Tham gia phat trien module frontend cho portal viec lam.', 'Angular, TypeScript, HTML/CSS, Git', NULL, 'internship', NULL, NULL, 'Cong nghe thong tin', '4-8 trieu', NULL, NULL, 'Can Tho', 2, '2026-07-19', 'open', 6, '2026-04-20 15:26:59', '2026-05-17 13:11:42');

-- --------------------------------------------------------

--
-- Table structure for table `job_reports`
--

DROP TABLE IF EXISTS `job_reports`;
CREATE TABLE IF NOT EXISTS `job_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_post_id` int NOT NULL,
  `reporter_user_id` int NOT NULL,
  `reason` varchar(100) NOT NULL,
  `details` text,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` datetime DEFAULT NULL,
  `resolver_user_id` int DEFAULT NULL,
  `resolver_note` text,
  PRIMARY KEY (`id`),
  KEY `idx_report_job` (`job_post_id`),
  KEY `idx_report_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `type` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `message` text COLLATE utf8mb4_general_ci,
  `url` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `meta_json` text COLLATE utf8mb4_general_ci,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `read_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notif_user_created` (`user_id`,`created_at`),
  KEY `idx_notif_user_read` (`user_id`,`is_read`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `user_id`, `type`, `title`, `message`, `url`, `meta_json`, `is_read`, `read_at`, `created_at`) VALUES
(1, 5, 'application_status', 'Cập nhật hồ sơ ứng tuyển', 'Vị trí: tuyển dụng thực tập xinhhhh | Trạng thái: Đạt', '/NCKH/portal/student/applications.php', NULL, 1, '2026-04-20 18:00:36', '2026-04-20 15:05:58'),
(2, 4, 'new_job', 'Tin tuyen dung moi: test', 'Doanh nghiep: Công ty Test hé', '/NCKH/portal/jobs/detail.php?id=4', NULL, 0, NULL, '2026-04-20 15:07:14'),
(3, 5, 'new_job', 'Tin tuyen dung moi: test', 'Doanh nghiep: Công ty Test hé', '/NCKH/portal/jobs/detail.php?id=4', NULL, 1, '2026-04-20 18:00:36', '2026-04-20 15:07:14'),
(4, 7, 'new_job', 'Tin tuyen dung moi: test', 'Doanh nghiep: Công ty Test hé', '/NCKH/portal/jobs/detail.php?id=4', NULL, 0, NULL, '2026-04-20 15:07:14'),
(5, 6, 'new_application', 'Bạn có hồ sơ ứng tuyển mới', 'Vị trí: [TEST SKILL] C# ASP.NET Core Developer', '/NCKH/portal/company/applicants.php?job_id=8', NULL, 1, '2026-04-20 17:57:06', '2026-04-20 16:28:12');

-- --------------------------------------------------------

--
-- Table structure for table `password_resets`
--

DROP TABLE IF EXISTS `password_resets`;
CREATE TABLE IF NOT EXISTS `password_resets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_email` (`email`),
  KEY `idx_token` (`token`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `password_resets`
--

INSERT INTO `password_resets` (`id`, `email`, `token`, `expires_at`, `created_at`) VALUES
(2, 'sinhvien', '74c8991decb06a17a2cf23c4a76b96fd', NULL, '2026-03-17 19:59:28'),
(4, 'ndnhanhttt2311039@student.ctuet.edu.vn', 'e90201d34d5198f2590f05cee5d0d2d95aedd578281009ca5ec933c9a930be0b', '2026-04-20 16:08:41', '2026-04-20 15:08:41');

-- --------------------------------------------------------

--
-- Table structure for table `saved_jobs`
--

DROP TABLE IF EXISTS `saved_jobs`;
CREATE TABLE IF NOT EXISTS `saved_jobs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `job_post_id` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_saved_job` (`student_id`,`job_post_id`),
  KEY `idx_saved_student` (`student_id`),
  KEY `idx_saved_job` (`job_post_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `saved_jobs`
--

INSERT INTO `saved_jobs` (`id`, `student_id`, `job_post_id`, `created_at`) VALUES
(2, 5, 14, '2026-04-20 20:08:52');

-- --------------------------------------------------------

--
-- Table structure for table `search_tags`
--

DROP TABLE IF EXISTS `search_tags`;
CREATE TABLE IF NOT EXISTS `search_tags` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `tag_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tag_type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `search_tags`
--

INSERT INTO `search_tags` (`id`, `tag_name`, `tag_type`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Lập trình viên PHP', 'position', 1, NULL, NULL),
(2, 'Frontend Developer', 'position', 1, NULL, NULL),
(4, 'Fullstack Developer', 'position', 1, NULL, NULL),
(5, 'Thực tập sinh Web', 'position', 1, NULL, NULL),
(6, 'Chuyên viên Hệ thống', 'position', 1, NULL, NULL),
(7, 'Quản trị mạng', 'position', 1, NULL, NULL),
(8, 'Chuyên viên An toàn thông tin', 'position', 1, NULL, NULL),
(9, 'Thiết kế đồ họa / UI-UX', 'position', 1, NULL, NULL),
(10, 'Kiểm thử phần mềm (Tester)', 'position', 1, NULL, NULL),
(11, 'Hệ thống thông tin', 'industry', 1, NULL, NULL),
(12, 'Công nghệ phần mềm', 'industry', 1, NULL, NULL),
(13, 'An toàn thông tin', 'industry', 1, NULL, NULL),
(14, 'Mạng máy tính & Truyền thông', 'industry', 1, NULL, NULL),
(16, 'IT', 'industry', 1, NULL, NULL),
(17, 'IT', 'position', 1, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `student_profiles`
--

DROP TABLE IF EXISTS `student_profiles`;
CREATE TABLE IF NOT EXISTS `student_profiles` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` bigint UNSIGNED NOT NULL,
  `student_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `major` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `year` decimal(3,1) DEFAULT NULL,
  `class_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bio` text COLLATE utf8mb4_unicode_ci,
  `cv_title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cv_education` text COLLATE utf8mb4_unicode_ci,
  `cv_experience` text COLLATE utf8mb4_unicode_ci,
  `cv_projects` text COLLATE utf8mb4_unicode_ci,
  `gpa` decimal(3,2) DEFAULT NULL,
  `avatar` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `skills` text COLLATE utf8mb4_unicode_ci,
  `other_skills` text COLLATE utf8mb4_unicode_ci,
  `experience` text COLLATE utf8mb4_unicode_ci,
  `cv_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `student_profiles_user_id_unique` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `student_profiles`
--

INSERT INTO `student_profiles` (`id`, `user_id`, `student_code`, `major`, `year`, `class_name`, `phone`, `address`, `bio`, `cv_title`, `cv_education`, `cv_experience`, `cv_projects`, `gpa`, `avatar`, `skills`, `other_skills`, `experience`, `cv_path`, `created_at`, `updated_at`) VALUES
(1, 9, 'HTTT2311052', '<br /><b>Warning</b>: Trying to access array offset on value of type bool in <b>C:\\xampp\\htdocs\\NCKH\\portal\\student\\profile.php</b> on line <b>208</b><br />', NULL, NULL, '', '', '4', '', 'qeqe', 'qeqe', '', 3.00, 'uploads/avatars/6a0817a9c4b11_1778915241.jpg', 'Laravel, C#, Vue.js, TypeScript, Data Analysis, Machine Learning, Tiếng Anh bậc 4', '', NULL, NULL, NULL, NULL),
(2, 5, 'HTTT2311039', 'Hệ thống thông tin', NULL, NULL, '', '', '', '', '', '', '', 0.00, 'uploads/avatars/6a0955a3e54e7_1778996643.jpg', 'MySQL, SQL Server, PHP, TypeScript, Docker, Testing/QA, UI/UX, Data Analysis, Tiếng Anh bậc 3, Tiếng Anh bậc 4, Tiếng Anh bậc 5, C#, Python, Node.js, REST API, Spring Boot', '', NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('admin','company','student','lecturer') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'student',
  `google_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `auth_provider` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'local',
  `email_verified` tinyint(1) NOT NULL DEFAULT '0',
  `verify_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `google_id`, `avatar_url`, `auth_provider`, `email_verified`, `verify_token`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Admin Khoa CNTT', 'admin', '$2y$10$fMHxiO5PJLL5rIIAZieCmembln6KoPUGOPleuEJ2JO.XBoUwMlilC', 'admin', NULL, NULL, 'local', 1, NULL, 1, '2026-02-28 13:39:17', '2026-02-28 14:44:22'),
(2, 'TS. Nguyễn Văn A', 'nguyenvana@ctuet.edu.vn', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'lecturer', NULL, NULL, 'local', 1, NULL, 1, '2026-02-28 13:39:17', '2026-02-28 13:39:17'),
(3, 'Công ty FPT Software', 'hr@fpt.com.vn', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'company', NULL, NULL, 'local', 1, NULL, 1, '2026-02-28 13:39:17', '2026-02-28 13:39:17'),
(4, 'Trần Văn B', 'tranvanb@student.ctuet.edu.vn', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student', NULL, NULL, 'local', 1, NULL, 1, '2026-02-28 13:39:17', '2026-02-28 13:39:17'),
(5, 'Nguyễn Đắc Nhân', 'ndnhanhttt2311039@student.ctuet.edu.vn', NULL, 'student', '105565947643102082624', 'https://lh3.googleusercontent.com/a/ACg8ocKYHau4nIfQR2i8-1m5zGHSsihz8Vk_ZMDsaQZy9FiyoCeAjA=s96-c', 'google', 1, NULL, 1, '2026-02-28 13:56:30', '2026-04-20 19:32:44'),
(6, 'Doanh nghiệp Test', 'doanhnghiep', '$2y$10$fMHxiO5PJLL5rIIAZieCmembln6KoPUGOPleuEJ2JO.XBoUwMlilC', 'company', NULL, NULL, 'local', 1, NULL, 1, '2026-02-28 14:44:22', '2026-02-28 14:45:43'),
(7, 'Sinh viên Test', 'sinhvien', '$2y$10$45hibr2KeI9tzm/i6NzCKuYNK3aylhpYyUB.fudWEoMjpM9vEwGZC', 'student', NULL, NULL, 'local', 1, NULL, 1, '2026-03-03 09:01:22', '2026-03-03 09:03:02'),
(9, 'Tuna', 'nmatuanhttt2311052@student.ctuet.edu.vn', NULL, 'student', '100663235154031478094', 'https://lh3.googleusercontent.com/a/ACg8ocJAKrtsyq3mw9vX7y4MuZVnQSWQDIxqftA9pOSOss0Z8K3975Q=s96-c', 'google', 1, NULL, 1, '2026-05-13 13:05:50', '2026-05-14 14:27:05');

--
-- Constraints for dumped tables
--

--
-- Constraints for table `applications`
--
ALTER TABLE `applications`
  ADD CONSTRAINT `applications_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `applications_ibfk_2` FOREIGN KEY (`job_post_id`) REFERENCES `job_posts` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `companies`
--
ALTER TABLE `companies`
  ADD CONSTRAINT `companies_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `events`
--
ALTER TABLE `events`
  ADD CONSTRAINT `events_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `event_registrations`
--
ALTER TABLE `event_registrations`
  ADD CONSTRAINT `event_registrations_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `event_registrations_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `job_posts`
--
ALTER TABLE `job_posts`
  ADD CONSTRAINT `job_posts_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
