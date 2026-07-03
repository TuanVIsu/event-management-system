<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

header("Content-Type: application/json; charset=UTF-8");

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "quanlysukien3"; // Đảm bảo đúng tên CSDL của bạn

$email = isset($_GET['email']) ? $_GET['email'] : '';

try {
    $conn = new PDO("mysql:host=$servername;dbname=$dbname;charset=utf8", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Chuyển đổi tên bảng thành users
    $tableName = "users"; 

    // ĐÃ SỬA: Thêm cột avatar vào câu lệnh SELECT
    $sql = "SELECT mssv, full_name, email, role, faculty, point_wallet, phone, chi_doan, avatar 
            FROM $tableName 
            WHERE email = :email";
            
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':email', $email);
    $stmt->execute();
    
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
        echo json_encode([
            "status" => "success",
            "data" => $user
        ]);
    } else {
        echo json_encode([
            "status" => "error",
            "message" => "Không tìm thấy dữ liệu cho email: " . $email
        ]);
    }

} catch(PDOException $e) {
    echo json_encode([
        "status" => "error",
        "message" => "Lỗi CSDL: " . $e->getMessage()
    ]);
}
$conn = null;
?>