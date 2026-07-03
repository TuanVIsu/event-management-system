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

    // BƯỚC 1: Lấy ID sinh viên từ bảng users
    $stmtUser = $pdo->prepare("SELECT id FROM users WHERE mssv = ?");
    $stmtUser->execute([$mssv]);
    $user = $stmtUser->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo json_encode(["status" => "error", "message" => "Không tìm thấy sinh viên trong hệ thống."]);
        exit();
    }
    $student_id = $user['id'];

    // BƯỚC 2: Kiểm tra xem sinh viên có đăng ký chưa
    $stmtCheck = $pdo->prepare("SELECT id, is_checked_in FROM event_registrations WHERE mssv = ? AND event_id = ?");
    $stmtCheck->execute([$mssv, $event_id]);
    $registration = $stmtCheck->fetch(PDO::FETCH_ASSOC);

    if (!$registration) {
        echo json_encode(["status" => "error", "message" => "Bạn chưa đăng ký sự kiện này nên không thể điểm danh."]);
        exit();
    }

    if ($registration['is_checked_in'] == 1) {
        echo json_encode(["status" => "error", "message" => "Bạn đã điểm danh sự kiện này rồi!"]);
        exit();
    }

    // BƯỚC 3: Bắt đầu Transaction để đảm bảo dữ liệu đồng bộ
    $pdo->beginTransaction();

    // 3.1 Cập nhật trạng thái "Đã điểm danh" trong bảng event_registrations
    $stmtUpdate = $pdo->prepare("UPDATE event_registrations SET is_checked_in = 1, checkin_at = CURRENT_TIMESTAMP WHERE mssv = ? AND event_id = ?");
    $stmtUpdate->execute([$mssv, $event_id]);

    // 3.2 THÊM VÀO BẢNG LỊCH SỬ ATTENDANCE (CHÌA KHÓA ĐỂ SỬA LỖI)
    $stmtAtt = $pdo->prepare("INSERT INTO attendance (event_id, student_id, method, status, checkin_time) VALUES (?, ?, 'Quét mã QR', 'checked_in', NOW())");
    $stmtAtt->execute([$event_id, student_id]);

    $pdo->commit();

    echo json_encode(["status" => "success", "message" => "Điểm danh thành công! Điểm rèn luyện sẽ được cộng sau."]);

} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo json_encode(["status" => "error", "message" => "Lỗi CSDL: " . $e->getMessage()]);
}
?>