import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Row, Col, Card, Button, Badge, Form, InputGroup, Modal } from 'react-bootstrap';

const ProofApproval = () => {
  const [proofs, setProofs] = useState([]);
  const [selectedProof, setSelectedProof] = useState(null);
  const [loading, setLoading] = useState(true);

  const [filterQuery, setFilterQuery] = useState('');
  // STATE: Quản lý ghi chú nội bộ của cán bộ thẩm định
  const [adminComment, setAdminComment] = useState('');
  const [showZoomModal, setShowZoomModal] = useState(false);

  const fetchProofs = async () => {
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const userId = user?.id ? `&userId=${user.id}` : '';
      const res = await axios.get(`http://localhost:5000/api/proofs?status=pending${userId}`);
      setProofs(res.data || []);
      setSelectedProof(res.data?.[0] || null);
      setAdminComment(''); // Reset ô nhập text
    } catch (error) {
      console.error('Lỗi khi tải danh sách minh chứng:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProofs();
  }, []);

  // HÀM XỬ LÝ DUYỆT/TỪ CHỐI ĐÃ ĐƯỢC TÍCH HỢP BIẾN admin_comment TRUYỀN XUỐNG CSDL
  const handleUpdateStatus = async (proofId, newStatus) => {
    try {
      await axios.patch(`http://localhost:5000/api/proofs/${proofId}/status`, { 
        status: newStatus,
        admin_comment: adminComment // Đưa text từ ô nhập vào payload gửi lên Server
      });
      
      const updatedProofs = proofs.filter(p => p.id !== proofId);
      setProofs(updatedProofs);
      
      // Tự động chuyển focus sang minh chứng tiếp theo và làm sạch ô nhập liệu
      setSelectedProof(updatedProofs.length > 0 ? updatedProofs[0] : null);
      setAdminComment(''); 
      
      alert(`Đã ghi nhận trạng thái [${newStatus === 'approved' ? 'Chấp nhận' : 'Từ chối'}] thành công.`);
    } catch (error) {
      console.error('Lỗi cập nhật trạng thái:', error);
      alert('Có lỗi xảy ra khi thao tác với cơ sở dữ liệu!');
    }
  };

  const activeCase = selectedProof?.id || '';
  const pendingCount = proofs.length;
  const flaggedCount = proofs.filter((proof) => proof.phash_warning === 1).length;
  const approvedTodayCount = proofs.filter((proof) => proof.status === 'approved').length;

  const handleSelectProof = (proof) => {
    setSelectedProof(proof);
    setAdminComment(''); // Làm sạch ô nhập mỗi khi đổi sang hồ sơ của sinh viên khác
  };

  const filteredProofs = proofs.filter(p => {
    if (!filterQuery) return true;
    const query = filterQuery.toLowerCase();
    const mssvMatch = (p.mssv || '').toLowerCase().includes(query);
    const chiDoanMatch = (p.chi_doan || '').toLowerCase().includes(query);
    return mssvMatch || chiDoanMatch;
  });

  const uniqueChiDoan = [...new Set(proofs.map(p => p.chi_doan).filter(Boolean))];

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold mb-0">Cổng Thẩm định Minh chứng</h3>
        <div className="d-flex align-items-center">
          <InputGroup style={{ width: '280px' }} className="me-2">
            <InputGroup.Text className="bg-white border-end-0"><i className="bi bi-funnel text-muted"></i></InputGroup.Text>
            <Form.Select 
              className="border-start-0 shadow-none" 
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
            >
              <option value="">Tất cả ngành/lớp</option>
              {uniqueChiDoan.map((cd, index) => (
                <option key={index} value={cd}>{cd}</option>
              ))}
            </Form.Select>
          </InputGroup>
        </div>
      </div>

      {/* THẺ THỐNG KÊ KPI */}
      <Row className="mb-4 g-3">
        <Col md={4}>
          <Card className="dashboard-card h-100 border border-warning border-opacity-25">
            <Card.Body className="d-flex align-items-center p-3">
              <div className="icon-box bg-warning bg-opacity-10 text-warning me-3"><i className="bi bi-folder-symlink"></i></div>
              <div>
                <p className="text-muted fw-bold mb-0" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>CHỜ PHÊ DUYỆT</p>
                <h4 className="fw-bold mb-0 text-dark">{loading ? <span className="spinner-border spinner-border-sm"></span> : pendingCount}</h4>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="dashboard-card h-100 border border-danger border-opacity-25 bg-danger bg-opacity-10">
            <Card.Body className="d-flex align-items-center p-3">
              <div className="icon-box bg-danger bg-opacity-25 text-danger me-3"><i className="bi bi-exclamation-triangle"></i></div>
              <div>
                <p className="text-danger fw-bold mb-0" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>NGHI NGỜ GIAN LẬN</p>
                <h4 className="fw-bold mb-0 text-danger">{loading ? '...' : flaggedCount}</h4>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="dashboard-card h-100 border border-success border-opacity-25">
            <Card.Body className="d-flex align-items-center p-3">
              <div className="icon-box bg-success bg-opacity-10 text-success me-3"><i className="bi bi-check-circle"></i></div>
              <div>
                <p className="text-muted fw-bold mb-0" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>ĐÃ DUYỆT HÔM NAY</p>
                <h4 className="fw-bold mb-0 text-success">{loading ? '...' : approvedTodayCount}</h4>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4">
        {/* HÀNG CHỜ CÁC CARD MINH CHỨNG BÊN TRÁI */}
        <Col md={7}>
          <h5 className="fw-bold mb-3">Hàng chờ: Đang xử lý</h5>

          {loading ? (
            <div className="text-center text-muted py-5">Đang tải danh sách minh chứng...</div>
          ) : filteredProofs.length === 0 ? (
            <div className="text-center text-muted py-5">Không có minh chứng đang chờ duyệt.</div>
          ) : filteredProofs.map((proof) => (
            <Card key={proof.id} className={`dashboard-card mb-3 p-2 ${activeCase === proof.id ? 'border-primary shadow-sm' : proof.phash_warning === 1 ? 'border-danger border-opacity-25' : 'border-light'}`} style={{ cursor: 'pointer' }} onClick={() => handleSelectProof(proof)}>
              <Card.Body className="p-2 d-flex">
                <div 
                  className="me-3 img-thumbnail-hover shadow-sm" 
                  style={{ 
                    width: '120px', 
                    height: '145px', 
                    backgroundColor: '#f8f9fa', 
                    borderRadius: '8px', 
                    backgroundImage: proof.image_url ? `url(http://localhost:5000${proof.image_url})` : 'none', 
                    backgroundSize: 'cover', 
                    backgroundPosition: 'center',
                    cursor: 'zoom-in',
                    transition: 'transform 0.2s'
                  }}
                  onClick={(e) => {
                    e.stopPropagation(); 
                    setSelectedProof(proof); 
                    setShowZoomModal(true); 
                  }}
                  title="Bấm vào ảnh để phóng to đối soát"
                ></div>
                <div className="flex-grow-1 d-flex flex-column justify-content-between">
                  <div>
                    <div className="d-flex justify-content-between align-items-start mb-1">
                      <small className="text-muted fw-bold">MÃ MC: {proof.id}</small>
                      
                      {proof.phash_warning === 1 ? (
                        <Badge bg="danger" className="bg-opacity-10 text-danger border border-danger border-opacity-25 px-2 py-1">
                          TRÙNG LẶP ẢNH (GIAN LẬN)
                        </Badge>
                      ) : proof.ocr_match_percent === 0 ? (
                        <Badge bg="info" className="bg-opacity-10 text-info border border-info border-opacity-25 px-2 py-1">
                          ẢNH CHỤP / MÀN HÌNH
                        </Badge>
                      ) : (
                        <Badge bg="warning" className="bg-opacity-10 text-warning border border-warning border-opacity-50 px-2 py-1">
                          CHỜ PHÊ DUYỆT
                        </Badge>
                      )}
                    </div>
                    <h5 className="fw-bold mb-1 text-dark">{proof.student_name} <small className="text-muted fw-normal">({proof.mssv})</small></h5>
                    <p className="text-muted small mb-2 text-truncate" style={{ maxWidth: '300px' }}>{proof.event_name || 'Sự kiện chưa rõ'}</p>
                  </div>
                  
                  <div className="d-flex justify-content-between align-items-end mb-2 bg-light p-2 rounded">
                    <div>
                      <small className="text-muted d-block" style={{ fontSize: '0.65rem' }}>OCR KHỚP</small>
                      <span className={`fw-bold small ${proof.ocr_match_percent >= 66 ? 'text-success' : 'text-danger'}`}>{proof.ocr_match_percent || 0}%</span>
                    </div>
                    <div className="text-end">
                      <small className="text-muted d-block" style={{ fontSize: '0.65rem' }}>AI PHÂN TÍCH</small>
                      <span className="fw-medium text-secondary" style={{ fontSize: '0.75rem' }}>{proof.ai_note || 'Chưa quét'}</span>
                    </div>
                  </div>

                  <div className="d-flex gap-2">
                    <Button className="flex-grow-1 fw-bold text-white btn-indigo-primary" size="sm" onClick={(e) => { e.stopPropagation(); handleUpdateStatus(proof.id, 'approved'); }}>Duyệt nhanh</Button>
                    <Button variant="outline-danger" size="sm" className="flex-grow-1 fw-bold bg-white" onClick={(e) => { e.stopPropagation(); handleUpdateStatus(proof.id, 'rejected'); }}>Từ chối</Button>
                  </div>
                </div>
              </Card.Body>
            </Card>
          ))}
        </Col>

        {/* KHU VỰC PHÂN TÍCH CHI TIẾT AI BÊN PHẢI */}
        <Col md={5}>
          <Card className="dashboard-card h-100 border-0 shadow" style={{ position: 'sticky', top: '20px', borderRadius: '12px' }}>
            <Card.Body className="p-4">
              <div className="d-flex align-items-start mb-4">
                <div className="icon-box bg-dark text-white rounded me-3 shadow-sm"><i className="bi bi-cpu"></i></div>
                <div className="flex-grow-1">
                  <h5 className="fw-bold mb-1">Xác thực Thông minh AI</h5>
                  <small className="text-muted">Đang xem: <strong className="text-dark">{selectedProof ? `${selectedProof.id} - ${selectedProof.student_name}` : 'Chưa chọn'}</strong></small>
                </div>
              </div>

              <Row className="g-3 mb-4">
                <Col md={12}>
                  <div className="border rounded p-3 bg-light">
                    <p className="text-muted fw-bold small mb-2" style={{ letterSpacing: '0.5px' }}>LÝ DO TỪ TRỢ LÝ AI</p>
                    <div className="p-2.5 rounded bg-white border fw-semibold text-secondary mb-2" style={{ fontSize: '0.85rem' }}>
                      <i className="bi bi-chat-right-text-fill text-primary me-2"></i>
                      {selectedProof?.ai_note ? selectedProof.ai_note : "Hệ thống AI chưa phân tích dữ liệu văn bản từ hồ sơ này."}
                    </div>
                    <div className="d-flex justify-content-between text-muted small">
                      <span>Độ tương đồng chữ OCR:</span>
                      <strong className={selectedProof?.ocr_match_percent >= 66 ? 'text-success' : 'text-danger'}>{selectedProof?.ocr_match_percent || 0}%</strong>
                    </div>
                  </div>
                </Col>
              </Row>

              {/* KHU VỰC QUYẾT ĐỊNH CHÍNH THỨC CỦA CÁN BỘ */}
              <div className="border rounded p-3 bg-white shadow-xs">
                <h6 className="fw-bold mb-3 text-dark"><i className="bi bi-pencil-square me-2 text-muted"></i>Khu vực Quyết định</h6>
                <Form.Group className="mb-3">
                  <Form.Label className="small text-muted fw-semibold">Ghi chú duyệt / Lý do từ chối (Gửi cho sinh viên)</Form.Label>
                  <Form.Control 
                    as="textarea" 
                    rows={3} 
                    value={adminComment}
                    onChange={(e) => setAdminComment(e.target.value)}
                    placeholder="Nhập ghi chú hoặc lý do nếu từ chối minh chứng này..." 
                    className="shadow-none border-secondary border-opacity-25" 
                  />
                </Form.Group>
                
                <div className="d-flex gap-2">
                  <Button 
                    variant="success" 
                    className="flex-grow-1 fw-bold text-white d-flex align-items-center justify-content-center btn-indigo-primary"
                    disabled={!selectedProof}
                    onClick={() => selectedProof && handleUpdateStatus(selectedProof.id, 'approved')}
                  >
                    <i className="bi bi-check-circle me-2"></i> Chấp thuận
                  </Button>
                  <Button 
                    variant="danger" 
                    className="flex-grow-1 fw-bold d-flex align-items-center justify-content-center"
                    disabled={!selectedProof}
                    onClick={() => selectedProof && handleUpdateStatus(selectedProof.id, 'rejected')}
                  >
                    <i className="bi bi-x-circle me-2"></i> Từ chối hồ sơ
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

{/* ================= MODAL PHÓNG TO & THU NHỎ ẢNH ĐỘNG (LIGHTBOX ZOOM) ================= */}
      <Modal 
        show={showZoomModal} 
        onHide={() => {
          setShowZoomModal(false);
          // Tự động reset lại kích thước ảnh về 100% khi đóng modal
          const img = document.getElementById('movable-zoom-img');
          if (img) { img.style.transform = 'scale(1) translate(0px, 0px)'; }
        }} 
        centered 
        size="lg"
        dialogClassName="modal-zoom-custom"
      >
        <Modal.Header closeButton className="border-0 bg-dark text-white py-2">
          <Modal.Title className="fs-6 fw-bold d-flex align-items-center gap-2">
            <i className="bi bi-search text-info"></i>
            Kính lúp đối soát: {selectedProof?.student_name} ({selectedProof?.mssv})
          </Modal.Title>
        </Modal.Header>
        
        <Modal.Body className="p-0 text-center bg-dark d-flex align-items-center justify-content-center position-relative" style={{ minHeight: '450px', overflow: 'hidden' }}>
          
          {/* THANH ĐIỀU KHIỂN NÚT BẤM ZOOM SỐNG ĐỘNG NẰM TRÊN ẢNH */}
          <div className="position-absolute top-0 start-50 translate-middle-x mt-3 d-flex gap-2 p-2 rounded-3 shadow" style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 10, border: '1px solid rgba(255,255,255,0.1)' }}>
            <Button 
              variant="link" 
              className="text-white p-1 text-decoration-none d-flex align-items-center justify-content-center" 
              style={{ width: '32px', height: '32px' }}
              onClick={() => {
                const img = document.getElementById('movable-zoom-img');
                if (img) {
                  // Thuật toán lấy scale hiện tại và tăng thêm 0.25 (Tối đa phóng 300%)
                  let currentScale = parseFloat(img.style.transform.match(/scale\(([^)]+)\)/)?.[1] || 1);
                  if (currentScale < 3) img.style.transform = `scale(${currentScale + 0.25})`;
                }
              }}
              title="Phóng to ảnh"
            >
              <i className="bi bi-zoom-in fs-5"></i>
            </Button>
            
            <div className="border-start border-secondary my-1"></div>

            <Button 
              variant="link" 
              className="text-white p-1 text-decoration-none d-flex align-items-center justify-content-center" 
              style={{ width: '32px', height: '32px' }}
              onClick={() => {
                const img = document.getElementById('movable-zoom-img');
                if (img) {
                  // Thuật toán giảm scale (Tối thiểu giữ nguyên 100%)
                  let currentScale = parseFloat(img.style.transform.match(/scale\(([^)]+)\)/)?.[1] || 1);
                  if (currentScale > 1) img.style.transform = `scale(${currentScale - 0.25})`;
                }
              }}
              title="Thu nhỏ ảnh"
            >
              <i className="bi bi-zoom-out fs-5"></i>
            </Button>

            <div className="border-start border-secondary my-1"></div>

            <Button 
              variant="link" 
              className="text-warning p-1 text-decoration-none d-flex align-items-center justify-content-center" 
              style={{ width: '32px', height: '32px' }}
              onClick={() => {
                const img = document.getElementById('movable-zoom-img');
                if (img) img.style.transform = 'scale(1)'; // Trở về mặc định ban đầu
              }}
              title="Đặt lại kích thước chuẩn"
            >
              <i className="bi bi-arrow-counterclockwise fs-5"></i>
            </Button>
          </div>

          {/* VÙNG CHỨA ẢNH ĐÃ ĐƯỢC TÍCH HỢP HIỆU ỨNG BIẾN ĐỔI CHUYỂN ĐỘNG */}
          <div className="w-100 h-100 d-flex align-items-center justify-content-center p-4" style={{ maxHeight: '75vh', overflow: 'auto' }}>
            {selectedProof?.image_url ? (
              <img 
                id="movable-zoom-img"
                src={`http://localhost:5000${selectedProof.image_url}`} 
                alt="Minh chứng phóng to" 
                className="img-fluid shadow-lg"
                style={{ 
                  maxHeight: '70vh', 
                  objectFit: 'contain', 
                  borderRadius: '6px',
                  transform: 'scale(1)', // Mặc định ban đầu
                  transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)', // Hiệu ứng zoom co giãn cực mịn
                  animation: 'zoomInEffect 0.2s ease-out'
                }} 
              />
            ) : (
              <div className="text-white opacity-50 py-5">Không tìm thấy file ảnh minh chứng gốc trên Server.</div>
            )}
          </div>
        </Modal.Body>
        
        <Modal.Footer className="bg-dark border-0 py-2 d-flex justify-content-between align-items-center">
          <small className="text-white-50">Mã minh chứng đối soát: {selectedProof?.id}</small>
          <div className="text-muted small d-none d-sm-block" style={{ fontSize: '0.75rem' }}>
            <i className="bi bi-info-circle me-1 text-info"></i>Mẹo: Bạn có thể phóng to tối đa 300% để check chữ mờ.
          </div>
          <Button variant="outline-light" size="sm" onClick={() => setShowZoomModal(false)} className="fw-semibold px-3 border-secondary text-white-50">
            Đóng cửa sổ
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Hiệu ứng Thumbnail bổ trợ */}
      <style>{`
        .img-thumbnail-hover:hover {
          transform: scale(1.04);
          box-shadow: 0 4px 15px rgba(0,0,0,0.2) !important;
        }
        @keyframes zoomInEffect {
          from { transform: scale(0.96); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
};

export default ProofApproval;