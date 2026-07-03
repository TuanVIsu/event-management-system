/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';
import { Nav, Navbar, Form, InputGroup, Container, Badge, Modal, Button } from 'react-bootstrap';
import { Routes, Route, useNavigate, useLocation, Navigate, Outlet } from 'react-router-dom';
import './App.css';
// Import các trang Admin
import Dashboard from './pages/Admin/Dashboard';
import EventManagement from './pages/Admin/EventManagement';
import ProofApproval from './pages/Admin/ProofApproval';
import UserManagement from './pages/Admin/UserManagement';
import StudentActivityHistory from './pages/Admin/StudentActivityHistory';
import Settings from './pages/Admin/Settings';
import Support from './pages/Admin/Support';

// Import trang đăng nhập và trang Sinh viên
import Login from './pages/Login';
import Checkin from './pages/student/Checkin';
import { getTopEventMatch, matchesNaturalQuery, normalizeText } from './utils/searchUtils';

const buildAvatarUrl = (user) => {
  if (!user) return '';
  if (user.avatar && user.avatar.startsWith('/')) {
    return `http://localhost:5000${user.avatar}`;
  }
  if (user.avatar && (user.avatar.startsWith('data:') || user.avatar.startsWith('http://') || user.avatar.startsWith('https://'))) {
    return user.avatar;
  }
  if (user.avatar && user.avatar.startsWith('uploads/')) {
    return `http://localhost:5000/${user.avatar}`;
  }
  if (user.avatar) {
    return user.avatar;
  }
  const name = user.full_name || user.mssv || 'User';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
};

const getReadNotificationIds = (userId) => {
  if (!userId) return new Set();
  try {
    const stored = localStorage.getItem(`read_notifications_${userId}`);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
};

const saveReadNotificationIds = (userId, ids) => {
  if (!userId) return;
  try {
    localStorage.setItem(`read_notifications_${userId}`, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
};

const buildNotifications = (events, userId) => {
  const readIds = getReadNotificationIds(userId);
  const deletedIds = getDeletedNotificationIds(userId);
  const list = [];

  if (!events?.length) {
    if (!deletedIds.has('welcome')) {
      list.push({
        id: 'welcome',
        type: 'system',
        title: 'Chào mừng bạn trở lại',
        message: 'Hệ thống đang sẵn sàng để theo dõi các hoạt động của sinh viên.',
        time: 'Vừa xong',
        read: readIds.has('welcome'),
      });
    }
    return list;
  }

  events.slice(0, 6).forEach((event, index) => {
    const eventNotifId = `event-${event.id || index}`;
    const registrationNotifId = `registration-${event.id || index}`;

    if (!deletedIds.has(eventNotifId)) {
      list.push({
        id: eventNotifId,
        type: 'event_created',
        title: `Tạo mới sự kiện: ${event.name}`,
        message: `Thời gian tạo: ${event.date ? new Date(event.date).toLocaleString('vi-VN') : 'Đang cập nhật'} • Thời gian đóng: ${event.end_date ? new Date(event.end_date).toLocaleString('vi-VN') : 'Chưa cập nhật'}`,
        time: 'Mới',
        eventId: event.id,
        read: readIds.has(eventNotifId),
      });
    }

    if (!deletedIds.has(registrationNotifId)) {
      list.push({
        id: registrationNotifId,
        type: 'registration',
        title: `Đăng ký sự kiện: ${event.name}`,
        message: `Nhóm: ${event.category || 'Chưa phân loại'} • Hệ thống đã phân loại thuộc sự kiện ${event.name}`,
        time: 'Mới',
        eventId: event.id,
        read: readIds.has(registrationNotifId),
      });
    }
  });

  return list.slice(0, 8);
};

const deleteNotification = (userId, notifId) => {
  if (!userId) return;
  try {
    const stored = localStorage.getItem(`deleted_notifications_${userId}`);
    const deleted = stored ? new Set(JSON.parse(stored)) : new Set();
    deleted.add(notifId);
    localStorage.setItem(`deleted_notifications_${userId}`, JSON.stringify([...deleted]));
  } catch {
    // ignore
  }
};

const getDeletedNotificationIds = (userId) => {
  if (!userId) return new Set();
  try {
    const stored = localStorage.getItem(`deleted_notifications_${userId}`);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
};

// =========================================================
// GLOBAL SEARCH DROPDOWN COMPONENT
// =========================================================
const PAGES = [
  { name: 'Bảng điều khiển', path: '/admin/dashboard', icon: 'bi-grid-1x2-fill', desc: 'Tổng quan hệ thống' },
  { name: 'Quản lý Sự kiện', path: '/admin/events', icon: 'bi-calendar2-event', desc: 'Tạo và quản lý sự kiện' },
  { name: 'Phê duyệt Minh chứng', path: '/admin/evidence', icon: 'bi-shield-check', desc: 'Duyệt hồ sơ sinh viên' },
  { name: 'Quản lý Người dùng', path: '/admin/users', icon: 'bi-people', desc: 'Danh bạ sinh viên' },
  { name: 'Cài đặt hệ thống', path: '/admin/settings', icon: 'bi-gear', desc: 'Cấu hình ứng dụng' },
  { name: 'Hỗ trợ kỹ thuật', path: '/admin/support', icon: 'bi-question-circle', desc: 'Trợ giúp & hỗ trợ' },
];

const SearchDropdown = ({ results, onSelect }) => {
  if (!results || results.length === 0) return null;
  const groups = {};
  results.forEach(r => {
    if (!groups[r.type]) groups[r.type] = [];
    groups[r.type].push(r);
  });
  const typeLabels = {
    page: { label: 'Trang / Chức năng', icon: 'bi-layout-sidebar', color: '#6366f1' },
    event: { label: 'Sự kiện', icon: 'bi-calendar2-event', color: '#0ea5e9' },
    user: { label: 'Sinh viên / Người dùng', icon: 'bi-person-circle', color: '#10b981' },
    proof: { label: 'Minh chứng', icon: 'bi-shield-check', color: '#f59e0b' },
  };
  const order = ['page', 'event', 'user', 'proof'];
  return (
    <div
      className="position-absolute w-100 mt-1 bg-white border rounded-3 shadow"
      style={{ zIndex: 1050, top: '100%', maxHeight: '420px', overflowY: 'auto' }}
    >
      {order.filter(t => groups[t]?.length > 0).map(type => {
        const meta = typeLabels[type];
        return (
          <div key={type}>
            <div className="px-3 py-2 d-flex align-items-center gap-2" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <i className={`bi ${meta.icon}`} style={{ color: meta.color, fontSize: '0.8rem' }}></i>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{meta.label}</span>
              <span className="ms-auto badge rounded-pill" style={{ background: meta.color + '22', color: meta.color, fontSize: '0.68rem' }}>{groups[type].length}</span>
            </div>
            {groups[type].map((item, idx) => (
              <div
                key={idx}
                className="d-flex align-items-center px-3 py-2 search-result-item"
                style={{ cursor: 'pointer', borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                onClick={() => onSelect(item)}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0 me-3"
                  style={{ width: 32, height: 32, background: meta.color + '18', color: meta.color, fontSize: '0.9rem' }}>
                  <i className={`bi ${item.icon || meta.icon}`}></i>
                </div>
                <div className="flex-grow-1 overflow-hidden">
                  <div className="fw-semibold text-dark" style={{ fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                  {item.subtitle && <div className="text-muted" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.subtitle}</div>}
                </div>
                {item.badge && (
                  <span className="badge ms-2 flex-shrink-0" style={{ background: meta.color + '22', color: meta.color, fontSize: '0.68rem' }}>{item.badge}</span>
                )}
              </div>
            ))}
          </div>
        );
      })}
      <div className="px-3 py-2 text-center" style={{ borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
        <small className="text-muted" style={{ fontSize: '0.72rem' }}>Nhấn <kbd style={{ fontSize: '0.65rem' }}>Esc</kbd> để đóng • <kbd style={{ fontSize: '0.65rem' }}>Enter</kbd> để chọn kết quả đầu tiên</small>
      </div>
    </div>
  );
};

// SidebarItem được khai báo ngoài AdminLayout để tránh lỗi 'component created during render'
const SidebarItem = ({ path, icon, label }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = location.pathname.includes(path);
  return (
    <div
      className={`custom-sidebar-link ${isActive ? 'active-item' : ''}`} // Sử dụng class độc lập mới
      onClick={() => navigate(path)}
    >
      <i className={`bi ${icon}`}></i>
      {label}
    </div>
  );
};

// =========================================================
// COMPONENT LAYOUT CHO ADMIN (Bao gồm Sidebar + Header)
// =========================================================
const AdminLayout = ({
  user,
  handleLogout,
  searchQuery,
  setSearchQuery,
  searchResults,
  showSearchResults,
  setShowSearchResults,
  notifications,
  unreadCount,
  onSelectSearchResult,
  onOpenProfile,
  showNotifications,
  setShowNotifications,
  onMarkAllNotificationsRead,
  onDeleteNotification,
}) => {
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setShowSearchResults]);

// THAY THẾ ĐOẠN ĐẦU CỦA ADMINLAYOUT THÀNH NHƯ SAU:
return (
  <div className="d-flex bg-light min-vh-100">
    {/* Đã đổi class thành custom-sidebar */}
    <div className="custom-sidebar"> 
      {/* Đổi chữ và icon tiêu đề thành màu trắng (text-white) */}
      <div className="d-flex align-items-center mb-5 px-2">
        <i className="bi bi-bank fs-2 text-white me-3"></i>
        <div>
          <h5 className="fw-bold mb-0 text-white" style={{ fontSize: '1.15rem' }}>Điểm Rèn Luyện</h5>
          <small className="text-light text-opacity-50" style={{ fontSize: '0.8rem' }}>Hệ thống Quản trị</small>
        </div>
      </div>

      <Nav className="flex-column flex-grow-1">
        <SidebarItem path="/admin/dashboard" icon="bi-grid-1x2-fill" label="Bảng điều khiển" />

        {(user.role === 'admin' || user.role === 'teacher') && (
          <SidebarItem path="/admin/events" icon="bi-calendar2-event" label="Quản lý Sự kiện" />
        )}

        <SidebarItem path="/admin/evidence" icon="bi-shield-check" label="Phê duyệt Minh chứng" />
        <SidebarItem path="/admin/users" icon="bi-people" label="Quản lý Người dùng" />
      </Nav>

      <div className="mt-auto pt-3 border-top border-secondary border-opacity-25">
        {(user.role === 'admin' || user.role === 'teacher') && (
          <SidebarItem path="/admin/settings" icon="bi-gear" label="Cài đặt hệ thống" />
        )}

        <SidebarItem path="/admin/support" icon="bi-question-circle" label="Hỗ trợ kỹ thuật" />

        <div className="d-flex align-items-center py-2 px-3 rounded text-danger fw-semibold mt-3 bg-danger bg-opacity-10" style={{ cursor: 'pointer', fontSize: '0.95rem', transition: '0.2s' }} onClick={handleLogout}>
          <i className="bi bi-box-arrow-left fs-5 me-3"></i> Đăng xuất
        </div>
      </div>
    </div>

      <div className="d-flex flex-column flex-grow-1 bg-light" style={{ width: 'calc(100% - 270px)' }}>
        <Navbar bg="white" className="border-bottom px-4 py-3 sticky-top flex-shrink-0 justify-content-between">
          <div ref={searchRef} className="position-relative flex-grow-1 me-3" style={{ maxWidth: '520px' }}>
            <Form className="d-flex" onSubmit={(e) => { e.preventDefault(); if (searchResults.length > 0) onSelectSearchResult(searchResults[0]); }}>
              <InputGroup>
                <Form.Control
                  type="search"
                  placeholder="Tìm kiếm sự kiện, sinh viên, minh chứng..."
                  className="shadow-none"
                  style={{ background: showSearchResults && searchQuery ? '#eef2ff' : '#f8fafc', borderColor: showSearchResults && searchQuery ? '#818cf8' : '#e2e8f0', transition: 'all 0.2s', fontSize: '0.9rem' }}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchResults(true);
                  }}
                  onFocus={() => { if (searchQuery) setShowSearchResults(true); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (searchResults.length > 0) { onSelectSearchResult(searchResults[0]); }
                      else { setShowSearchResults(false); }
                    }
                    if (e.key === 'Escape') {
                      setShowSearchResults(false);
                      setSearchQuery('');
                    }
                  }}
                />
                {searchQuery && (
                  <InputGroup.Text
                    style={{ background: showSearchResults ? '#eef2ff' : '#f8fafc', borderColor: showSearchResults ? '#818cf8' : '#e2e8f0', cursor: 'pointer', transition: 'all 0.2s' }}
                    onClick={() => { setSearchQuery(''); setShowSearchResults(false); }}
                  >
                    <i className="bi bi-x text-muted"></i>
                  </InputGroup.Text>
                )}
              </InputGroup>
            </Form>
            {showSearchResults && searchQuery.trim() && searchResults.length > 0 && (
              <SearchDropdown
                results={searchResults}
                onSelect={onSelectSearchResult}
                searchQuery={searchQuery}
              />
            )}
            {showSearchResults && searchQuery.trim() && searchResults.length === 0 && (
              <div className="position-absolute w-100 mt-1 bg-white border rounded-3 shadow" style={{ zIndex: 1050, top: '100%' }}>
                <div className="py-4 text-center">
                  <i className="bi bi-search text-muted d-block mb-2" style={{ fontSize: '1.5rem' }}></i>
                  <div className="text-muted" style={{ fontSize: '0.875rem' }}>Không tìm thấy kết quả cho <strong>"{searchQuery}"</strong></div>
                  <small className="text-muted">Thử tìm với từ khóa khác</small>
                </div>
              </div>
            )}
          </div>

          <div className="d-flex align-items-center ms-auto">
            <div className="position-relative me-3">
              <i className="bi bi-bell fs-5 text-muted" style={{ cursor: 'pointer' }} onClick={() => setShowNotifications((prev) => !prev)}></i>
              {unreadCount > 0 && (
                <Badge bg="danger" pill className="position-absolute top-0 start-100 translate-middle">
                  {unreadCount}
                </Badge>
              )}
              {showNotifications && (
                <div className="position-absolute end-0 mt-2 bg-white border rounded shadow-sm" style={{ width: '320px', zIndex: 1040 }}>
                  <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
                    <strong>Thông báo hoạt động</strong>
                    <Button variant="link" size="sm" className="p-0" onClick={onMarkAllNotificationsRead}>Đánh dấu đã đọc</Button>
                  </div>
                  <div className="max-vh-50 overflow-auto" style={{ maxHeight: '320px' }}>
                    {notifications.length === 0 ? (
                      <div className="p-3 text-muted small">Chưa có thông báo mới.</div>
                    ) : notifications.map((notification) => (
                      <div key={notification.id} className={`px-3 py-2 border-bottom ${notification.read ? 'bg-white' : 'bg-light'}`}>
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="fw-semibold small flex-grow-1">{notification.title}</div>
                          <button
                            className="btn btn-sm p-0 ms-2 text-muted"
                            style={{ lineHeight: 1, fontSize: '1rem' }}
                            title="Xóa thông báo này"
                            onClick={(e) => { e.stopPropagation(); onDeleteNotification(notification.id); }}
                          >
                            <i className="bi bi-x"></i>
                          </button>
                        </div>
                        <div className="text-muted small mt-1">{notification.message}</div>
                        <div className="text-muted small mt-1">{notification.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Button variant="link" className="d-flex align-items-center border-start ps-3 text-decoration-none" onClick={onOpenProfile}>
              <img src={buildAvatarUrl(user)} alt="Avatar" className="rounded-circle me-2" width="35" height="35" />
              <div className="d-none d-md-block text-start">
                <div className="fw-bold text-dark" style={{ fontSize: '0.85rem' }}>{user.full_name}</div>
                <div className="text-muted d-flex align-items-center" style={{ fontSize: '0.7rem' }}>
                  <Badge bg={user.role === 'admin' ? 'danger' : (user.role === 'teacher' ? 'primary' : 'warning')} className="me-1">
                    {user.role}
                  </Badge>
                </div>
              </div>
            </Button>
          </div>
        </Navbar>

        <div className="flex-grow-1 overflow-auto">
          <Container fluid className="p-4 px-xl-5">
            <Outlet />
          </Container>
        </div>
      </div>
    </div>
  );
};

// =========================================================
// COMPONENT APP CHÍNH (ĐIỀU PHỐI ROUTER)
// =========================================================
function App() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allProofs, setAllProofs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    faculty: '',
    chi_doan: '',
    mssv: '',
    cohort: '',
    avatar: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const loggedInUser = localStorage.getItem('user');
    if (loggedInUser) {
      try {
        const parsedUser = JSON.parse(loggedInUser);
        setUser(parsedUser);
        setProfileForm({
          full_name: parsedUser.full_name || '',
          email: parsedUser.email || '',
          phone: parsedUser.phone || '',
          faculty: parsedUser.faculty || '',
          chi_doan: parsedUser.chi_doan || '',
          mssv: parsedUser.mssv || '',
          cohort: parsedUser.cohort || '',
          avatar: parsedUser.avatar || '',
        });
      } catch (error) {
        console.warn('Invalid user data in localStorage, clearing it.', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
  }, []);

  // Tải toàn bộ dữ liệu cho tìm kiếm tổng
  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch('http://localhost:5000/api/events').then(r => r.json()).catch(() => []),
      fetch('http://localhost:5000/api/users').then(r => r.json()).catch(() => []),
      fetch('http://localhost:5000/api/dashboard/pending-proofs').then(r => r.json()).catch(() => []),
    ]).then(([eventsData, usersData, proofsData]) => {
      setEvents(Array.isArray(eventsData) ? eventsData : []);
      setAllUsers(Array.isArray(usersData) ? usersData : []);
      setAllProofs(Array.isArray(proofsData) ? proofsData : []);
    }).catch(err => console.error('Lỗi tải dữ liệu tìm kiếm:', err));
  }, [user]);

  useEffect(() => {
    setNotifications(buildNotifications(events, user?.id));
  }, [events, user]);

  // Hàm tìm kiếm tổng hợp toàn bộ dữ liệu
  useEffect(() => {
    const query = searchQuery.trim();
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) {
      setSearchResults([]);
      return;
    }

    const results = [];

    const topEventMatch = getTopEventMatch(query, events);
    if (topEventMatch) {
      results.push({
        type: 'event',
        title: topEventMatch.name,
        subtitle: `${topEventMatch.category || 'Sự kiện'} • ${topEventMatch.status || 'Đang cập nhật'}`,
        icon: 'bi-calendar2-event',
        badge: topEventMatch.status,
        path: '/admin/events',
        data: topEventMatch,
      });
      setSearchResults(results.slice(0, 12));
      return;
    }

    // 1. Tìm theo trang/chức năng
    PAGES.forEach(page => {
      if (matchesNaturalQuery(query, page.name) || matchesNaturalQuery(query, page.desc)) {
        results.push({ type: 'page', title: page.name, subtitle: page.desc, icon: page.icon, path: page.path });
      }
    });

    // 2. Tìm theo sự kiện
    events.forEach(event => {
      const hay = `${event.name || ''} ${event.description || ''} ${event.category || ''} ${event.location || ''}`;
      if (matchesNaturalQuery(query, hay)) {
        results.push({
          type: 'event',
          title: event.name,
          subtitle: `${event.category || 'Sự kiện'} • ${event.status || 'Đang cập nhật'}`,
          icon: 'bi-calendar2-event',
          badge: event.status,
          path: '/admin/events',
          data: event,
        });
      }
    });

    // 3. Tìm theo sinh viên/người dùng
    allUsers.forEach(u => {
      const hay = `${u.full_name || ''} ${u.mssv || ''} ${u.email || ''} ${u.faculty || ''} ${u.chi_doan || ''}`;
      if (matchesNaturalQuery(query, hay)) {
        results.push({
          type: 'user',
          title: u.full_name,
          subtitle: `${u.mssv || ''} • ${u.faculty || 'Chưa cập nhật'}`,
          icon: 'bi-person-circle',
          badge: u.role,
          path: '/admin/users',
          data: u,
        });
      }
    });

    // 4. Tìm theo minh chứng
    allProofs.forEach(p => {
      const hay = `${p.full_name || ''} ${p.event_name || ''} ${p.ai_note || ''}`;
      if (matchesNaturalQuery(query, hay)) {
        results.push({
          type: 'proof',
          title: `${p.full_name} — ${p.event_name}`,
          subtitle: `Minh chứng chờ duyệt • ${p.ai_note ? 'Cảnh báo AI' : 'An toàn'}`,
          icon: p.phash_warning === 1 ? 'bi-exclamation-triangle' : 'bi-shield-check',
          badge: p.phash_warning === 1 ? 'Cảnh báo' : 'An toàn',
          path: '/admin/evidence',
          data: p,
        });
      }
    });

    setSearchResults(results.slice(0, 12));
  }, [searchQuery, events, allUsers, allProofs]);

  const handleLogout = () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?')) {
      // Không xóa read_notifications_${user.id} để giữ trạng thái đã đọc khi đăng nhập lại
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setEvents([]);
      setNotifications([]);
    }
  };

  const navigate = useNavigate();

  const handleSelectSearchResult = (item) => {
    setShowSearchResults(false);
    setShowNotifications(false);
    
    if (['event', 'user', 'proof'].includes(item.type)) {
      setSearchQuery(item.title);
    } else {
      setSearchQuery('');
    }

    if (item.path) {
      window.setTimeout(() => navigate(item.path), 0);
    }
  };

  const handleNavigateToEvents = () => {
    setShowSearchResults(false);
    setShowNotifications(false);
    navigate('/admin/events');
  };

  const handleOpenProfile = () => {
    setShowProfileModal(true);
  };

  const handleProfileInputChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const formData = new FormData();
    formData.append('id', user.id);
    formData.append('avatar', file);

    setSavingProfile(true);
    try {
      const res = await fetch('http://localhost:5000/api/profile', {
        method: 'PUT',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Không thể cập nhật ảnh đại diện');
      }

      const updatedAvatar = data.user?.avatar || profileForm.avatar || user.avatar;
      const updatedUser = {
        ...user,
        ...data.user,
        avatar: updatedAvatar,
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setProfileForm((prev) => ({ ...prev, avatar: updatedAvatar }));
      if (fileInputRef.current) fileInputRef.current.value = '';
      alert('✅ Đã đổi ảnh đại diện thành công');
    } catch (error) {
      console.error('Lỗi cập nhật ảnh đại diện:', error);
      alert(error.message || 'Không thể cập nhật ảnh đại diện');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveProfile = () => {
    if (!user) return;
    setSavingProfile(true);

    const formData = new FormData();
    formData.append('id', user.id);
    formData.append('full_name', profileForm.full_name || user.full_name || '');
    formData.append('email', profileForm.email || user.email || '');
    formData.append('phone', profileForm.phone || '');
    formData.append('faculty', profileForm.faculty || '');
    formData.append('chi_doan', profileForm.chi_doan || '');
    formData.append('mssv', profileForm.mssv || user.mssv || '');
    formData.append('cohort', profileForm.cohort || '');
    if (profileForm.avatar && (profileForm.avatar.startsWith('/uploads/') || profileForm.avatar.startsWith('http://') || profileForm.avatar.startsWith('https://'))) {
      formData.append('avatar', profileForm.avatar);
    }

    fetch('http://localhost:5000/api/profile', {
      method: 'PUT',
      body: formData,
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message || 'Không thể cập nhật hồ sơ');
        }
        return data;
      })
      .then((data) => {
        const updatedUser = {
          ...user,
          ...data.user,
          full_name: data.user?.full_name || profileForm.full_name || user.full_name,
          email: data.user?.email || profileForm.email || user.email,
          phone: data.user?.phone || profileForm.phone || user.phone,
          faculty: data.user?.faculty || profileForm.faculty || user.faculty,
          chi_doan: data.user?.chi_doan || profileForm.chi_doan || user.chi_doan,
          mssv: data.user?.mssv || profileForm.mssv || user.mssv,
          avatar: data.user?.avatar || profileForm.avatar || user.avatar,
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        setShowProfileModal(false);
      })
      .catch((error) => {
        console.error('Lỗi cập nhật hồ sơ:', error);
        alert(error.message || 'Không thể cập nhật hồ sơ');
      })
      .finally(() => setSavingProfile(false));
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((item) => ({ ...item, read: true }));
      if (user?.id) {
        const allIds = new Set(updated.map((item) => item.id));
        saveReadNotificationIds(user.id, allIds);
      }
      return updated;
    });
  };

  const handleDeleteNotification = (notifId) => {
    setNotifications((prev) => prev.filter((item) => item.id !== notifId));
    if (user?.id) {
      deleteNotification(user.id, notifId);
    }
  };

  if (!user) {
    return <Login onLoginSuccess={(userData) => setUser(userData)} />;
  }

  const unreadCount = notifications.filter((item) => !item.read).length;

  return (
    <>
      <Routes>
        <Route path="/checkin/:eventId" element={<Checkin user={user} />} />

        <Route
          path="/admin"
          element={
            <AdminLayout
              user={user}
              handleLogout={handleLogout}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchResults={searchResults}
              showSearchResults={showSearchResults}
              setShowSearchResults={setShowSearchResults}
              notifications={notifications}
              unreadCount={unreadCount}
              onSelectSearchResult={handleSelectSearchResult}
              onOpenProfile={handleOpenProfile}
              showNotifications={showNotifications}
              setShowNotifications={setShowNotifications}
              onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
              onNavigateToEvents={handleNavigateToEvents}
              onDeleteNotification={handleDeleteNotification}
            />
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="evidence" element={<ProofApproval />} />
          <Route path="users" element={<UserManagement searchQuery={searchQuery} />} />
          <Route path="users/:studentId/activities" element={<StudentActivityHistory />} />
          <Route path="support" element={<Support />} />

          <Route
            path="events"
            element={(user.role === 'admin' || user.role === 'teacher') ? <EventManagement searchQuery={searchQuery} /> : <Navigate to="/admin/dashboard" replace />}
          />

          <Route
            path="settings"
            element={(user.role === 'admin' || user.role === 'teacher') ? <Settings /> : <Navigate to="/admin/dashboard" replace />}
          />
        </Route>

        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>

      <Modal show={showProfileModal} onHide={() => setShowProfileModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Thông tin cá nhân</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex align-items-center gap-4 mb-4">
            {/* Avatar */}
            <div className="position-relative">
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept="image/*" 
                onChange={handleAvatarChange} 
              />
              <img 
                src={buildAvatarUrl({ ...user, avatar: profileForm.avatar || user.avatar })} 
                alt="Avatar" 
                className="rounded-3 shadow-sm" 
                style={{ width: '85px', height: '85px', objectFit: 'cover' }} 
              />
              <div 
                className="position-absolute bg-white rounded-circle d-flex align-items-center justify-content-center shadow-sm border" 
                style={{ width: '24px', height: '24px', bottom: '-8px', right: '-8px', cursor: 'pointer' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <i className="bi bi-pencil-fill text-muted" style={{ fontSize: '10px' }}></i>
              </div>
            </div>

            <div>
              <div className="fw-bold fs-5 text-dark mb-1">{profileForm.full_name || user.full_name}</div>
              <div className="d-flex gap-2">
                <Badge bg="light" text="primary" className="fw-normal border px-2 py-1" style={{ color: '#4338ca' }}>
                  MSSV: {profileForm.mssv || user.mssv}
                </Badge>
                <Badge bg="light" text="primary" className="fw-normal border px-2 py-1" style={{ color: '#4338ca' }}>
                  Vai trò: {user.role || 'student'}
                </Badge>
              </div>
            </div>
          </div>

          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Họ và tên</Form.Label>
              <Form.Control name="full_name" value={profileForm.full_name} onChange={handleProfileInputChange} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control name="email" value={profileForm.email} onChange={handleProfileInputChange} disabled readOnly />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Số điện thoại</Form.Label>
              <Form.Control name="phone" value={profileForm.phone} onChange={handleProfileInputChange} />
            </Form.Group>
            <div className="row g-3">
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Ngành / Khoa</Form.Label>
                  <Form.Control name="faculty" value={profileForm.faculty} onChange={handleProfileInputChange} disabled readOnly />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Chi đoàn</Form.Label>
                  <Form.Control name="chi_doan" value={profileForm.chi_doan} onChange={handleProfileInputChange} disabled readOnly />
                </Form.Group>
              </div>
            </div>
            <div className="row g-3 mt-1">
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>MSSV</Form.Label>
                  <Form.Control name="mssv" value={profileForm.mssv} onChange={handleProfileInputChange} disabled readOnly />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Khóa</Form.Label>
                  <Form.Control name="cohort" value={profileForm.cohort} onChange={handleProfileInputChange} disabled readOnly />
                </Form.Group>
              </div>
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowProfileModal(false)}>Đóng</Button>
          <Button variant="primary" onClick={handleSaveProfile} disabled={savingProfile}>
            {savingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default App;