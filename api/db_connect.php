<?php
$host = '127.0.0.1';
$dbname = 'quanlysukien3'; // Tên database theo sơ đồ của bạn
$username = 'root';        // Thay bằng username database của bạn
$password = '';            // Thay bằng password database của bạn

try {
    $conn = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    // Thiết lập chế độ báo lỗi PDO
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    die(json_encode(["error" => "Connection failed: " . $e->getMessage()]));
}
?>