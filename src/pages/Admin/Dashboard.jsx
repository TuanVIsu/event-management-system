import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Table, Badge, Spinner, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

const Dashboard = () => {
  const navigate = useNavigate();

  // --- STATES LƯU DỮ LIỆU TỪ DATABASE ---
  const [stats, setStats] = useState({ activeEvents: 0, totalAttendees: 0, attendanceTrend: '' });
  const [events, setEvents] = useState([]);
  const [allPendingProofs, setAllPendingProofs] = useState([]); 
  const [allActivities, setAllActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- STATES CHO BIỂU ĐỒ ---
  const [chartFilter, setChartFilter] = useState('week');
  const [chartData, setChartData] = useState({ values: [], labels: [] });

  // --- STATES CHO BỘ LỌC VÀ MODALS ---
  const [selectedEventFilter, setSelectedEventFilter] = useState('');

  // --- GỌI API TỪ CƠ SỞ DỮ LIỆU ---
  const loadData = (showLoading = true) => {
    if (showLoading) setLoading(true);
    const fetchJson = async (url) => {
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Request failed');
      }
      const data = await res.json();
      return data;
    };

    Promise.all([
      fetchJson('http://localhost:5000/api/dashboard/stats').catch(() => ({ activeEvents: 0, totalAttendees: 0, attendanceTrend: '' })),
      fetchJson('http://localhost:5000/api/events').catch(() => []),
      fetchJson('http://localhost:5000/api/dashboard/pending-proofs').catch(() => []),
      fetchJson('http://localhost:5000/api/dashboard/activities').catch(() => [])
    ])
    .then(([statsData, eventsData, proofsData, activitiesData]) => {
      setStats(statsData || { activeEvents: 0, totalAttendees: 0, attendanceTrend: '' });
      setEvents(Array.isArray(eventsData) ? eventsData : []);
      setAllPendingProofs(Array.isArray(proofsData) ? proofsData : []);
      setAllActivities(Array.isArray(activitiesData) ? activitiesData : []);
      
      updateChartData('week');
      if (showLoading) setLoading(false);
    })
    .catch(error => {
      console.error("Lỗi khi lấy dữ liệu từ CSDL:", error);
      if (showLoading) setLoading(false);
    });
  };

  useEffect(() => {
    loadData(true);
    const interval = setInterval(() => {
      loadData(false);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const pendingProofs = Array.isArray(allPendingProofs) ? allPendingProofs : [];
  const flaggedProofs = pendingProofs.filter(proof => proof?.phash_warning === 1);
  const safeProofsCount = pendingProofs.length - flaggedProofs.length;
  const displayProofs = selectedEventFilter 
    ? flaggedProofs.filter(proof => proof?.event_name === selectedEventFilter)
    : flaggedProofs;

  // ================= TÍNH NĂNG XUẤT EXCEL =================
  const handleExportExcel = () => {
    const statsData = [
      ['BÁO CÁO TỔNG QUAN HỆ THỐNG ĐIỂM DANH'],
      ['Thời gian xuất:', new Date().toLocaleString('vi-VN')],
      [''],
      ['1. THỐNG KÊ HOẠT ĐỘNG', ''],
      ['Sự kiện đang diễn ra:', stats.activeEvents],
      ['Tổng lượt điểm danh:', stats.totalAttendees],
      ['Xu hướng điểm danh:', stats.attendanceTrend || 'Không có dữ liệu'],
      [''],
      ['2. THỐNG KÊ KIỂM DUYỆT MINH CHỨNG', ''],
      ['Tổng số hồ sơ chờ duyệt:', allPendingProofs.length],
      ['Hồ sơ an toàn (AI duyệt):', safeProofsCount],
      ['Hồ sơ nghi vấn (Cần kiểm tra):', flaggedProofs.length],
    ];

    const wsStats = XLSX.utils.aoa_to_sheet(statsData);
    wsStats['!cols'] = [{ wch: 40 }, { wch: 25 }]; 

    const headers = ['HỌ VÀ TÊN', 'MSSV', 'SỰ KIỆN', 'NGÀY NỘP', 'TRẠNG THÁI AI', 'GHI CHÚ AI'];
    const rows = displayProofs.map(p => [
      p.full_name, 
      p.id, 
      p.event_name, 
      new Date(p.created_at).toLocaleString('vi-VN'),
      p.phash_warning === 1 ? 'CẢNH BÁO' : 'AN TOÀN',
      p.ai_note || 'Không có'
    ]);

    const wsDetails = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    wsDetails['!cols'] = [
      { wch: 25 }, { wch: 15 }, { wch: 35 }, { wch: 20 }, { wch: 15 }, { wch: 30 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsStats, "Tổng quan Thống kê");
    XLSX.utils.book_append_sheet(wb, wsDetails, "Chi tiết Minh chứng");

    XLSX.writeFile(wb, `Bao_Cao_He_Thong_${new Date().getTime()}.xlsx`);
  };

  const updateChartData = (filterType) => {
    setChartFilter(filterType);
    if (filterType === 'day') setChartData({ values: [20, 50, 30, 80, 100, 60], labels: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'] });
    else if (filterType === 'week') setChartData({ values: [40, 60, 100, 50, 70, 30, 20], labels: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] });
    else if (filterType === 'month') setChartData({ values: [70, 90, 60, 100], labels: ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'] });
  };

  const handleAutoApproveSafe = () => {
    if (safeProofsCount === 0) return;
    if (window.confirm(`Hệ thống sẽ phê duyệt tự động ${safeProofsCount} minh chứng an toàn. Bạn đồng ý chứ?`)) {
      setAllPendingProofs(flaggedProofs); 
      alert(`Đã phê duyệt xong ${safeProofsCount} hồ sơ hợp lệ!`);
    }
  };

  const getInitials = (name) => name ? (name.split(' ')[0][0] + (name.split(' ').pop()?.[0] || '')).toUpperCase() : 'SV';
  const getAvatarColor = (name) => ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b'][(name?.charCodeAt(0) || 0) % 5];

  return (
    <div className="p-4" style={{ backgroundColor: '#f8f9fc', minHeight: '100vh' }}>
      
      {/* HEADER SECTION */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold text-dark mb-1" style={{ letterSpacing: '-0.5px' }}>Tổng quan Hệ thống</h3>
          <p className="text-muted mb-0 small">Báo cáo tình hình số liệu và danh sách kiểm duyệt thời gian thực.</p>
        </div>
        <div>
          <Button 
            variant="white" 
            className="shadow-sm border fw-bold px-3 py-2 text-success d-flex align-items-center gap-2 transition-all"
            style={{ borderRadius: '10px', fontSize: '0.85rem' }}
            onClick={handleExportExcel}
          >
            <i className="bi bi-file-earmark-excel-fill fs-5"></i> Xuất báo cáo Excel
          </Button>
        </div>
      </div>

      {/* ================= THẺ THỐNG KÊ (KPI CARDS) ================= */}
      <Row className="mb-4 g-3">
        <Col md={4}>
          <Card className="border-0 shadow-sm border-start border-primary border-4 py-2 transition-hover" style={{ borderRadius: '12px' }}>
            <Card.Body className="d-flex justify-content-between align-items-center px-4">
              <div>
                <p className="text-primary fw-bold text-uppercase mb-1 small" style={{ letterSpacing: '0.5px', fontSize: '0.75rem' }}>Sự kiện đang diễn ra</p>
                <h3 className="fw-bold text-gray-800 mb-0">{loading ? <Spinner animation="border" size="sm" variant="primary" /> : stats.activeEvents}</h3>
              </div>
              <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', backgroundColor: '#eaecf4' }}>
                <i className="bi bi-calendar-event text-primary fs-4"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="border-0 shadow-sm border-start border-success border-4 py-2 transition-hover" style={{ borderRadius: '12px' }}>
            <Card.Body className="d-flex justify-content-between align-items-center px-4">
              <div>
                <p className="text-success fw-bold text-uppercase mb-1 small" style={{ letterSpacing: '0.5px', fontSize: '0.75rem' }}>Lượt sinh viên điểm danh</p>
                <h3 className="fw-bold text-gray-800 mb-0">{loading ? <Spinner animation="border" size="sm" variant="success" /> : (stats.totalAttendees?.toLocaleString() || 0)}</h3>
              </div>
              <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', backgroundColor: '#e5f9f0' }}>
                <i className="bi bi-person-check text-success fs-4"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className={`border-0 shadow-sm border-start border-${flaggedProofs.length > 0 ? 'danger' : 'warning'} border-4 py-2 transition-hover`} style={{ borderRadius: '12px' }}>
            <Card.Body className="d-flex justify-content-between align-items-center px-4">
              <div>
                <p className={`text-${flaggedProofs.length > 0 ? 'danger' : 'warning'} fw-bold text-uppercase mb-1 small`} style={{ letterSpacing: '0.5px', fontSize: '0.75rem' }}>Minh chứng chờ duyệt</p>
                <h3 className="fw-bold text-gray-800 mb-0">{loading ? <Spinner animation="border" size="sm" /> : allPendingProofs.length}</h3>
              </div>
              <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', backgroundColor: flaggedProofs.length > 0 ? '#fde8e8' : '#fef5e6' }}>
                <i className={`bi bi-exclamation-octagon text-${flaggedProofs.length > 0 ? 'danger' : 'warning'} fs-4`}></i>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ================= BIỂU ĐỒ & HOẠT ĐỘNG GẦN ĐÂY ================= */}
      <Row className="mb-4 g-3">
        {/* KHÔNG GIAN ĐỒ THỊ */}
        <Col lg={8}>
          <Card className="border-0 shadow-sm" style={{ borderRadius: '12px' }}>
            <Card.Header className="bg-white border-0 py-3 d-flex justify-content-between align-items-center">
              <div>
                <h6 className="m-0 fw-bold text-dark">Lưu lượng Điểm danh</h6>
              </div>
              <Form.Select 
                size="sm" 
                className="border-gray-300 shadow-sm" 
                style={{ width: 'auto', borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer' }} 
                value={chartFilter} 
                onChange={(e) => updateChartData(e.target.value)}
              >
                <option value="day">Hôm nay</option>
                <option value="week">7 Ngày qua</option>
                <option value="month">Tháng này</option>
              </Form.Select>
            </Card.Header>
            <Card.Body className="p-4">
              <div className="d-flex align-items-end justify-content-between pt-3" style={{ height: '180px', borderBottom: '1px solid #eaecf4' }}>
                {chartData.values.map((val, index) => {
                  const isMax = val === 100;
                  return (
                    <div key={index} className="d-flex flex-column align-items-center flex-grow-1" style={{ position: 'relative' }}>
                      <span className="small fw-bold text-muted mb-1" style={{ fontSize: '0.7rem' }}>{val}%</span>
                      <div 
                        className="w-50 rounded-top" 
                        style={{ 
                          height: `${val * 1.3}px`, 
                          background: isMax 
                            ? 'linear-gradient(180deg, #4e73df 0%, #224abe 100%)' 
                            : 'linear-gradient(180deg, #cbd5e1 0%, #94a3b8 100%)',
                          boxShadow: isMax ? '0 4px 12px rgba(78, 115, 223, 0.3)' : 'none',
                          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                      ></div>
                    </div>
                  );
                })}
              </div>
              <div className="d-flex justify-content-between mt-3 text-uppercase text-muted fw-bold" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                {chartData.labels.map((label, index) => (
                  <span key={index} className="text-center flex-grow-1">{label}</span>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>

{/* HOẠT ĐỘNG GẦN ĐÂY - CHUYỂN HƯỚNG ĐÚNG SỰ KIỆN ĐƯỢC CHỌN */}
<Col lg={4}>
  <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
    <Card.Header className="bg-white border-0 py-3 d-flex justify-content-between align-items-center">
      <h6 className="m-0 fw-bold text-dark">Sự kiện mới cập nhật</h6>
      <Button 
        variant="link" 
        className="text-decoration-none text-primary fw-bold p-0 small" 
        onClick={() => navigate('/admin/events')}
      >
        Xem tất cả
      </Button>
    </Card.Header>
    <Card.Body className="px-3 py-2" style={{ maxHeight: '360px', overflowY: 'auto' }}>
      {allActivities.length === 0 && !loading ? (
        <div className="text-muted text-center py-5 small">Chưa có hoạt động tạo hoặc cập nhật sự kiện gần đây.</div>
      ) : (
        allActivities.map(activity => (
          <div 
            key={activity.id} 
            className="d-flex align-items-start p-2.5 mb-2 rounded border-bottom border-light transition-all cursor-pointer dynamic-activity-item"
            style={{ backgroundColor: '#f8f9fc' }}
            // CHỈNH SỬA TẠI ĐÂY: Chuyển hướng trực tiếp kèm theo ID của sự kiện được click
            onClick={() => navigate(`/admin/events?id=${activity.id}`)} 
            title="Bấm để xem chi tiết sự kiện này bên trang quản lý"
          >
            <div className="bg-primary bg-opacity-10 text-primary rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}>
              <i className="bi bi-calendar-plus-fill" style={{ fontSize: '0.95rem' }}></i>
            </div>
            <div className="w-100">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <p className="mb-0 text-dark fw-bold text-truncate" style={{ fontSize: '0.8rem', maxWidth: '160px' }}>
                  {activity.message}
                </p>
                <Badge 
                  bg={activity.status === 'Đang diễn ra' ? 'success' : 'warning'} 
                  className={activity.status === 'Đang diễn ra' ? 'text-white' : 'text-dark'}
                  style={{ fontSize: '0.6rem', padding: '3px 6px', fontWeight: 'bold' }}
                >
                  {activity.status || 'Sắp diễn ra'}
                </Badge>
              </div>
              <small className="text-muted d-block mb-1" style={{ fontSize: '0.75rem' }}>{activity.subMessage}</small>
              <span className="text-muted d-block" style={{ fontSize: '0.65rem' }}>
                <i className="bi bi-clock-history me-1"></i>{activity.time}
              </span>
            </div>
          </div>
        ))
      )}
    </Card.Body>
  </Card>
</Col>
      </Row>

      {/* ================= BẢNG MINH CHỨNG HOÀN THIỆN SINH ĐỘNG ================= */}
      <Card className="border-0 shadow-sm" style={{ borderRadius: '12px', overflow: 'hidden' }}>
        <Card.Header className="bg-white py-3 border-0 d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div className="d-flex align-items-center flex-wrap gap-2">
            <h6 className="m-0 fw-bold text-dark me-3">Hồ sơ cần kiểm tra thủ công</h6>
            <Form.Select 
              size="sm" 
              className="border-gray-300 shadow-sm" 
              style={{ width: '220px', borderRadius: '8px', fontSize: '0.8rem' }}
              value={selectedEventFilter} 
              onChange={(e) => setSelectedEventFilter(e.target.value)}
            >
              <option value="">Tất cả sự kiện hệ thống</option>
              {events.map((evt, idx) => (<option key={evt.id || idx} value={evt.name}>{evt.name}</option>))}
            </Form.Select>
          </div>
          <div>
            <Button 
              variant="success" 
              size="sm" 
              className="px-3 py-2 border-0 fw-bold shadow-sm d-flex align-items-center gap-1" 
              style={{ borderRadius: '8px', backgroundColor: '#1cc88a' }}
              disabled={safeProofsCount === 0 || loading} 
              onClick={handleAutoApproveSafe}
            >
              <i className="bi bi-shield-check fs-6"></i> Duyệt nhanh {safeProofsCount} hồ sơ an toàn
            </Button>
          </div>
        </Card.Header>
        
        <Table responsive hover className="align-middle mb-0 custom-dashboard-table">
          <thead style={{ backgroundColor: '#f8f9fc', color: '#4e73df', fontSize: '0.75rem', letterSpacing: '0.5px' }} className="fw-bold text-uppercase border-bottom">
            <tr>
              <th className="py-3 px-4">Sinh viên nộp</th>
              <th className="py-3">Tên sự kiện / Chiến dịch</th>
              <th className="py-3">Thời gian</th>
              <th className="py-3">Trạng thái AI</th>
              <th className="py-3 text-center">Hành động</th>
            </tr>
          </thead>
          <tbody style={{ fontSize: '0.85rem' }} className="border-0">
            {loading ? (
              <tr><td colSpan="5" className="text-center py-5 text-muted"><Spinner animation="border" variant="primary" size="sm" className="me-2"/>Đang liên kết dữ liệu hệ thống...</td></tr>
            ) : displayProofs.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-5 text-muted fw-medium"><i className="bi bi-patch-check-fill text-success fs-4 d-block mb-2"></i>Tuyệt vời! Không phát hiện hồ sơ nào có dấu hiệu trùng lặp gian lận.</td></tr>
            ) : (
              displayProofs.map((proof) => {
                const avatarBg = getAvatarColor(proof.full_name);
                return (
                  <tr key={proof.id} style={{ transition: 'all 0.2s' }}>
                    <td className="px-4 py-3">
                      <div className="d-flex align-items-center">
                        <div 
                          className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold me-3 shadow-sm" 
                          style={{ width: '36px', height: '36px', backgroundColor: avatarBg, fontSize: '0.8rem' }}
                        >
                          {getInitials(proof.full_name)}
                        </div>
                        <div>
                          <span className="fw-bold text-dark d-block mb-0">{proof.full_name}</span>
                          <small className="text-muted style-code">{proof.id}</small>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 fw-medium text-secondary">{proof.event_name}</td>
                    <td className="text-muted py-3">
                      <i className="bi bi-clock me-1"></i>
                      {new Date(proof.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="py-3">
                      <Badge 
                        bg="none" 
                        className="text-danger border border-danger border-opacity-50 px-2 py-1.5 d-inline-flex align-items-center gap-1" 
                        style={{ fontSize: '0.7rem', backgroundColor: '#fff5f5', borderRadius: '6px' }}
                      >
                        <span className="spinner-grow spinner-grow-sm text-danger" role="status" style={{ width: '6px', height: '6px' }}></span>
                        CẢNH BÁO: {proof.ai_note?.toUpperCase() || 'PHASH TRÙNG LẶP'}
                      </Badge>
                    </td>
                    <td className="py-3 text-center">
                      <Button 
                        variant="primary" 
                        size="sm"
                        className="px-3 border-0 shadow-sm fw-bold btn-view-detail" 
                        style={{ fontSize: '0.75rem', borderRadius: '6px', backgroundColor: '#4e73df' }}
                        onClick={() => navigate('/admin/evidence')}
                      >
                        Đối soát thủ công
                      </Button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </Table>
      </Card>

      {/* CSS Nhỏ bổ trợ trực tiếp */}
      <style>{`
        .transition-hover:hover {
          transform: translateY(-3px);
          box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.08) !important;
          transition: all 0.25s ease-in-out;
        }
        .transition-hover { transition: all 0.25s ease-in-out; }
        .custom-dashboard-table tbody tr:hover {
          background-color: #f8f9fc !important;
        }
        .style-code {
          font-family: 'Courier New', Courier, monospace;
          font-weight: bold;
        }
        .dynamic-activity-item:hover {
          background-color: #f1f5f9 !important;
          border-left: 3px solid #1cc88a;
          padding-left: 5px;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;