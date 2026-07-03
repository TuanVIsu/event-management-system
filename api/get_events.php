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
$dbname = "quanlysukien3";

try {
    $conn = new PDO("mysql:host=$servername;dbname=$dbname;charset=utf8mb4", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Lấy MSSV từ Flutter gửi lên
    $mssv = isset($_GET['mssv']) ? $_GET['mssv'] : '';

    // CẬP NHẬT SQL: Bổ sung max_participants, require_proof và đếm current_participants
    $sql = "
        SELECT 
            e.id, 
            e.name, 
            e.date, 
            e.end_date, 
            e.category, 
            e.poster_url,
            e.attached_file, 
            e.description,
            e.status, 
            e.require_gps, 
            e.require_proof, 
            e.points,
            e.max_participants,
            (SELECT COUNT(*) FROM event_registrations WHERE event_id = e.id) as current_participants,
            IF(er.id IS NOT NULL, 1, 0) as is_registered,
            (SELECT IF(COUNT(*) > 0, 1, 0) 
             FROM attendance a 
             JOIN users u ON a.student_id = u.id 
             WHERE a.event_id = e.id AND u.mssv = :mssv) as is_checked_in
        FROM events e
        LEFT JOIN event_registrations er 
            ON e.id = er.event_id AND er.mssv = :mssv
        WHERE e.status != 'Ngừng hoạt động' 
        ORDER BY e.date ASC
    ";

    $stmt = $conn->prepare($sql);
    $stmt->execute(['mssv' => $mssv]);
    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

    http_response_code(200);
    echo json_encode(["status" => "success", "events" => $events]);

} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Lỗi truy vấn CSDL: " . $e->getMessage()]);
} catch(Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Lỗi hệ thống: " . $e->getMessage()]);
}
$conn = null;
?>