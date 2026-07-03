import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Button, Spinner, Alert } from 'react-bootstrap';

const Checkin = () => {
  const { eventId } = useParams(); // Lấy ID sự kiện từ URL (ví dụ: /checkin/EV-1234)
  const [status, setStatus] = useState('idle'); // idle, locating, submitting, success, error
  const [message, setMessage] = useState('');

  // Giả lập ID sinh viên đang đăng nhập (Thực tế bạn lấy từ Context/Redux/Token)
  const studentId = "SV001"; 

  const handleCheckin = () => {
    setStatus('locating');
    setMessage('Đang lấy vị trí của bạn. Vui lòng cho phép truy cập GPS...');

    // Kiểm tra trình duyệt có hỗ trợ GPS không
    if (!navigator.geolocation) {
      setStatus('error');
      setMessage('Trình duyệt của bạn không hỗ trợ định vị GPS.');
      return;
    }

    // Gọi hàm lấy vị trí
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const studentLat = position.coords.latitude;
        const studentLng = position.coords.longitude;
        sendCheckinData(studentLat, studentLng);
      },
      (error) => {
        setStatus('error');
        if (error.code === error.PERMISSION_DENIED) {
          setMessage('Bạn đã từ chối quyền truy cập vị trí. Vui lòng bật lại trong cài đặt trình duyệt để điểm danh.');
        } else {
          setMessage('Không thể xác định vị trí của bạn lúc này. Vui lòng thử lại.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } // Yêu cầu độ chính xác cao
    );
  };

  const sendCheckinData = (lat, lng) => {
    setStatus('submitting');
    setMessage('Đang gửi dữ liệu điểm danh...');

    fetch('http://localhost:5000/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: eventId,
        student_id: studentId,
        latitude: lat,
        longitude: lng
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setStatus('success');
        setMessage(data.message || 'Điểm danh thành công! Cảm ơn bạn đã tham gia.');
      } else {
        setStatus('error');
        setMessage(data.message || 'Điểm danh thất bại. Vui lòng kiểm tra lại.');
      }
    })
    .catch(err => {
      setStatus('error');
      setMessage('Lỗi kết nối đến máy chủ.');
    });
  };

  return (
    <div className="d-flex align-items-center justify-content-center vh-100 bg-light">
      <Card className="shadow-sm border-0" style={{ width: '100%', maxWidth: '400px' }}>
        <Card.Body className="text-center p-4">
          <div className="mb-4">
            <i className="bi bi-geo-alt-fill text-primary" style={{ fontSize: '3rem' }}></i>
          </div>
          <h4 className="fw-bold mb-3">Điểm danh Sự kiện</h4>
          <p className="text-muted small mb-4">
            Sự kiện này yêu cầu xác nhận vị trí. Vui lòng đứng gần khu vực tổ chức và cho phép trình duyệt truy cập GPS.
          </p>

          {status === 'error' && <Alert variant="danger" className="small text-start">{message}</Alert>}
          {status === 'success' && <Alert variant="success" className="small fw-bold">{message}</Alert>}
          {(status === 'locating' || status === 'submitting') && (
            <div className="text-primary small mb-3 fw-semibold">
              <Spinner animation="border" size="sm" className="me-2" /> {message}
            </div>
          )}

          {status !== 'success' && (
            <Button 
              style={{ backgroundColor: '#0d235e', borderColor: '#0d235e' }} 
              className="w-100 fw-bold py-2"
              onClick={handleCheckin}
              disabled={status === 'locating' || status === 'submitting'}
            >
              Xác nhận Điểm danh
            </Button>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default Checkin;