import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Card, Table, Button, Badge, Pagination, Modal, Form, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const UserManagement = ({ searchQuery }) => {
  // 1. State cho Danh bạ sinh viên
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [studentActivities, setStudentActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  // 2. Thêm State mới cho phần Thống kê
  const [currentUser, setCurrentUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterFaculty, setFilterFaculty] = useState('all');
  const [filterCohort, setFilterCohort] = useState('all');
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const getAvatarUrl = (avatar, fullName) => {
    if (!avatar) return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`;
    if (avatar.startsWith('http')) return avatar;
    if (avatar.startsWith('/')) return `http://localhost:5000${avatar}`;
    return `http://localhost:5000/${avatar}`;
  };

  const getModalAvatarUrl = (avatar, fullName) => {
    if (!avatar) return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=c7d2fe&color=3730a3&size=100&rounded=false&bold=true`;
    if (avatar.startsWith('http')) return avatar;
    if (avatar.startsWith('/')) return `http://localhost:5000${avatar}`;
    return `http://localhost:5000/${avatar}`;
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files[0];
    if (!file || !selectedStudent) return;

    const formData = new FormData();
    formData.append('id', selectedStudent.id);
    formData.append('avatar', file);

    try {
      const response = await axios.put('http://localhost:5000/api/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.user) {
        const newAvatar = response.data.user.avatar;
        updateStudentInState(selectedStudent.id, { avatar: newAvatar });
        setSelectedStudent(prev => ({ ...prev, avatar: newAvatar }));
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Lỗi cập nhật ảnh đại diện:', error);
      alert('Không thể cập nhật ảnh đại diện');
    }
  };

  // Gọi 2 API cùng lúc khi trang vừa load
  useEffect(() => {
    const fetchData = async () => {
      try {
        const storedUser = window.localStorage.getItem('user');
        if (storedUser) {
          try {
            setCurrentUser(JSON.parse(storedUser));
          } catch (parseErr) {
            console.warn('Không thể phân tích user từ localStorage', parseErr);
          }
        }

        // Lấy danh sách sinh viên
        const usersRes = await axios.get('http://localhost:5000/api/users');
        setStudents(usersRes.data);

      } catch (error) {
        console.error("Lỗi khi tải dữ liệu:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Hàm phụ trợ: Đánh giá trạng thái huy hiệu dựa trên điểm rèn luyện
  const getStatusBadge = (points) => {
    const pt = points || 0;
    if (pt >= 800) return <Badge bg="success" className="bg-opacity-25 text-success border border-success border-opacity-25 px-2 py-1">TỐT</Badge>;
    if (pt >= 500) return <Badge bg="info" className="bg-opacity-25 text-info border border-info border-opacity-25 px-2 py-1">KHÁ</Badge>;
    return <Badge bg="warning" className="bg-opacity-25 text-danger border border-danger border-opacity-25 px-2 py-1">CẢNH BÁO</Badge>;
  };

  const getCohortFromMssv = (mssv) => {
    if (!mssv) return '';
    const match = String(mssv).toUpperCase().match(/^[A-Z]{4}(\d{2})\d{5}$/);
    return match ? `20${match[1]}` : '';
  };

  const selectedCohort = selectedStudent ? getCohortFromMssv(selectedStudent.mssv) : '';

  const faculties = Array.from(new Set(students.map((student) => student.faculty || 'Chưa cập nhật'))).filter(Boolean);
  const cohorts = Array.from(new Set(students.map((student) => getCohortFromMssv(student.mssv)).filter(Boolean)));

  const filteredStudents = students.filter((student) => {
    const facultyName = student.faculty || 'Chưa cập nhật';
    const cohortName = getCohortFromMssv(student.mssv) || 'Chưa cập nhật';
    const facultyMatches = filterFaculty === 'all' || facultyName === filterFaculty;
    const cohortMatches = filterCohort === 'all' || cohortName === filterCohort;

    let searchMatches = true;
    if (searchQuery) {
      const query = searchQuery.toLowerCase().replace(/\s+/g, '');
      const name = (student.full_name || '').toLowerCase().replace(/\s+/g, '');
      const mssv = (student.mssv || '').toLowerCase();
      searchMatches = name.includes(query) || mssv.includes(query);
    }

    return facultyMatches && cohortMatches && searchMatches;
  });

  const totalStudents = students.length;
  const lockedCount = students.filter((student) => student.is_locked === 1 || student.status === 'locked').length;
  const classCommitteeCount = students.filter((student) => student.role === 'classCommittee').length;
  const activeCount = totalStudents - lockedCount;
  const isAdminView = currentUser?.role === 'admin';

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageStart = filteredStudents.length > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const pageEnd = Math.min(currentPage * pageSize, filteredStudents.length);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterFaculty, filterCohort]);

  const fetchStudentDetails = async (studentId, fallbackStudent = null) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/users/${studentId}`);
      const studentDetail = response.data || {};
      setSelectedStudent({ ...(fallbackStudent || {}), ...studentDetail });
    } catch (error) {
      console.error('Lỗi khi lấy chi tiết sinh viên:', error);
    }
  };

  const openStudentDetails = (student) => {
    setSelectedStudent(student);
    setDetailModalVisible(true);
    fetchStudentDetails(student.id, student);
    fetchStudentActivities(student.id);
  };

  const closeStudentDetails = () => {
    setDetailModalVisible(false);
    setSelectedStudent(null);
    setStudentActivities([]);
    setActivitiesLoading(false);
  };

  const fetchStudentActivities = async (studentId) => {
    setActivitiesLoading(true);
    try {
      const response = await axios.get(`http://localhost:5000/api/users/${studentId}/activities`);
      setStudentActivities(response.data || []);
    } catch (error) {
      console.error('Lỗi khi lấy hoạt động sinh viên:', error);
      setStudentActivities([]);
    } finally {
      setActivitiesLoading(false);
    }
  };

  const updateStudentInState = (id, updates) => {
    setStudents((prev) => prev.map((student) => (student.id === id ? { ...student, ...updates } : student)));
  };

  const handleToggleLock = async (student) => {
    const locked = student.is_locked === 1 || student.status === 'locked';
    const action = locked ? 'unlock' : 'lock';

    setActionLoading(true);
    try {
      const response = await axios.patch(`http://localhost:5000/api/users/${student.id}`, { action });
      if (response.data.success) {
        const updatedFields = {
          is_locked: response.data.is_locked ?? (action === 'lock' ? 1 : 0),
          status: response.data.status ?? (action === 'lock' ? 'locked' : 'active')
        };
        updateStudentInState(student.id, updatedFields);
        if (selectedStudent?.id === student.id) {
          setSelectedStudent((prev) => prev ? { ...prev, ...updatedFields } : prev);
        }
      }
    } catch (error) {
      console.error('Lỗi khi thay đổi trạng thái khóa:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeRole = async (student, targetRole) => {
    setActionLoading(true);
    try {
      const response = await axios.patch(`http://localhost:5000/api/users/${student.id}`, {
        action: 'grant_permission',
        targetRole,
        currentUserRole: currentUser?.role,
        currentUserId: currentUser?.id
      });
      if (response.data.success) {
        updateStudentInState(student.id, { role: response.data.role });
        if (selectedStudent?.id === student.id) {
          setSelectedStudent((prev) => prev ? { ...prev, role: response.data.role } : prev);
        }
      }
    } catch (error) {
      console.error('Lỗi khi cấp/quyền cho sinh viên:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const canGrantClassCommittee = currentUser?.role === 'admin';
  const canRevokeClassCommittee = currentUser && ['admin', 'classCommittee', 'teacher'].includes(currentUser.role);
  const isSelectedSelf = selectedStudent?.id === currentUser?.id;


  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div>
          <div className="text-uppercase text-muted small">Danh bạ người dùng</div>
          <h4 className="fw-bold mb-1">Tổng quan quản lý</h4>
          <p className="text-muted mb-0">Tổng hợp nhanh trạng thái tài khoản, khóa học và danh bạ sinh viên.</p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <Button variant="primary" size="sm">Thêm người dùng mới</Button>
          <Button variant="outline-secondary" size="sm">Xuất dữ liệu</Button>
        </div>
      </div>

      <Row className="g-3 mb-4">
        <Col md={3} sm={6} xs={12}>
          <Card className="dashboard-card h-100 border-0 shadow-sm">
            <Card.Body className="py-3">
              <div className="text-uppercase text-muted small">Tổng sinh viên</div>
              <div className="h4 mb-0 fw-bold">{totalStudents}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6} xs={12}>
          <Card className="dashboard-card h-100 border-0 shadow-sm">
            <Card.Body className="py-3">
              <div className="text-uppercase text-muted small">Đang hoạt động</div>
              <div className="h4 mb-0 fw-bold">{activeCount}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6} xs={12}>
          <Card className="dashboard-card h-100 border-0 shadow-sm">
            <Card.Body className="py-3">
              <div className="text-uppercase text-muted small">Khóa tài khoản</div>
              <div className="h4 mb-0 fw-bold">{lockedCount}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6} xs={12}>
          <Card className="dashboard-card h-100 border-0 shadow-sm">
            <Card.Body className="py-3">
              <div className="text-uppercase text-muted small">Cán bộ lớp</div>
              <div className="h4 mb-0 fw-bold">{classCommitteeCount}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ================= PHẦN 2: DANH BẠ SINH VIÊN ================= */}
      <Card className="dashboard-card border-0 shadow-sm mt-4">
        <Card.Body className="p-0">
          <div className="p-4 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-3">
            <h5 className="fw-bold mb-0 d-flex align-items-center">
              <i className="bi bi-mortarboard text-secondary me-2"></i> Danh bạ Sinh viên
            </h5>
            <div className="d-flex gap-2 flex-wrap align-items-center">
              {isAdminView && (
                <Form.Group controlId="filterFaculty" className="d-flex align-items-center gap-2 mb-0">
                  <Form.Label className="text-muted mb-0">Ngành:</Form.Label>
                  <Form.Select
                    size="sm"
                    value={filterFaculty}
                    onChange={(e) => setFilterFaculty(e.target.value)}
                  >
                    <option value="all">Tất cả ngành</option>
                    {faculties.map((faculty) => (
                      <option key={faculty} value={faculty}>{faculty}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              )}
              <Form.Group controlId="filterCohort" className="d-flex align-items-center gap-2 mb-0">
                <Form.Label className="text-muted mb-0">Khóa:</Form.Label>
                <Form.Select
                  size="sm"
                  value={filterCohort}
                  onChange={(e) => setFilterCohort(e.target.value)}
                >
                  <option value="all">Tất cả khóa</option>
                  {cohorts.map((cohort) => (
                    <option key={cohort} value={cohort}>{cohort}</option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Button variant="outline-secondary" size="sm" className="bg-white px-3" onClick={() => { setFilterFaculty('all'); setFilterCohort('all'); }}>
                <i className="bi bi-x-circle"></i>
              </Button>
            </div>
          </div>

          <Table hover responsive className="mb-0 align-middle">
            <thead className="bg-light text-muted" style={{ fontSize: '0.8rem' }}>
              <tr>
                <th className="py-3 px-4 text-uppercase">Họ và Tên</th>
                <th className="py-3 text-uppercase">MSSV</th>
                <th className="py-3 text-uppercase">{isAdminView ? 'Ngành / Lớp' : 'Lớp / Khóa'}</th>
                <th className="py-3 text-uppercase">Trạng thái</th>
                <th className="py-3 text-uppercase">Ví điểm rèn luyện</th>
                <th className="py-3 text-uppercase text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '0.9rem' }}>

              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted">
                    <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted">
                    Chưa có dữ liệu sinh viên trong hệ thống.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student) => {
                  const isLocked = student.is_locked === 1 || student.status === 'locked';
                  const isClassCommittee = student.role === 'classCommittee';
                  let rowClassName = '';
                  if (isLocked) rowClassName = 'table-danger bg-opacity-25';
                  else if (isClassCommittee) rowClassName = 'table-warning bg-opacity-25';

                  return (
                    <tr key={student.id} className={rowClassName}>
                      <td className="px-4 py-3">
                        <div className="d-flex align-items-center">
                          <img
                            src={getAvatarUrl(student.avatar, student.full_name)}
                            className="rounded-circle me-3"
                            width="36"
                            height="36"
                            alt="avatar"
                            style={{ objectFit: 'cover' }}
                          />
                          <div>
                            <div className="fw-bold text-dark">{student.full_name}</div>
                            <small className="text-muted">{student.email || 'Chưa cập nhật email'}</small>
                          </div>
                        </div>
                      </td>
                      <td className="fw-semibold">{student.mssv}</td>
                      <td>
                        {isAdminView ? (
                          <>
                            <div className="fw-semibold text-dark">{student.faculty || 'Chưa cập nhật'}</div>
                            <small className="text-muted">{student.chi_doan || 'Chưa xếp lớp'}</small>
                          </>
                        ) : (
                          <>
                            <div className="fw-semibold text-dark">{student.chi_doan || 'Chưa xếp lớp'}</div>
                            <small className="text-muted">{student.mssv}</small>
                          </>
                        )}
                      </td>
                      <td>{getStatusBadge(student.point_wallet)}</td>
                      <td className="fw-bold fs-6">
                        <span className={student.point_wallet > 0 ? "text-primary" : ""}>
                          {student.point_wallet || 0}
                        </span> <span className="small text-muted fw-normal">điểm</span>
                      </td>
                      <td className="text-center">
                        <Button variant="link" className="text-muted p-1" title="Xem chi tiết" onClick={() => openStudentDetails(student)}>
                          <i className="bi bi-eye"></i>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}

            </tbody>
          </Table>

          <div className="p-3 bg-light border-top rounded-bottom d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2">
            <div>
              <small className="text-muted">
                Hiển thị <strong className="text-dark">{pageStart} - {pageEnd}</strong> trong số <strong>{students.length}</strong> sinh viên
              </small>
            </div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <div className="d-flex align-items-center gap-1">
                <small className="text-muted">Hiển thị mỗi trang:</small>
                <select
                  className="form-select form-select-sm"
                  style={{ width: '90px' }}
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                </select>
              </div>
              <Pagination size="sm" className="mb-0">
                <Pagination.Prev
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                />
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <Pagination.Item
                    key={page}
                    active={currentPage === page}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Pagination.Item>
                ))}
                <Pagination.Next
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                />
              </Pagination>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* ================= GIAO DIỆN MODAL CHI TIẾT ĐƯỢC LÀM MỚI ================= */}
      <Modal show={detailModalVisible} onHide={closeStudentDetails} size="xl" centered backdrop="static" fullscreen="lg-down">
        {/* Modal Header & Actions */}
        <Modal.Header className="bg-white border-bottom align-items-center py-3 px-4">
          <div className="d-flex align-items-center flex-grow-1">
            <Button variant="link" className="text-dark p-0 me-3" onClick={closeStudentDetails}>
              <i className="bi bi-arrow-left fs-5"></i>
            </Button>
            <Modal.Title className="fw-bold fs-5 m-0">Chi tiết sinh viên</Modal.Title>
          </div>

          <div className="d-flex gap-2">
            <Button variant="light" className="text-dark fw-medium border shadow-sm px-3" onClick={closeStudentDetails}>
              Đóng
            </Button>
            {selectedStudent && (
              <>
                <Button
                  variant={selectedStudent.is_locked === 1 || selectedStudent.status === 'locked' ? 'success' : 'danger'}
                  onClick={() => handleToggleLock(selectedStudent)}
                  disabled={actionLoading}
                  className="fw-medium px-3 shadow-sm"
                >
                  {actionLoading ? <Spinner animation="border" size="sm" /> : (selectedStudent.is_locked === 1 || selectedStudent.status === 'locked' ? 'Mở khóa' : 'Khóa tài khoản')}
                </Button>

                {selectedStudent.role === 'student' && canGrantClassCommittee && !isSelectedSelf && (
                  <Button
                    style={{ backgroundColor: '#0f172a', borderColor: '#0f172a' }}
                    onClick={() => handleChangeRole(selectedStudent, 'classCommittee')}
                    disabled={actionLoading}
                    className="fw-medium px-3 shadow-sm"
                  >
                    {actionLoading ? <Spinner animation="border" size="sm" /> : 'Cấp quyền Cán bộ lớp'}
                  </Button>
                )}

                {selectedStudent.role === 'classCommittee' && canRevokeClassCommittee && !isSelectedSelf && (
                  <Button
                    variant="outline-danger"
                    onClick={() => handleChangeRole(selectedStudent, 'student')}
                    disabled={actionLoading}
                    className="fw-medium px-3 shadow-sm"
                  >
                    {actionLoading ? <Spinner animation="border" size="sm" /> : 'Thu hồi quyền'}
                  </Button>
                )}
              </>
            )}
          </div>
        </Modal.Header>

        <Modal.Body className="bg-light p-4">
          {selectedStudent ? (
            <div className="mx-auto" style={{ maxWidth: '1000px' }}>

              {/* Profile Banner */}
              <Card className="border-0 shadow-sm mb-4">
                <Card.Body className="p-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-4">

                  <div className="d-flex align-items-center gap-4">
                    {/* Avatar */}
                    <div className="position-relative">
                      <img
                        src={getModalAvatarUrl(selectedStudent.avatar, selectedStudent.full_name)}
                        alt="avatar"
                        className="rounded-3 shadow-sm"
                        style={{ width: '85px', height: '85px', objectFit: 'cover' }}
                      />
                    </div>

                    {/* Name & Tags */}
                    <div>
                      <h4 className="fw-bold mb-2 text-dark">{selectedStudent.full_name}</h4>
                      <div className="d-flex gap-2">
                        <Badge bg="light" text="primary" className="fw-normal border px-2 py-1" style={{ color: '#4338ca' }}>
                          ID: {selectedStudent.mssv}
                        </Badge>
                        <Badge bg="light" text="primary" className="fw-normal border px-2 py-1" style={{ color: '#4338ca' }}>
                          Role: {selectedStudent.role || 'student'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Points & Status */}
                  <div className="d-flex align-items-center gap-4 border-start ps-md-4 pt-3 pt-md-0 border-top border-md-top-0 border-top-md-none border-start-md">
                    <div>
                      <div className="text-muted fw-semibold small mb-1" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>ACTIVITY POINTS</div>
                      <div className="fw-bold text-primary fs-4">{selectedStudent.point_wallet || 0} <span className="fs-6 fw-semibold">điểm</span></div>
                    </div>
                    <div className="border-start ps-4 h-100 d-flex flex-column justify-content-center">
                      <div className="text-muted fw-semibold small mb-1" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>STATUS</div>
                      <div className="d-flex align-items-center fw-semibold" style={{ color: selectedStudent.is_locked === 1 || selectedStudent.status === 'locked' ? '#ef4444' : '#16a34a' }}>
                        <div className={`rounded-circle me-2 ${selectedStudent.is_locked === 1 || selectedStudent.status === 'locked' ? 'bg-danger' : 'bg-success'}`} style={{ width: 8, height: 8 }}></div>
                        {selectedStudent.is_locked === 1 || selectedStudent.status === 'locked' ? 'Đã khóa' : 'Hoạt động'}
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>

              {/* Information Cards Grid */}
              <Row className="g-4 mb-4">
                {/* Personal Info */}
                <Col md={6}>
                  <Card className="border-0 shadow-sm h-100">
                    <Card.Body className="p-4">
                      <div className="d-flex align-items-center mb-3 pb-2 border-bottom">
                        <i className="bi bi-person text-primary fs-5 me-2"></i>
                        <h6 className="fw-bold mb-0">Personal Information</h6>
                      </div>

                      <Row className="g-4 mt-1">
                        <Col xs={6}>
                          <div className="text-muted small mb-1" style={{ fontSize: '0.75rem' }}>Họ và tên</div>
                          <div className="fw-medium text-dark">{selectedStudent.full_name || 'Chưa cập nhật'}</div>
                        </Col>
                        <Col xs={6}>
                          <div className="text-muted small mb-1" style={{ fontSize: '0.75rem' }}>Mã số sinh viên</div>
                          <div className="fw-medium text-dark">{selectedStudent.mssv || 'Chưa cập nhật'}</div>
                        </Col>
                        <Col xs={12}>
                          <div className="text-muted small mb-1" style={{ fontSize: '0.75rem' }}>Email</div>
                          <div className="fw-medium text-dark">{selectedStudent.email || 'Chưa cập nhật'}</div>
                        </Col>
                        <Col xs={6}>
                          <div className="text-muted small mb-1" style={{ fontSize: '0.75rem' }}>Số điện thoại</div>
                          <div className="fw-medium text-dark">{selectedStudent.phone || selectedStudent.sdt || 'Chưa cập nhật'}</div>
                        </Col>

                      </Row>
                    </Card.Body>
                  </Card>
                </Col>

                {/* Academic Info */}
                <Col md={6}>
                  <Card className="border-0 shadow-sm h-100">
                    <Card.Body className="p-4">
                      <div className="d-flex align-items-center mb-3 pb-2 border-bottom">
                        <i className="bi bi-mortarboard text-primary fs-5 me-2"></i>
                        <h6 className="fw-bold mb-0">Academic Information</h6>
                      </div>

                      <Row className="g-4 mt-1">
                        <Col xs={12}>
                          <div className="text-muted small mb-1" style={{ fontSize: '0.75rem' }}>Ngành</div>
                          <div className="fw-medium text-dark">{selectedStudent.faculty || 'Chưa cập nhật'}</div>
                        </Col>
                        <Col xs={6}>
                          <div className="text-muted small mb-1" style={{ fontSize: '0.75rem' }}>Chi đoàn</div>
                          <div className="fw-medium text-dark">{selectedStudent.chi_doan || 'Chưa xếp lớp'}</div>
                        </Col>
                        <Col xs={6}>
                          <div className="text-muted small mb-1" style={{ fontSize: '0.75rem' }}>Vai trò</div>
                          <div className="fw-medium text-dark">{selectedStudent.role || 'student'}</div>
                        </Col>
                        <Col xs={6}>
                          <div className="text-muted small mb-1" style={{ fontSize: '0.75rem' }}>Ngày tạo</div>
                          <div className="fw-medium text-dark">{selectedStudent.created_at ? new Date(selectedStudent.created_at).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}</div>
                        </Col>

                      </Row>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Activities Card */}
              <Card className="border-0 shadow-sm mb-4">
                <Card.Header className="bg-white border-0 p-4 pb-2 d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center">
                    <i className="bi bi-clock-history text-primary fs-5 me-2"></i>
                    <h6 className="fw-bold mb-0">Hoạt động đã tham gia</h6>
                  </div>
                  <Button variant="link" className="text-primary text-decoration-none p-0 fw-medium" onClick={() => navigate(`/admin/users/${selectedStudent.id}/activities`)}>
                    Xem toàn bộ lịch sử <i className="bi bi-box-arrow-up-right ms-1" style={{ fontSize: '0.8rem' }}></i>
                  </Button>
                </Card.Header>
                <Card.Body className="p-4 pt-2">
                  {activitiesLoading ? (
                    <div className="text-center py-4 text-muted">
                      <Spinner animation="border" size="sm" className="me-2" />
                      Đang tải danh sách hoạt động...
                    </div>
                  ) : studentActivities.length === 0 ? (
                    <div className="text-center py-5">
                      <div className="d-inline-flex align-items-center justify-content-center bg-light rounded-3 mb-3" style={{ width: '60px', height: '60px' }}>
                        <i className="bi bi-calendar-x text-muted fs-3"></i>
                      </div>
                      <h6 className="fw-bold text-dark">Chưa có hoạt động nào.</h6>
                      <p className="text-muted small mb-0">Sinh viên này chưa tham gia bất kỳ sự kiện nào trong hệ thống.</p>
                    </div>
                  ) : (
                    <div className="d-flex flex-column gap-3 mt-2">
                      {studentActivities.slice(0, 3).map((activity, index) => (
                        <div key={`${activity.event_id}-${index}`} className="d-flex justify-content-between align-items-center border-bottom pb-3">
                          <div>
                            <div className="fw-semibold text-dark mb-1">{activity.event_name}</div>
                            <div className="text-muted small">
                              <i className="bi bi-calendar-check me-1"></i> {activity.checkin_time} <span className="mx-1">•</span> {activity.method}
                            </div>
                          </div>
                          <Badge bg="success" className="bg-opacity-10 text-success fw-normal px-2 py-1">Hoàn thành</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </Card.Body>
              </Card>

              {/* Administrative Note */}
              <div className="rounded-3 p-4 d-flex align-items-center shadow-sm" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', borderLeft: '4px solid #3b82f6' }}>
                <div>
                  <div className="text-primary fw-bold small mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>ADMINISTRATIVE NOTE</div>
                  <p className="text-dark mb-0" style={{ fontSize: '0.9rem' }}>
                    Verify all academic documentation before granting 'Cán bộ lớp' privileges to ensure compliance with student leadership regulations.
                  </p>
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center py-5 text-muted">
              <Spinner animation="border" className="me-2" /> Đang tải dữ liệu...
            </div>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
};

export default UserManagement;