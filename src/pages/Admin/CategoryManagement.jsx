import React, { useState } from 'react';
import { Card, Table, Button, Modal, Form, Badge, Row, Col } from 'react-bootstrap';

const CategoryManagement = () => {
  // Dữ liệu mẫu mô phỏng từ file "Dự thảo - Phiếu rèn luyện sinh viên"
  const [categories, setCategories] = useState([
    {
      id: 'I',
      name: 'I. Đánh giá về ý thức tham gia học tập',
      maxPoints: 20,
      subCategories: [
        { id: 'I_1', name: 'Sinh viên có điểm trung bình học tập tích lũy từ thăng điểm 4', points: 5, unit: 'học kỳ' },
        { id: 'I_2', name: 'Có giấy chứng nhận tham gia học các lớp chuyên đề kỹ năng học tập', points: 3, unit: 'học kỳ' },
        { id: 'I_3', name: 'Hội thảo hoặc Tọa đàm do Khoa hoặc Trường tổ chức', points: 3, unit: 'lần' },
        { id: 'I_4', name: 'Các cuộc thi học thuật cấp Khoa hoặc Trường tổ chức', points: 7, unit: 'lần' },
      ]
    },
    {
      id: 'II',
      name: 'II. Đánh giá về ý thức chấp hành hành chính, nội quy, quy chế',
      maxPoints: 25,
      subCategories: [
        { id: 'II_1', name: 'Đăng ký học tập theo đúng quy định của Nhà trường', points: 5, unit: 'học kỳ' },
        { id: 'II_2', name: 'Chấp hành nghiêm túc các văn bản pháp luật, nội quy KTX', points: 10, unit: 'học kỳ' },
      ]
    }
  ]);

  // Các States xử lý Modal chỉnh sửa
  const [showEditModal, setShowEditModal] = useState(false);
  const [isMainCategory, setIsMainCategory] = useState(false);
  const [currentMainId, setCurrentMainId] = useState('');
  const [currentSubId, setCurrentSubId] = useState('');
  
  // Form States
  const [editName, setEditName] = useState('');
  const [editPoints, setEditPoints] = useState(0);

  // Mở modal chỉnh sửa Danh mục chính
  const handleEditMainCategory = (mainCat) => {
    setIsMainCategory(true);
    setCurrentMainId(mainCat.id);
    setEditName(mainCat.name);
    setEditPoints(mainCat.maxPoints);
    setShowEditModal(true);
  };

  // Mở modal chỉnh sửa Danh mục con
  const handleEditSubCategory = (mainId, subCat) => {
    setIsMainCategory(false);
    setCurrentMainId(mainId);
    setCurrentSubId(subCat.id);
    setEditName(subCat.name);
    setEditPoints(subCat.points);
    setShowEditModal(true);
  };

  // Lưu dữ liệu sau khi chỉnh sửa điểm hoặc tên
  const handleSave = () => {
    const updatedCategories = categories.map(mainCat => {
      if (isMainCategory && mainCat.id === currentMainId) {
        return { ...mainCat, name: editName, maxPoints: Number(editPoints) };
      } else if (!isMainCategory && mainCat.id === currentMainId) {
        const updatedSubs = mainCat.subCategories.map(sub => {
          if (sub.id === currentSubId) {
            return { ...sub, name: editName, points: Number(editPoints) };
          }
          return sub;
        });
        return { ...mainCat, subCategories: updatedSubs };
      }
      return mainCat;
    });

    setCategories(updatedCategories);
    setShowEditModal(false);
  };

  return (
    <>
      <div className="mb-4">
        <h6 className="text-muted text-uppercase fw-bold mb-1" style={{ letterSpacing: '1px', fontSize: '0.75rem' }}>Cấu hình tiêu chí</h6>
        <h3 className="fw-bold mb-0">Quản lý Danh mục & Khung điểm</h3>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <Table responsive hover className="align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: '60%' }}>Nội dung đánh giá / Danh mục</th>
                <th style={{ width: '20%' }} className="text-center">Điểm thiết lập</th>
                <th style={{ width: '20%' }} className="text-endpe-4">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((mainCat) => (
                <React.Fragment key={mainCat.id}>
                  {/* DÒNG DANH MỤC CHÍNH */}
                  <tr className="table-secondary table-opacity-10 fw-bold" style={{ backgroundColor: '#f1f5f9' }}>
                    <td className="text-dark py-3">
                      <i className="bi bi-folder-fill text-warning me-2"></i>
                      {mainCat.name}
                    </td>
                    <td className="text-center py-3">
                      <Badge bg="primary" style={{ backgroundColor: '#0d235e' }} className="px-2 py-1.5 fs-7">
                        Tối đa {mainCat.maxPoints} đ
                      </Badge>
                    </td>
                    <td className="text-end py-3 pe-4">
                      <Button variant="outline-primary" size="sm" className="fw-semibold btn-sm shadow-none" onClick={() => handleEditMainCategory(mainCat)}>
                        <i className="bi bi-pencil-square me-1"></i> Sửa trần điểm
                      </Button>
                    </td>
                  </tr>

                  {/* CÁC DÒNG DANH MỤC CON */}
                  {mainCat.subCategories.map((sub) => (
                    <tr key={sub.id}>
                      <td className="ps-4 text-secondary" style={{ fontSize: '0.9rem' }}>
                        <i className="bi bi-arrow-return-right text-muted me-2"></i>
                        {sub.name}
                      </td>
                      <td className="text-center text-success fw-semibold">
                        +{sub.points} đ / {sub.unit}
                      </td>
                      <td className="text-end pe-4">
                        <Button variant="outline-secondary" size="sm" className="btn-sm border-0" onClick={() => handleEditSubCategory(mainCat.id, sub)}>
                          <i className="bi bi-sliders me-1"></i> Sửa điểm
                        </Button>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* ================= MODAL CHỈNH SỬA DANH MỤC / ĐIỂM ================= */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold" style={{ fontSize: '1.1rem' }}>
            {isMainCategory ? 'Chỉnh sửa Trần điểm Danh mục' : 'Cấu hình khung điểm Nội dung'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold small text-muted">Tên danh mục / Nội dung tiêu chí</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={3} 
                value={editName} 
                onChange={(e) => setEditName(e.target.value)}
                className="shadow-none border-secondary border-opacity-25"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold small text-muted">
                {isMainCategory ? 'Điểm tối đa của mục chính (Trần điểm)' : 'Mức điểm cộng quy định'}
              </Form.Label>
              <Form.Control 
                type="number" 
                value={editPoints} 
                onChange={(e) => setEditPoints(e.target.value)}
                className="shadow-none border-secondary border-opacity-25"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button variant="outline-secondary" onClick={() => setShowEditModal(false)} className="fw-semibold">
            Hủy bỏ
          </Button>
          <Button style={{ backgroundColor: '#0d235e', borderColor: '#0d235e' }} onClick={handleSave} className="fw-semibold text-white">
            <i className="bi bi-save me-1"></i> Lưu thay đổi
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default CategoryManagement;