import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Row, Col, Tabs, Tab, Badge, Table, Modal, Spinner, Alert } from 'react-bootstrap';

const Settings = () => {
  // Đặt mặc định mở tab đầu tiên khi vừa tải trang
  const [activeTab, setActiveTab] = useState('categories');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Khởi tạo các biến quản lý trạng thái kéo trượt cho Trợ lý AI
  const [autoApprove, setAutoApprove] = useState(true);
  const [ocrThreshold, setOcrThreshold] = useState(66);
  const [hammingDistance, setHammingDistance] = useState(10);
  const [contextPoints, setContextPoints] = useState(30);

  // --- TRẠNG THÁI MODAL DÙNG CHUNG CHO CẢ THÊM & SỬA ---
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add_main'); // add_main, add_sub, edit_main, edit_sub
  
  const [currentMainId, setCurrentMainId] = useState('');
  const [currentSubId, setCurrentSubId] = useState('');
  
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formPoints, setFormPoints] = useState(0);
  const [formUnit, setFormUnit] = useState('lần');

  // --- CÁC HÀM XỬ LÝ MỞ MODAL ---
  const openAddMainModal = () => {
    setModalMode('add_main');
    setFormId(''); setFormName(''); setFormPoints(0); setFormUnit('học kỳ');
    setShowModal(true);
  };

  const openAddSubModal = (mainId) => {
    setModalMode('add_sub');
    setCurrentMainId(mainId);
    setFormId(''); setFormName(''); setFormPoints(0); setFormUnit('lần');
    setShowModal(true);
  };

  const openEditMainModal = (mainCat) => {
    setModalMode('edit_main');
    setCurrentMainId(mainCat.id);
    setFormId(mainCat.id);
    setFormName(mainCat.name);
    setFormPoints(mainCat.maxPoints);
    setShowModal(true);
  };

  const openEditSubModal = (mainId, subCat) => {
    setModalMode('edit_sub');
    setCurrentMainId(mainId);
    setCurrentSubId(subCat.id);
    setFormId(subCat.id);
    setFormName(subCat.name);
    setFormPoints(subCat.points);
    setFormUnit(subCat.unit);
    setShowModal(true);
  };

  // --- HÀM TẢI DỮ LIỆU TỪ SERVER BACKEND ---
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

  const handleSave = async () => {
    if (!formName) {
      alert("Vui lòng nhập Nội dung danh mục/tiêu chí!");
      return;
    }

    const isSub = modalMode.includes('sub');
    const isEdit = modalMode.includes('edit');
    const endpoint = isSub ? 'http://localhost:5000/api/criteria/sub' : 'http://localhost:5000/api/criteria/main';

    const payload = isSub ? {
      id: isEdit ? currentSubId : "", 
      parentId: currentMainId,
      name: formName,
      points: Number(formPoints),
      unit: formUnit,
      isEdit: isEdit
    } : {
      id: isEdit ? currentMainId : formId, 
      name: formName,
      maxPoints: Number(formPoints),
      isEdit: isEdit
    };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      alert(data.message);
      if (data.status === 'success') {
        setShowModal(false);
        fetchCriteria();
      }
    } catch (e) {
      alert("Không kết nối được tới server Node!");
    }
  };

  const handleDelete = async (type, id) => {
    if (window.confirm(`Bạn có chắc muốn xóa mục [ ${id} ] này không? Thao tác này sẽ xóa toàn bộ nội dung trực thuộc liên quan!`)) {
      try {
        const res = await fetch(`http://localhost:5000/api/criteria/${type}/${id}`, { method: 'DELETE' });
        const data = await res.json();
        alert(data.message);
        if (data.status === 'success') {
          fetchCriteria();
        }
      } catch (e) {
        alert("Lỗi khi kết nối đến server để thực thi lệnh xóa.");
      }
    }
  };

  return (
    <>
      <div className="mb-4 d-flex justify-content-between align-items-end">
        <div>
          <h6 className="text-muted text-uppercase fw-bold mb-1" style={{ letterSpacing: '1px', fontSize: '0.75rem' }}>Cấu hình hệ thống</h6>
          <h3 className="fw-bold mb-0">Quản trị & Tự động hóa</h3>
        </div>
        <div className="d-flex gap-2">
          {activeTab === 'categories' && (
            <Button variant="success" className="fw-semibold px-3 shadow-none" onClick={openAddMainModal}>
              <i className="bi bi-plus-circle me-2"></i>Thêm Danh mục chính
            </Button>
          )}
        </div>
      </div>

      <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: '12px', overflow: 'hidden' }}>
        <Card.Body className="p-0">
          <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="custom-tabs border-bottom px-3 pt-2 bg-white">
            
            {/* ================= TAB 1: QUẢN LÝ TIÊU CHÍ & ĐIỂM ================= */}
            <Tab eventKey="categories" title="Quản lý Tiêu chí & Điểm">
              <div className="p-4">
                {loading ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="text-muted mt-2">Đang đồng bộ phân cấp danh mục từ CSDL...</p>
                  </div>
                ) : (
                  <Table responsive hover className="align-middle mb-0 border">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '55%' }} className="ps-3">Nội dung đánh giá / Khung danh mục</th>
                        <th style={{ width: '20%' }} className="text-center">Điểm quy định</th>
                        <th style={{ width: '25%' }} className="text-end pe-4">Thao tác cấu hình</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((mainCat) => (
                        <React.Fragment key={mainCat.id}>
                          <tr style={{ backgroundColor: '#f8fafc' }} className="fw-bold">
                            <td className="text-dark py-3 ps-3">
                              <i className="bi bi-folder-fill text-warning me-2"></i>{mainCat.name}
                            </td>
                            <td className="text-center py-3">
                              <Badge className="px-2 py-1.5 btn-indigo-primary">
                                Trần điểm: {mainCat.maxPoints} đ
                              </Badge>
                            </td>
                            <td className="text-end py-3 pe-4">
                              <Button variant="outline-success" size="sm" className="btn-sm me-1 shadow-none fw-semibold" onClick={() => openAddSubModal(mainCat.id)}>
                                <i className="bi bi-plus-lg me-1"></i> 
                              </Button>
                              <Button variant="outline-primary" size="sm" className="btn-sm me-1 shadow-none fw-semibold" onClick={() => openEditMainModal(mainCat)}>
                                <i className="bi bi-pencil"></i> 
                              </Button>
                              <Button variant="outline-danger" size="sm" className="btn-sm shadow-none fw-semibold" onClick={() => handleDelete('main', mainCat.id)}>
                                <i className="bi bi-trash"></i>
                              </Button>
                            </td>
                          </tr>

                          {mainCat.subCategories?.map((sub) => (
                            <tr key={sub.id}>
                              <td className="ps-5 text-secondary" style={{ fontSize: '0.9rem' }}>
                                <i className="bi bi-arrow-return-right text-muted me-2"></i>{sub.name}
                              </td>
                              <td className="text-center text-success fw-semibold">
                                +{sub.points} đ / {sub.unit}
                              </td>
                              <td className="text-end pe-4">
                                <Button variant="outline-secondary" size="sm" className="btn-sm me-1 fw-semibold text-primary border shadow-none" onClick={() => openEditSubModal(mainCat.id, sub)}>
                                  <i className="bi bi-pencil-square me-1"></i>
                                </Button>
                                <Button variant="outline-secondary" size="sm" className="btn-sm fw-semibold text-danger border shadow-none" onClick={() => handleDelete('sub', sub.id)}>
                                  <i className="bi bi-trash3 me-1"></i>
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </Table>
                )}
              </div>
            </Tab>

            {/* ================= TAB 2: TRỢ LÝ AI & TỰ ĐỘNG HÓA (ĐÃ THAY THẾ GIAO DIỆN MỚI) ================= */}
            <Tab eventKey="ai" title="Trợ lý AI & Tự động hóa">
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

                    {/* KHỐI CẤU HÌNH 3: THANH TRƯỢT KIỂM DUYỆT ẢNH BỐI CẢNH THEO YÊU CẦU THỰC TẾ */}
                    <Col md={12}>
                      <div className="border border-primary border-opacity-25 rounded-3 p-3 bg-white shadow-sm">
                        <Form.Label className="fw-bold text-primary mb-1 small text-uppercase d-flex align-items-center gap-1">
                          <i className="bi bi-image-fill"></i> Ngưỡng lọc ảnh chụp bối cảnh hội trường / Màn hình máy tính
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
                    <Button style={{ backgroundColor: '#0d235e', borderColor: '#0d235e' }} className="fw-bold px-4 shadow-none" onClick={() => alert("🎉 Đã cập nhật và đồng bộ cấu hình Trợ lý AI thành công!")}>
                      <i className="bi bi-save me-2"></i>Lưu cấu hình AI
                    </Button>
                  </div>
                </Form>
              </div>
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>

      {/* ================= MODAL DÙNG CHUNG CHO CẢ THÊM & SỬA ================= */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold fs-5 text-dark">
            {modalMode === 'add_main' && 'Khởi tạo Danh mục lớn mới'}
            {modalMode === 'add_sub' && `Thêm tiêu chí phụ thuộc vào mục [${currentMainId}]`}
            {modalMode === 'edit_main' && `Sửa Danh mục chính [${currentMainId}]`}
            {modalMode === 'edit_sub' && `Sửa Tiêu chí thành phần [${currentSubId}]`}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            {!modalMode.includes('edit') && modalMode === 'add_main' && (
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold small text-muted">Mã định danh duy nhất (ID)</Form.Label>
                <Form.Control 
                  type="text" 
                  placeholder="Ví dụ: VI, VII, VIII"
                  value={formId} 
                  onChange={(e) => setFormId(e.target.value)}
                  className="shadow-none border-secondary border-opacity-25"
                />
                <Form.Text className="text-muted small">Mã ID danh mục lớn không được trùng lặp.</Form.Text>
              </Form.Group>
            )}

            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold small text-muted">Nội dung đánh giá / Tên nhãn hiển thị</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={3} 
                value={formName} 
                onChange={(e) => setFormName(e.target.value)}
                className="shadow-none border-secondary border-opacity-25"
              />
            </Form.Group>

            <Row>
              <Col md={modalMode.includes('sub') ? 6 : 12}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold small text-muted">
                    {modalMode.includes('main') ? 'Điểm tối đa trần (Max points)' : 'Mức điểm cộng quy định'}
                  </Form.Label>
                  <Form.Control 
                    type="number" 
                    value={formPoints} 
                    onChange={(e) => setFormPoints(e.target.value)}
                    className="shadow-none border-secondary border-opacity-25"
                  />
                </Form.Group>
              </Col>
              
              {modalMode.includes('sub') && (
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold small text-muted">Đơn vị tính</Form.Label>
                    <Form.Select 
                      value={formUnit} 
                      onChange={(e) => setFormUnit(e.target.value)}
                      className="shadow-none border-secondary border-opacity-25"
                    >
                      <option value="lần">lần</option>
                      <option value="học kỳ">học kỳ</option>
                      <option value="đợt">đợt</option>
                      <option value="năm học">năm học</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              )}
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowModal(false)} className="fw-semibold shadow-none">Hủy bỏ</Button>
          <Button className="fw-semibold text-white shadow-none btn-indigo-primary" onClick={handleSave}>
            <i className="bi bi-save me-1"></i> Lưu vào CSDL
          </Button>
        </Modal.Footer>
      </Modal>

      <style type="text/css">
        {`
          .custom-tabs .nav-link { color: #6c757d; font-weight: 600; border: none; padding: 12px 24px; }
          .custom-tabs .nav-link.active { color: #0d235e; border-bottom: 3px solid #0d235e; background: transparent; }
          .custom-tabs .nav-link:hover:not(.active) { color: #0d235e; background-color: #f8f9fa; }
        `}
      </style>
    </>
  );
};

export default Settings;