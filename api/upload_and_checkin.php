<?php
require_once 'db_connect.php';
header('Content-Type: application/json');

// --- HÀM TÍNH KHOẢNG CÁCH (HAVERSINE FORMULA) ---
function calculateDistance($lat1, $lon1, $lat2, $lon2) {
    $earthRadius = 6371000; // Bán kính trái đất (mét)
    $latDelta = deg2rad($lat2 - $lat1);
    $lonDelta = deg2rad($lon2 - $lon1);
    $a = sin($latDelta / 2) * sin($latDelta / 2) +
         cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
         sin($lonDelta / 2) * sin($lonDelta / 2);
    $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
    return $earthRadius * $c; // Trả về khoảng cách (mét)
}
// --- HÀM TÍNH KHOẢNG CÁCH HAMMING CHO MÃ BĂM (CHỐNG LỖI INFINITYFREE) ---
function getHammingDistanceHex($hex1, $hex2) {
    if (strlen($hex1) !== strlen($hex2)) return 64;
    $dist = 0;
    for ($i = 0; $i < strlen($hex1); $i++) {
        $xor = hexdec($hex1[$i]) ^ hexdec($hex2[$i]);
        while ($xor > 0) {
            $dist += $xor & 1;
            $xor >>= 1;
        }
    }
    return $dist;
}

$mssv = $_POST['mssv'] ?? '';
$event_id = $_POST['event_id'] ?? '';
$category = $_POST['category'] ?? '';
// Chuyển kiểu dữ liệu sang float để tính toán
$user_lat = (float)($_POST['latitude'] ?? 0);
$user_lon = (float)($_POST['longitude'] ?? 0);

try {
    // 1. XÁC THỰC SINH VIÊN
    $stmt_user = $conn->prepare("SELECT id FROM users WHERE mssv = :mssv");
    $stmt_user->execute([':mssv' => $mssv]);
    $user = $stmt_user->fetch(PDO::FETCH_ASSOC);
    if (!$user) {
        echo json_encode(["status" => "error", "message" => "Không tìm thấy sinh viên"]);
        exit;
    }
    $student_id = $user['id'];

    // 2. KIỂM TRA THÔNG TIN SỰ KIỆN & CẤU HÌNH GPS + MINH CHỨNG
    $stmt_event = $conn->prepare("SELECT require_gps, require_proof, latitude, longitude, allowed_radius FROM events WHERE id = :event_id");
    $stmt_event->execute([':event_id' => $event_id]);
    $event = $stmt_event->fetch(PDO::FETCH_ASSOC);

    if (!$event) {
        echo json_encode(["status" => "error", "message" => "Sự kiện không tồn tại"]);
        exit;
    }

    $require_gps = (int)$event['require_gps'];
    $require_proof = (int)$event['require_proof'];
    $checkin_method = 'QR';
    $distance = 0;

    // Lôgic xử lý định vị GPS
    if ($require_gps === 1) {
        if ($user_lat == 0 || $user_lon == 0) {
            echo json_encode(["status" => "error", "message" => "Sự kiện yêu cầu định vị!"]);
            exit;
        }
        $event_lat = (float)$event['latitude'];
        $event_lon = (float)$event['longitude'];
        $allowed_radius = (int)$event['allowed_radius'];

        $distance = calculateDistance($user_lat, $user_lon, $event_lat, $event_lon);
        if ($distance > $allowed_radius) {
            echo json_encode([
                "status" => "error", 
                "message" => "Bạn đang ở ngoài khu vực tổ chức sự kiện (cách " . round($distance) . "m)."
            ]);
            exit;
        }
        $checkin_method = 'QR_GPS';
    }

    // CẬP NHẬT CƠ CHẾ PHÂN LUỒNG TRẠNG THÁI
    if ($require_proof === 0 || $require_gps === 1) {
        $final_status = 'approved';
        $ai_message = ($require_proof === 0) 
            ? "Điểm danh thành công! Sự kiện này không yêu cầu duyệt ảnh." 
            : "Minh chứng hợp lệ. Khoảng cách: " . round($distance) . "m.";
    } else {
        $final_status = 'pending';
        $ai_message = "Đã nộp thành công, chờ cán bộ chi đoàn duyệt ảnh.";
    }

    if ($require_proof === 1) {
        $checkin_method .= '_PHOTO'; 
    }

    // 3. XỬ LÝ LƯU FILE ẢNH & DATABASE TRANSACTION
    if ($require_proof === 1) {
        if (isset($_FILES['proof_image']) && $_FILES['proof_image']['error'] === UPLOAD_ERR_OK) {
            
            // --- THÊM LOGIC UPLOAD Ở ĐÂY ---
            $upload_dir = 'uploads/proofs/';
            
            // Tự động tạo thư mục nếu chưa tồn tại
            if (!is_dir($upload_dir)) {
                mkdir($upload_dir, 0777, true);
            }

            // Lấy đuôi file và tạo tên ngẫu nhiên
            $file_extension = pathinfo($_FILES['proof_image']['name'], PATHINFO_EXTENSION);
            $new_file_name = uniqid('img_', true) . '.' . $file_extension;
            $target_path = $upload_dir . $new_file_name;

            // Di chuyển file từ bộ nhớ tạm vào thư mục đích
            if (move_uploaded_file($_FILES['proof_image']['tmp_name'], $target_path)) {
                $image_url_for_db = $target_path;
                $proof_id = uniqid('PR_', true);
            } else {
                echo json_encode(["status" => "error", "message" => "Lỗi không thể lưu ảnh vào máy chủ!"]);
                exit;
            }
            // --------------------------------

        } else {
            echo json_encode(["status" => "error", "message" => "Không tìm thấy file ảnh tải lên"]);
            exit;
        }
    } else {
        // Nếu KHÔNG cần ảnh -> Đặt giá trị null cho ảnh
        $image_url_for_db = null;
        $proof_id = uniqid('PR_', true);
    }
    // ... (Đoạn code move_uploaded_file lưu ảnh lên server PHP thành công) ...

    $python_api_url = "http://127.0.0.1:8000/api/analyze-proof";
    
    // 1. Chuẩn bị dữ liệu gửi qua Python
    $cfile = new CURLFile($target_path, $_FILES['proof_image']['type'], $_FILES['proof_image']['name']);
    $post_data = array(
        'proof_image' => $cfile,
        'mssv' => $mssv,
        'student_name' => $user['full_name'], // Giả sử bạn đã query lấy full_name
        'event_name' => $event['name']        // Giả sử bạn đã query lấy tên sự kiện
    );

    // 2. Gọi cURL sang Python API
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $python_api_url);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $post_data);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    curl_close($ch);

    $ai_result = json_decode($response, true);
    
    // 3. Xử lý kết quả trả về từ Python
    $current_hash = '';
    $ocr_match_percent = 0;
    $phash_warning = 0;

    if ($ai_result && $ai_result['status'] === 'success') {
        $current_hash = $ai_result['image_hash'];
        $ocr_match_percent = $ai_result['ocr_match_percent'];
        
        // KIỂM TRA TRÙNG LẶP pHash TẠI DATABASE MySQL (PHP tự làm)
        $stmt_check = $conn->prepare("SELECT id, image_hash FROM proofs WHERE image_hash IS NOT NULL");
        $stmt_check->execute();
        $all_proofs = $stmt_check->fetchAll(PDO::FETCH_ASSOC);
        
       foreach ($all_proofs as $row) {
            // Thay vì dùng gmp_hamdist, ta dùng hàm tự viết
            $distance = getHammingDistanceHex($current_hash, $row['image_hash']);
            if ($distance <= 5) {
                $phash_warning = 1; // Phát hiện copy ảnh
                break;
            }
        }
    }

    // 4. LUẬT ĐỂ DUYỆT TỰ ĐỘNG
    if ($require_proof === 1 && $phash_warning === 0 && $ocr_match_percent >= 66) {
        $final_status = 'approved';
        $ai_message = "Hệ thống AI đã quét (Độ khớp OCR: $ocr_match_percent%) và duyệt tự động!";
    } else {
        $final_status = 'pending';
        $ai_message = ($phash_warning === 1) ? "⚠️ Cảnh báo: Phát hiện ảnh trùng lặp! Chờ cán bộ kiểm tra." : "Đã nộp thành công, chờ cán bộ duyệt.";
    }

    // 5. LƯU DATABASE NHƯ BÌNH THƯỜNG ... (INSERT INTO proofs ...)
    // 5. LƯU VÀO DATABASE BẰNG TRANSACTION
    $conn->beginTransaction();

    $stmt_proof = $conn->prepare("INSERT INTO proofs (id, student_id, event_id, image_url, image_hash, ocr_match_percent, phash_warning, status) VALUES (:id, :student_id, :event_id, :image_url, :image_hash, :ocr_match_percent, :phash_warning, :status)");
    $stmt_proof->execute([
        ':id' => $proof_id,
        ':student_id' => $student_id,
        ':event_id' => $event_id,
        ':image_url' => $image_url_for_db,
        ':image_hash' => $current_hash,               // Dữ liệu AI
        ':ocr_match_percent' => $ocr_match_percent,   // Dữ liệu AI
        ':phash_warning' => $phash_warning,           // Dữ liệu AI
        ':status' => $final_status
    ]);

    $stmt_att = $conn->prepare("INSERT INTO attendance (event_id, student_id, method, status, checkin_time) VALUES (:event_id, :student_id, :method, 'checked_in', NOW())");
    $stmt_att->execute([
        ':event_id' => $event_id,
        ':student_id' => $student_id,
        ':method' => $checkin_method
    ]);

    $conn->commit();

    echo json_encode([
        "status" => "success",
        "auto_status" => $final_status,
        "phash_warning" => $ai_message,
        "image_path" => $image_url_for_db
    ]);

} catch (PDOException $e) {
    if ($conn->inTransaction()) { 
        $conn->rollBack(); 
    }
    echo json_encode(["status" => "error", "message" => "Lỗi hệ thống: " . $e->getMessage()]);
}

?>