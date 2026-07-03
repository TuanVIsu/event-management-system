<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Accept");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'db_connect.php';
header('Content-Type: application/json');

$email = $_POST['email'] ?? '';
if (empty($email) || !isset($_FILES['avatar_image'])) {
    echo json_encode(["status" => "error", "message" => "Thiếu dữ liệu gửi lên"]);
    exit;
}

// SỬA LẠI ĐƯỜNG DẪN NÀY: Chỉ lùi 1 dấu ../ để lưu vào DOAN3/uploads/avatars/
$upload_dir = '../uploads/avatars/';

if (!is_dir($upload_dir)) { 
    mkdir($upload_dir, 0777, true); 
}

// Lấy đuôi file và tạo tên file mới an toàn
$file_ext = strtolower(pathinfo($_FILES['avatar_image']['name'], PATHINFO_EXTENSION));
$new_file_name = md5($email . time()) . '.' . $file_ext;
$target_file = $upload_dir . $new_file_name;

if (move_uploaded_file($_FILES['avatar_image']['tmp_name'], $target_file)) {
    // Sửa lại đường dẫn lưu vào DB để App có thể đọc được
    $avatar_path_db = 'uploads/avatars/' . $new_file_name;
    
    try {
        $stmt = $conn->prepare("UPDATE users SET avatar = :avatar WHERE email = :email");
        $stmt->execute([':avatar' => $avatar_path_db, ':email' => $email]);
        
        echo json_encode(["status" => "success", "new_avatar_path" => $avatar_path_db]);
    } catch (PDOException $e) {
        echo json_encode(["status" => "error", "message" => "Lỗi lưu CSDL: " . $e->getMessage()]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Không thể lưu file ảnh vào server. Kiểm tra lại quyền thư mục!"]);
}
?>