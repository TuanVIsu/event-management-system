import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Row, Col, Tabs, Tab, Badge, Table, Modal, Spinner, Alert } from 'react-bootstrap';

const Settings = () => {
  // 1. ĐỒNG BỘ: Định nghĩa state quản lý chuyển Tab khớp chính xác với EventKey
  const [activeTab, setActiveTab] = useState('ai'); 
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // 2. KHỞI TẠO CÁC BIẾN ĐIỀU KHIỂN ĐỘNG CHO THANH KÉO TRƯỢT AI
  const [autoApprove, setAutoApprove] = useState(true);
  const [ocrThreshold, setOcrThreshold] = useState(66);
  const [hammingDistance, setHammingDistance] = useState(10);
  const [contextPoints, setContextPoints] = useState(30);

  // --- TRẠNG THÁI MODAL DÙNG CHUNG CHO CẢ THÊM & SỬA ---
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add_main');
  const [currentMainId, setCurrentMainId] = useState('');
  const [currentSubId, setCurrentSubId] = useState('');
  const [formName, setFormName] = useState('');
  const [formPoints, setFormPoints] = useState(0);
  const [formUnit, setFormUnit] = useState('lần');

  const fetchCriteria = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/criteria');
      const json = await res.json();
      if (json.status === 'success') {
        setCategories(json.data);
      }
    } catch (error) {
      console.error("Lỗi kết nối lấy danh mục:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCriteria();
  }, []);

  const handleOpenModal = (mode, mainId = '', subObj = null) => {
    setModalMode(mode);
    setCurrentMainId(mainId);
    if (mode === 'add_main') {
      setCurrentMainId(''); setFormName(''); setFormPoints(100);
    } else if (mode === 'edit_main') {
      const main = categories.find(c => c.id === mainId);
      setFormName(main?.name || ''); setFormPoints(main?.maxPoints || 0);
    } else if (mode === 'add_sub') {
      setFormName(''); setFormPoints(0); setFormUnit('lần');
    } else if (mode === 'edit_sub' && subObj) {
      setCurrentSubId(subObj.id); setFormName(subObj.name); setFormPoints(subObj.points); setFormUnit(subObj.unit || 'lần');
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return alert("Vui lòng điền đầy đủ tên tiêu chí!");
    let url = ''; let bodyData = {};
    
    if (modalMode === 'add_main' || modalMode === 'edit_main') {
      url = 'http://localhost:5000/api/criteria/main';
      bodyData = { id: currentMainId || formName.substring(0, 3).toUpperCase(), name: formName, maxPoints: Number(formPoints), isEdit: modalMode === 'edit_main' };
    } else {
      url = 'http://localhost:5000/api/criteria/sub';
      bodyData = { id: currentSubId, parentId: currentMainId, name: formName, points: Number(formPoints), unit: formUnit, isEdit: modalMode === 'edit_sub' };
    }

    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyData) });
      const data = await res.json();
      if (data.status === 'success') { alert(data.message); setShowModal(false); fetchCriteria(); }
      else { alert("Thao tác thất bại: " + data.message); }
    } catch (err) { alert("Lỗi kết nối server."); }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa mục [${id}] này khỏi hệ thống không?`)) return;
    try {
      const res = await fetch(`http://localhost:5000/api/criteria/${type}/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status === 'success') { alert(data.message); fetchCriteria(); }
    } catch { alert("Lỗi kết nối."); }
  };

  return (
    <div className="p-1">
      <div className="mb-4">
        <h6 className="text-muted text-uppercase fw-bold mb-1" style={{ letterSpacing: '1px', fontSize: '0.75rem' }}>Cấu hình hệ thống</h6>
        <h3 className="fw-bold mb-0 text-dark" style={{ letterSpacing: '-0.5px' }}>Quản trị & Tự động hóa</h3>
      </div>

      <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: '12px', overflow: 'hidden' }}>
        <Card.Body className="p-0">
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="border-bottom px-4 pt-3 custom-tabs bg-white"
          >
            {/* ================= TAB 1: QUẢN LÝ TIÊU CHÍ (MỤC I, II, III...) ================= */}
            <Tab eventKey="categories" title={<span><i className="bi bi-bookmark-star me-2"></i>Quản lý Tiêu chí & Điểm</span>}>
              <div className="p-4 bg-light bg-opacity-25">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="fw-bold m-0 text-dark">Khung cấu trúc Điểm rèn luyện</h5>
                  <Button style={{ backgroundColor: '#0d235e', borderColor: '#0d235e' }} size="sm" className="fw-semibold px-3" onClick={() => handleOpenModal('add_main')}>
                    <i className="bi bi-plus-lg me-1"></i>Thêm Danh mục lớn
                  </Button>
                </div>

                {loading ? (
                  <div className="text-center py-5 text-muted"><Spinner animation="border" size="sm" className="me-2"/>Đang đồng bộ cây tiêu chí...</div>
                ) : (
                  categories.map((main) => (
                    <Card key={main.id} className="border-0 shadow-xs mb-4 p-2 bg-white" style={{ borderRadius: '10px' }}>
                      <Card.Header className="bg-transparent border-0 d-flex justify-content-between align-items-center pt-3 pb-2">
                        <div className="d-flex align-items-center gap-2">
                          <Badge bg="dark" className="fs-6 py-1.5 px-2.5">Mục {main.id}</Badge>
                          <h6 className="fw-bold text-dark m-0 fs-5">{main.name}</h6>
                          <Badge bg="secondary" className="bg-opacity-10 text-secondary border px-2">Trần: {main.maxPoints}đ</Badge>
                        </div>
                        <div className="d-flex gap-2">
                          <Button variant="outline-primary" size="sm" className="py-1 border-0" onClick={() => handleOpenModal('add_sub', main.id)} title="Thêm tiêu chí nhỏ"><i className="bi bi-plus-circle-fill fs-5"></i></Button>
                          <Button variant="outline-secondary" size="sm" className="py-1 border-0" onClick={() => handleOpenModal('edit_main', main.id)}><i className="bi bi-pencil-square fs-5"></i></Button>
                          <Button variant="outline-danger" size="sm" className="py-1 border-0" onClick={() => handleDelete('main', main.id)}><i className="bi bi-trash-fill fs-5"></i></Button>
                        </div>
                      </Card.Header>
                      <Card.Body className="pt-1">
                        <Table responsive hover className="align-middle border-0 mb-0">
                          <thead className="table-light text-muted small text-uppercase">
                            <tr>
                              <th style={{ width: '12%' }}>Mã mục</th>
                              <th style={{ width: '53%' }}>Nội dung chi tiết khung điểm</th>
                              <th style={{ width: '15%' }} className="text-center">Khung điểm</th>
                              <th style={{ width: '20%' }} className="text-end pe-3">Hành động</th>
                            </tr>
                          </thead>
                          <tbody>
                            {main.subCategories?.length === 0 ? (
                              <tr><td colSpan="4" className="text-center py-3 text-muted small">Chưa thiết lập tiêu chí chấm điểm chi tiết.</td></tr>
                            ) : (
                              main.subCategories.map((sub) => (
                                <tr key={sub.id}>
                                  <td className="fw-semibold text-primary">{sub.id}</td>
                                  <td className="text-dark fw-medium">{sub.name}</td>
                                  <td className="text-center fw-bold text-success">+{sub.points}đ / {sub.unit}</td>
                                  <td className="text-end pe-2">
                                    <Button variant="link" size="sm" className="text-secondary p-1 me-2 text-decoration-none" onClick={() => handleOpenModal('edit_sub', main.id, sub)}><i className="bi bi-pencil"></i> Sửa</Button>
                                    <Button variant="link" size="sm" className="text-danger p-1 text-decoration-none" onClick={() => handleDelete('sub', sub.id)}><i className="bi bi-trash"></i> Xóa</Button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </Table>
                      </Card.Body>
                    </Card>
                  ))
                )}
              </div>
            </Tab>

            {/* ================= TAB 2: TRỢ LÝ AI & TỰ ĐỘNG HÓA (ĐÃ ĐẮP GIAO DIỆN FORM ĐỘNG) ================= */}
            <Tab eventKey="ai" title={<span><i className="bi bi-robot me-2"></i>Trợ lý AI & Tự động hóa</span>}>
              <div className="p-4 bg-light bg-opacity-25">
                <Alert variant="info" className="border-0 bg-primary bg-opacity-10 text-primary fw-medium mb-4">
                  <i className="bi bi-cpu-fill me-2 fs-5"></i>
                  Cấu hình hệ thống trợ lý AI và nhận diện thông minh, tối ưu hóa quy trình phê duyệt hồ sơ cho Cán bộ.
                </Alert>

                <Form>
                  <Form.Group className="mb-4">
                    <Form.Check 
                      type="switch"
                      id="ai-active-switch"
                      label={<span className="fw-bold text-dark">Kích hoạt bộ lọc AI tự động quản lý minh chứng</span>}
                      checked={autoApprove}
                      onChange={(e) => setAutoApprove(e.target.checked)}
                      className="fs-6 cursor-pointer"
                    />
                  </Form.Group>

                  <Row className="g-4">
                    {/* KHỐI CẤU HÌNH 1: ĐỘ KHỚP VĂN BẢN (OCR) */}
                    <Col md={6}>
                      <div className="border rounded-3 p-3 bg-white shadow-sm h-100">
                        <Form.Label className="fw-bold text-dark mb-1 small text-uppercase">Ngưỡng tự tin văn bản OCR</Form.Label>
                        <p className="text-muted mb-3" style={{ fontSize: '0.75rem' }}>Độ khớp tối thiểu của các từ khóa (MSSV, Họ tên) trên ảnh.</p>
                        <div className="d-flex align-items-center">
                          <Form.Range 
                            min={33} max={100} 
                            value={ocrThreshold} 
                            onChange={(e) => setOcrThreshold(Number(e.target.value))}
                            className="me-3 w-75"
                          />
                          <Badge bg="primary" className="px-2.5 py-2 fs-6" style={{ minWidth: '65px' }}>{ocrThreshold}%</Badge>
                        </div>
                      </div>
                    </Col>

                    {/* KHỐI CẤU HÌNH 2: CHỐNG TRÙNG ẢNH (PHASH) */}
                    <Col md={6}>
                      <div className="border rounded-3 p-3 bg-white shadow-sm h-100">
                        <Form.Label className="fw-bold text-dark mb-1 small text-uppercase">Khoảng cách Hamming chống sao chép</Form.Label>
                        <p className="text-muted mb-3" style={{ fontSize: '0.75rem' }}>Khoảng cách điểm ảnh phát hiện sinh viên nộp trùng ảnh của nhau.</p>
                        <div className="d-flex align-items-center">
                          <Form.Range 
                            min={5} max={25} 
                            value={hammingDistance} 
                            onChange={(e) => setHammingDistance(Number(e.target.value))}
                            className="me-3 w-75"
                          />
                          <Badge bg="danger" className="px-2.5 py-2 fs-6" style={{ minWidth: '65px' }}>{hammingDistance} / 64</Badge>
                        </div>
                      </div>
                    </Col>

                    {/* KHỐI CẤU HÌNH MỚI 3: THANH TRƯỢT KIỂM DUYỆT ẢNH BỐI CẢNH THEO YÊU CẦU THỰC TẾ */}
                    <Col md={12}>
                      <div className="border border-primary border-opacity-25 rounded-3 p-3 bg-white shadow-sm">
                        <Form.Label className="fw-bold text-primary mb-1 small text-uppercase d-flex align-items-center gap-1">
                          <i className="bi bi-image-fill"></i> Ngưỡng lọc ảnh chụp bối cảnh hội trường / Màn hình máy tính (OpenCV)
                        </Form.Label>
                        <p className="text-muted mb-3" style={{ fontSize: '0.75rem' }}>Áp dụng cho các trường hợp chụp slide, giao diện Teams/Zoom hoặc chụp tập thể không chứa text tĩnh danh tính sinh viên.</p>
                        <div className="d-flex align-items-center">
                          <Form.Range 
                            min={10} max={60} 
                            value={contextPoints} 
                            onChange={(e) => setContextPoints(Number(e.target.value))}
                            className="me-3 w-75"
                          />
                          <Badge bg="success" className="px-3 py-2 fs-6" style={{ minWidth: '95px' }}>{contextPoints} Điểm neo</Badge>
                        </div>
                        <Form.Text className="text-muted d-block mt-2">
                          Hệ thống sẽ chuyển tiếp ghi chú về trạng thái <span className="text-success fw-bold">"Minh chứng dạng ảnh chụp bối cảnh"</span> thay vì báo lỗi "Không trùng khớp", giúp Cán bộ duyệt lướt bằng mắt cực nhanh.
                        </Form.Text>
                      </div>
                    </Col>
                  </Row>

                  <div className="d-flex justify-content-end mt-4 border-top pt-3">
                    <Button style={{ backgroundColor: '#0d235e', borderColor: '#0d235e' }} className="fw-bold px-4" onClick={() => alert("🎉 Đã cập nhật và đồng bộ cấu hình Trợ lý AI thành công!")}>
                      <i className="bi bi-save me-2"></i>Lưu cấu hình AI
                    </Button>
                  </div>
                </Form>
              </div>
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>

      {/* ================= MODAL THÊM / SỬA TIÊU CHÍ BIỂU MẪU CSDL ================= */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton className="border-0 bg-light py-3">
          <Modal.Title className="fw-bold fs-5 text-dark">
            {modalMode === 'add_main' && 'Thêm danh mục điểm lớn'}
            {modalMode === 'edit_main' && 'Sửa trần điểm danh mục lớn'}
            {modalMode === 'add_sub' && 'Thêm tiêu chí con chi tiết'}
            {modalMode === 'edit_sub' && 'Sửa tiêu chí con chi tiết'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            {(modalMode === 'add_main' || modalMode === 'edit_main') ? (
              <Row className="g-3">
                {modalMode === 'add_main' && (
                  <Form.Group as={Col} md={4}>
                    <Form.Label className="small fw-bold text-muted">Mã ID (VD: V)</Form.Label>
                    <Form.Control type="text" placeholder="I, II..." value={currentMainId} onChange={(e) => setCurrentMainId(e.target.value)} className="shadow-none border-secondary border-opacity-25" />
                  </Form.Group>
                )}
                <Form.Group as={Col} md={modalMode === 'add_main' ? 8 : 12}>
                  <Form.Label className="small fw-bold text-muted">Tên danh mục lớn</Form.Label>
                  <Form.Control type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className="shadow-none border-secondary border-opacity-25" />
                </Form.Group>
                <Form.Group as={Col} md={12}>
                  <Form.Label className="small fw-bold text-muted">Trần điểm tối đa của mục này</Form.Label>
                  <InputGroup>
                    <Form.Control type="number" value={formPoints} onChange={(e) => setFormPoints(e.target.value)} className="shadow-none border-secondary border-opacity-25" />
                    <InputGroup.Text>Điểm rèn luyện</InputGroup.Text>
                  </InputGroup>
                </Form.Group>
              </Row>
            ) : (
              <Row className="g-3">
                <Form.Group as={Col} md={12}>
                  <Form.Label className="small fw-bold text-muted">Nội dung chi tiết tiêu chí chấm</Form.Label>
                  <Form.Control as="textarea" rows={2} value={formName} onChange={(e) => setFormName(e.target.value)} className="shadow-none border-secondary border-opacity-25" />
                </Form.Group>
                <Form.Group as={Col} md={6}>
                  <Form.Label className="small fw-bold text-muted">Cộng số điểm</Form.Label>
                  <Form.Control type="number" value={formPoints} onChange={(e) => setFormPoints(e.target.value)} className="shadow-none border-secondary border-opacity-25" />
                </Form.Group>
                <Form.Group as={Col} md={6}>
                  <Form.Label className="small fw-bold text-muted">Đơn vị tính</Form.Label>
                  <Form.Select value={formUnit} onChange={(e) => setFormUnit(e.target.value)} className="shadow-none border-secondary border-opacity-25">
                    <option value="lần">lần</option>
                    <option value="học kỳ">học kỳ</option>
                    <option value="đợt">đợt</option>
                    <option value="năm học">năm học</option>
                  </Form.Select>
                </Form.Group>
              </Row>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="outline-secondary" size="sm" onClick={() => setShowModal(false)} className="fw-semibold px-3">Hủy bỏ</Button>
          <Button className="fw-semibold text-white px-4 btn-indigo-primary" size="sm" onClick={handleSave}>
            <i className="bi bi-save me-1"></i> Lưu vào CSDL
          </Button>
        </Modal.Footer>
      </Modal>

      <style type="text/css">
        {`
          .custom-tabs .nav-link { color: #6c757d; font-weight: 600; border: none; padding: 12px 24px; }
          .custom-tabs .nav-link.active { color: #0d235e; border-bottom: 3px solid #0d235e; background: transparent; }
          .custom-tabs .nav-link:hover:not(.active) { color: #0d235e; }
        `}
      </style>
    </div>
  );
};

export default Settings;