<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Xử lý Preflight request cho Flutter Web
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "quanlysukien3";

try {
    // Kết nối CSDL trực tiếp (Không dùng require get_events.php)
    $pdo = new PDO("mysql:host=$servername;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $json = file_get_contents("php://input");
    $data = json_decode($json);

    if (!isset($data->mssv) || !isset($data->event_id)) {
        echo json_encode(["status" => "error", "message" => "Thiếu thông tin MSSV hoặc ID sự kiện."]);
        exit();
    }

    $mssv = $data->mssv;
    $event_id = $data->event_id;

    // 1. Kiểm tra MSSV trong bảng users
    $stmtStudent = $pdo->prepare("SELECT mssv FROM users WHERE mssv = ?");
    $stmtStudent->execute([$mssv]);
    if ($stmtStudent->rowCount() === 0) {
        echo json_encode(["status" => "error", "message" => "MSSV không hợp lệ hoặc chưa có trong hệ thống."]);
        exit();
    }

    // 2. Kiểm tra trạng thái sự kiện
    $stmtEvent = $pdo->prepare("SELECT status FROM events WHERE id = ?");
    $stmtEvent->execute([$event_id]);
    $event = $stmtEvent->fetch(PDO::FETCH_ASSOC);

    if (!$event) {
        echo json_encode(["status" => "error", "message" => "Sự kiện không tồn tại."]);
        exit();
    }

    if ($event['status'] === 'Ngừng hoạt động' || $event['status'] === 'Đang diễn ra') {
         echo json_encode(["status" => "error", "message" => "Sự kiện này không còn nhận đăng ký."]);
         exit();
    }

    // 3. Kiểm tra xem sinh viên đã đăng ký sự kiện này chưa
    $stmtCheck = $pdo->prepare("SELECT id FROM event_registrations WHERE mssv = ? AND event_id = ?");
    $stmtCheck->execute([$mssv, $event_id]);
    if ($stmtCheck->rowCount() > 0) {
        echo json_encode(["status" => "error", "message" => "Bạn đã đăng ký sự kiện này rồi!"]);
        exit();
    }

    // 4. Thực hiện lưu vào CSDL
    $stmtInsert = $pdo->prepare("INSERT INTO event_registrations (mssv, event_id) VALUES (?, ?)");
    $stmtInsert->execute([$mssv, $event_id]);

    echo json_encode(["status" => "success", "message" => "Đăng ký tham gia thành công!"]);

} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Lỗi CSDL: " . $e->getMessage()]);
}
?>