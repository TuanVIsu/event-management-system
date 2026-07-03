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
$dbname = "quanlysukien3"; // Giữ đúng database

// Nhận dữ liệu POST từ Flutter (FormData)
$email = isset($_POST['email']) ? trim($_POST['email']) : '';
$full_name = isset($_POST['full_name']) ? trim($_POST['full_name']) : '';

if (empty($email) || empty($full_name)) {
    echo json_encode(["status" => "error", "message" => "Thiếu thông tin email hoặc họ tên!"]);
    exit();
}

try {
    $conn = new PDO("mysql:host=$servername;dbname=$dbname;charset=utf8", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Cập nhật tên vào bảng users
    $sql = "UPDATE users SET full_name = :full_name WHERE email = :email";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':full_name', $full_name);
    $stmt->bindParam(':email', $email);
    $stmt->execute();

    if ($stmt->rowCount() > 0 || $stmt->errorCode() == '00000') {
        echo json_encode(["status" => "success", "message" => "Cập nhật tên thành công"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Không có thay đổi nào được thực hiện"]);
    }

} catch(PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Lỗi CSDL: " . $e->getMessage()]);
}

$conn = null;
?>