<?php
// Lấy dữ liệu từ Flutter gửi lên qua phương thức POST
$user_id = $_POST['user_id'] ?? '';
$qr_data = $_POST['qr_data'] ?? '';
$lat = $_POST['latitude'] ?? '';
$long = $_POST['longitude'] ?? '';

// Ghi log để kiểm tra (hoặc lưu vào MySQL)
if (!empty($user_id)) {
    // Đây là nơi bạn thực hiện truy vấn SQL: 
    // INSERT INTO diemdanh (user_id, qr_code, lat, long) VALUES (...)
    echo json_encode(["status" => "success", "message" => "Đã nhận dữ liệu từ user $user_id"]);
} else {
    echo json_encode(["status" => "error", "message" => "Thiếu dữ liệu"]);
}
?>