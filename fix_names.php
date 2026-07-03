<?php
$conn = new mysqli("localhost", "root", "", "quanlysukien3");
if ($conn->connect_error) {
  die("Connection failed: " . $conn->connect_error);
}
$conn->set_charset("utf8mb4");

$conn->query("UPDATE users SET full_name = 'Nguyễn Văn A (KHMT)' WHERE mssv = 'KHMT2311001'");
$conn->query("UPDATE users SET full_name = 'Trần Thị B (KTPM)' WHERE mssv = 'KTPM2311002'");
$conn->query("UPDATE users SET full_name = 'Lê Văn C (HTTT)' WHERE mssv = 'HTTT2311003'");
$conn->query("UPDATE users SET full_name = 'Cán Bộ Lớp HTTT' WHERE mssv = 'HTTT2311004'");
$conn->query("UPDATE events SET name = 'Sự kiện Mockup', description = 'Mock Event' WHERE id = 'EV_MOCK_1'");

echo "Done";
$conn->close();
?>
