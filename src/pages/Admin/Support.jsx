import React from 'react';
import { Card, Row, Col, Accordion, Button } from 'react-bootstrap';

const Support = () => {
  return (
    <>
      <div className="mb-4">
        <h6 className="text-muted text-uppercase fw-bold mb-1" style={{ letterSpacing: '1px', fontSize: '0.75rem' }}>Trợ giúp</h6>
        <h3 className="fw-bold mb-0">Hỗ trợ Kỹ thuật</h3>
      </div>

      <Row className="g-4">
        <Col md={7}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="p-4">
              <h5 className="fw-bold mb-4">Các câu hỏi thường gặp (FAQ)</h5>
              <Accordion defaultActiveKey="0" flush>
                <Accordion.Item eventKey="0">
                  <Accordion.Header>Làm sao để cấp quyền Admin cho Bí thư chi đoàn?</Accordion.Header>
                  <Accordion.Body className="text-muted small">
                    Truy cập vào menu <strong>Quản lý Người dùng</strong>, tìm kiếm tài khoản sinh viên cần cấp quyền, nhấn vào biểu tượng bánh răng (Cài đặt) và thay đổi vai trò (Role) từ Student sang Admin.
                  </Accordion.Body>
                </Accordion.Item>
                
                {/* CẬP NHẬT FAQ SỐ 2: ĐỒNG BỘ LUỒNG AI & TÍNH NĂNG ZOOM MỚI */}
                <Accordion.Item eventKey="1">
                  <Accordion.Header>Hệ thống AI duyệt ảnh hoạt động như thế nào?</Accordion.Header>
                  <Accordion.Body className="text-muted small">
                    Khi sinh viên nộp minh chứng, AI thực hiện 3 lớp bảo vệ: 
                    1. Tính mã băm <strong>pHash</strong> chống nộp trùng ảnh gian lận. 
                    2. Dùng <strong>OCR Tesseract</strong> quét tìm thông tin MSSV/Tên sinh viên. 
                    3. Áp dụng thuật toán lọc bối cảnh <strong>OpenCV</strong> để nhận diện thông minh ảnh chụp màn hình máy tính hoặc selfie hội trường không chứa văn bản, tránh đánh trượt oan sinh viên. Cán bộ có thể dùng thanh công cụ <strong>Kính lúp (Zoom In/Out)</strong> ngay trên màn hình để phóng to ảnh đối soát chi tiết.
                  </Accordion.Body>
                </Accordion.Item>
                
                <Accordion.Item eventKey="2">
                  <Accordion.Header>Làm sao để xuất danh sách điểm rèn luyện?</Accordion.Header>
                  <Accordion.Body className="text-muted small">
                    Tại trang Quản lý Người dùng, sử dụng nút <strong>Xuất dữ liệu</strong> ở góc trên bên phải để tải file Excel tổng hợp điểm của toàn bộ sinh viên khóa 2023.
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>
            </Card.Body>
          </Card>
        </Col>

        <Col md={5}>
          <Card className="border-0 shadow-sm h-100 text-white" style={{ backgroundColor: 'var(--sidebar-bg)' }}>
            <Card.Body className="p-4 d-flex flex-column">
              <h5 className="fw-bold mb-3"><i className="bi bi-headset me-2"></i>Liên hệ Nhóm Phát triển</h5>
              <p className="small text-white-50 mb-4">
                Nếu gặp sự cố hệ thống nghiêm trọng (lỗi CSDL, hỏng API điểm danh), vui lòng liên hệ trực tiếp với đội ngũ phát triển.
              </p>
              
              <div className="mb-3">
                <div className="fw-semibold small">Email hỗ trợ:</div>
                <div>support.httt2023@sv.ctuet.edu.vn</div>
              </div>
              <div className="mb-4">
                <div className="fw-semibold small">Hotline kỹ thuật:</div>
                <div>0901 234 567</div>
              </div>

              <div className="mt-auto">
                <Button variant="light" className="w-100 fw-semibold text-dark">
                  Gửi yêu cầu hỗ trợ (Ticket)
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default Support;