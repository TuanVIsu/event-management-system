<?php
header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");

// 1. Nhúng file kết nối database bằng PDO của bạn vào đây
// Giả sử file cấu hình bạn vừa gửi tên là db.php, nếu tên khác bạn sửa lại nhé!
require_once 'db_connect.php'; 

try {
    // 2. Sử dụng biến $conn (đối tượng PDO) để truy vấn
    $sql = "SELECT title FROM criteria ORDER BY id ASC";
    $stmt = $conn->query($sql);
    
    // FETCH_COLUMN giúp lấy ra ngay một mảng 1 chiều chứa toàn bộ cột 'title'
    // Rất tiện vì Flutter chỉ cần một List<String>
    $categories = $stmt->fetchAll(PDO::FETCH_COLUMN);

    if (!empty($categories)) {
        echo json_encode([
            'status' => 'success',
            'data' => $categories
        ]);
    } else {
        echo json_encode([
            'status' => 'error',
            'message' => 'Không tìm thấy danh mục nào trong bảng criteria',
            'data' => []
        ]);
    }
} catch (PDOException $e) {
    // Bắt lỗi PDO nếu có vấn đề trong câu lệnh SQL hoặc bảng dữ liệu
    echo json_encode([
        'status' => 'error',
        'message' => 'Lỗi truy vấn CSDL: ' . $e->getMessage()
    ]);
}

// Ngắt kết nối PDO (Không bắt buộc vì PHP tự giải phóng khi chạy xong, nhưng viết cho chuẩn)
$conn = null;
?>