<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

header("Content-Type: application/json; charset=UTF-8");

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "quanlysukien3";

try {
    $conn = new PDO("mysql:host=$servername;dbname=$dbname;charset=utf8mb4", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $json = file_get_contents("php://input");
    $data = json_decode($json);

    if (!isset($data->email) || !isset($data->name)) {
        echo json_encode(["status" => "error", "message" => "Thiếu dữ liệu gửi lên"]);
        exit();
    }

    $email = trim($data->email);
    $full_name = trim($data->name);
    $avatar = isset($data->avatar) ? trim($data->avatar) : '';
    
    // =========================================================
    // TRÍCH XUẤT THÔNG MINH MSSV, CHI ĐOÀN VÀ NGÀNH BẰNG REGEX
    // =========================================================
    $mssv = strtoupper(explode('@', $email)[0]); // Dự phòng nếu không khớp regex
    $chi_doan = 'Chưa xếp lớp';
    $faculty = 'Chưa cập nhật';

    // Regex: Tìm 4 chữ cái + 7 chữ số nằm ngay sát chữ @ (VD: httt2311052@...)
    if (preg_match('/([a-zA-Z]{4})(\d{7})@/', $email, $matches)) {
        $nganhCode = strtoupper($matches[1]); // Lấy được chữ 'HTTT'
        $soMssv = $matches[2];                // Lấy được số '2311052'
        
        $mssv = $nganhCode . $soMssv;         // Ghép lại thành: HTTT2311052
        $chi_doan = $nganhCode . substr($soMssv, 0, 4); // Ghép lại thành: HTTT2311
        
        // Tự động map tên Khoa/Ngành
        if ($nganhCode === 'HTTT') $faculty = 'Hệ thống Thông tin';
        elseif ($nganhCode === 'KTPM') $faculty = 'Kỹ thuật Phần mềm';
        elseif ($nganhCode === 'KHMT') $faculty = 'Khoa học Máy tính';
        elseif ($nganhCode === 'NMMT' || $nganhCode === 'MMTT') $faculty = 'Mạng máy tính';
    }
    // =========================================================

    // Kiểm tra tài khoản đã tồn tại chưa bằng EMAIL
    $stmt = $conn->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);

    if ($stmt->rowCount() == 0) {
        // Nếu chưa có thì Insert (Lưu ý: Đã thêm cột faculty vào lệnh INSERT)
        $stmtInsert = $conn->prepare("INSERT INTO users (mssv, full_name, email, chi_doan, faculty, role, avatar) VALUES (?, ?, ?, ?, ?, 'student', ?)");
        $stmtInsert->execute([$mssv, $full_name, $email, $chi_doan, $faculty, $avatar]);
} else {
        // Nếu có rồi thì lấy thông tin cũ trong DB ra dùng
        $existingUser = $stmt->fetch(PDO::FETCH_ASSOC);
        $mssv = $existingUser['mssv']; 
        $chi_doan = $existingUser['chi_doan'] ?? $chi_doan;
        $faculty = $existingUser['faculty'] ?? $faculty;
        $dbAvatar = $existingUser['avatar'] ?? '';
        
        // KIỂM TRA ƯU TIÊN ẢNH:
        // Nếu trong DB đã có ảnh tự tải lên (chứa chữ uploads/avatars/)
        if (strpos($dbAvatar, 'uploads/avatars/') !== false) {
            // Giữ nguyên ảnh tự tải, không cập nhật đè từ Google
            $avatar = $dbAvatar; 
        } else {
            // Nếu chưa có ảnh tự tải, thì mới cập nhật ảnh mới nhất từ Google
            if (!empty($avatar)) {
                $stmtUpdate = $conn->prepare("UPDATE users SET avatar = ? WHERE email = ?");
                $stmtUpdate->execute([$avatar, $email]);
            } else {
                $avatar = $dbAvatar;
            }
        }
    }

    echo json_encode([
        "status" => "success",
        "mssv" => $mssv,
        "chi_doan" => $chi_doan,
        "faculty" => $faculty,
        "full_name" => $full_name,
        "email" => $email,
        "avatar" => $avatar
    ]);

} catch (PDOException $e) {
    http_response_code(200); 
    echo json_encode(["status" => "error", "message" => "Lỗi MySQL: " . $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(200);
    echo json_encode(["status" => "error", "message" => "Lỗi Code: " . $e->getMessage()]);
}

$conn = null;
?>