<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
require_once 'db_connect.php'; 

$mssv = isset($_GET['mssv']) ? trim($_GET['mssv']) : '';
if(empty($mssv)){
    http_response_code(400);
    echo json_encode(['error'=>'Thiếu mã số sinh viên']);
    exit;
}

$response = [
    'user_info' => null,
    'criteria' => [],
    'recent_activities' => []
];

try {
    // 1. Thông tin sinh viên
    $stmtActivities=$conn->prepare("SELECT id, name, category, status, date, 0 AS isSpecial FROM events WHERE status='Sắp diễn ra' AND id NOT IN (SELECT event_id FROM event_registrations WHERE mssv=:mssv) ORDER BY created_at DESC LIMIT 5");
$stmtActivities->execute(['mssv'=>$mssv]);
$response['recent_activities']=$stmtActivities->fetchAll(PDO::FETCH_ASSOC);

    // 2. Tiêu chí điểm
    $stmtCriteria = $conn->prepare("
        SELECT c.id, c.title, c.max_points, c.icon_name, COALESCE(scp.current_points, 0) AS current_points 
        FROM criteria c 
        LEFT JOIN student_criteria_points scp ON c.id=scp.criteria_id AND scp.mssv=:mssv
    ");
    $stmtCriteria->execute(['mssv' => $mssv]);
    $response['criteria'] = $stmtCriteria->fetchAll(PDO::FETCH_ASSOC);

    // 3. HOẠT ĐỘNG MỚI NHẤT (Sắp diễn ra VÀ Sinh viên CHƯA đăng ký)
    $stmtActivities = $conn->prepare("
        SELECT id, name, category, status, date, 0 AS isSpecial 
        FROM events 
        WHERE status = 'Sắp diễn ra' 
          AND id NOT IN (
              SELECT event_id 
              FROM event_registrations
              WHERE mssv = :mssv
          )
        ORDER BY created_at DESC 
        LIMIT 5
    ");
    // LƯU Ý: Đã thêm tham số 'mssv' vào hàm execute bên dưới
    $stmtActivities->execute(['mssv' => $mssv]);
    $response['recent_activities'] = $stmtActivities->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($response);

} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(['error'=>'Lỗi truy vấn: ' . $e->getMessage()]);
}
?>