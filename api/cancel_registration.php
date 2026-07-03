<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "quanlysukien3";

try {
    $pdo = new PDO("mysql:host=$servername;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $json = file_get_contents("php://input");
    $data = json_decode($json);

    if (!isset($data->mssv) || !isset($data->event_id)) {
        echo json_encode(["status" => "error", "message" => "Thiếu thông tin xác thực."]);
        exit();
    }

    $mssv = $data->mssv;
    $event_id = $data->event_id;

    // 1. Lấy thời gian bắt đầu của sự kiện
    $stmtEvent = $pdo->prepare("SELECT date FROM events WHERE id = ?");
    $stmtEvent->execute([$event_id]);
    $event = $stmtEvent->fetch(PDO::FETCH_ASSOC);

    if (!$event) {
        echo json_encode(["status" => "error", "message" => "Sự kiện không tồn tại."]);
        exit();
    }

    // 2. Kiểm tra điều kiện thời gian (Tính bằng giây)
    $eventTime = strtotime($event['date']);
    $currentTime = time(); // Thời gian hiện tại của hệ thống máy chủ
    $timeDifference = $eventTime - $currentTime;

    // 86400 giây tương đương với 24 giờ (1 ngày)
    if ($timeDifference < 86400) {
        echo json_encode([
            "status" => "error", 
            "message" => "Không thể hủy! Bạn chỉ được phép hủy đăng ký trước khi sự kiện diễn ra ít nhất 1 ngày."
        ]);
        exit();
    }

    // 3. Tiến hành xóa lượt đăng ký trong cơ sở dữ liệu
    $stmtDelete = $pdo->prepare("DELETE FROM event_registrations WHERE mssv = ? AND event_id = ?");
    $stmtDelete->execute([$mssv, $event_id]);

    if ($stmtDelete->rowCount() > 0) {
        echo json_encode(["status" => "success", "message" => "Hủy đăng ký sự kiện thành công!"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Dữ liệu đăng ký không tồn tại hoặc đã bị hủy trước đó."]);
    }

} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Lỗi kết nối CSDL: " . $e->getMessage()]);
}
?>