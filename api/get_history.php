<?php
require_once 'db_connect.php';
header('Content-Type: application/json');

$mssv = $_GET['mssv'] ?? '';

if (empty($mssv)) {
    echo json_encode(["status" => "error", "message" => "Thiếu MSSV"]);
    exit;
}

try {
    // JOIN 4 bảng: users, attendance, events, proofs
    $stmt = $conn->prepare("
        SELECT 
            e.name, 
            e.points, 
            e.category, 
            a.checkin_time, 
            p.status as proof_status
        FROM users u
        JOIN attendance a ON u.id = a.student_id
        JOIN events e ON a.event_id = e.id
        LEFT JOIN proofs p ON p.event_id = e.id AND p.student_id = u.id
        WHERE u.mssv = :mssv
        ORDER BY a.checkin_time DESC
    ");
    
    $stmt->execute([':mssv' => $mssv]);
    $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["status" => "success", "data" => $history]);

} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>