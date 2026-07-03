<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
if($_SERVER['REQUEST_METHOD']=='OPTIONS'){http_response_code(200);exit();}
header("Content-Type: application/json; charset=UTF-8");
$servername="localhost";$username="root";$password="";$dbname="quanlysukien3";
$email=isset($_POST['email'])?$_POST['email']:'';
$phone=isset($_POST['phone'])?$_POST['phone']:'';
if(empty($email)||empty($phone)){echo json_encode(["status"=>"error","message"=>"Thiếu thông tin"]);exit();}
try{
$conn=new PDO("mysql:host=$servername;dbname=$dbname;charset=utf8",$username,$password);
$conn->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
$stmt=$conn->prepare("UPDATE users SET phone=:phone WHERE email=:email");
$stmt->bindParam(':phone',$phone);
$stmt->bindParam(':email',$email);
$stmt->execute();
if($stmt->rowCount()>0){echo json_encode(["status"=>"success"]);}
else{echo json_encode(["status"=>"error","message"=>"Không có thay đổi hoặc sai email"]);}
}catch(PDOException $e){echo json_encode(["status"=>"error","message"=>$e->getMessage()]);}
$conn=null;
?>