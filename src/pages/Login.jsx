import React, { useState } from 'react';
import { Row, Col, Card, Form, Button, InputGroup, Alert } from 'react-bootstrap';
import { GoogleLogin } from '@react-oauth/google';
import InfoCarousel from './InfoCarousel';
import { isStudentLoginValue, normalizeStudentLogin } from '../utils/loginUtils';

const Login = ({ onLoginSuccess }) => {
  // States cho luồng Đăng nhập
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // States quản lý luồng Quên mật khẩu
  // view có 3 trạng thái: 'login' | 'forgot_request' | 'forgot_reset'
  const [currentView, setCurrentView] = useState('login'); 
  const [resetUsername, setResetUsername] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' }); // Hiển thị thông báo thành công/lỗi

  // =================================================================
  // 1. XỬ LÝ ĐĂNG NHẬP TRUYỀN THỐNG & GOOGLE (Giữ nguyên logic của bạn)
  // =================================================================
  const handleNormalLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      alert("Vui lòng nhập đầy đủ tài khoản/email sinh viên và mật khẩu!");
      return;
    }
    if (!isStudentLoginValue(username)) {
      alert("Vui lòng nhập MSSV như httt2311017 hoặc một địa chỉ email hợp lệ");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: normalizeStudentLogin(username), password })
      });
      const data = await response.json();
      if (response.ok && data.token) {
        const role = data.user?.role?.toLowerCase();
        const allowedRoles = ['admin', 'teacher', 'classcommittee'];
        if (role === 'student') {
          alert("Từ chối truy cập: Tài khoản sinh viên không được phép đăng nhập vào hệ thống quản trị Web. Vui lòng sử dụng ứng dụng di động.");
        } else if (data.user && allowedRoles.includes(role)) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          onLoginSuccess(data.user);
        } else {
          alert("Từ chối truy cập: tài khoản không có quyền đăng nhập vào hệ thống này.");
        }
      } else {
        alert("Đăng nhập thất bại: " + (data.message || data.error || "Sai thông tin đăng nhập"));
      }
    } catch (err) {
      alert("Lỗi kết nối máy chủ! Vui lòng kiểm tra Backend đã được bật chưa.");
      console.error("Login Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = (credentialResponse) => {
    const credential = credentialResponse?.credential || '';
    if (!credential) {
      alert('Đăng nhập Google chưa trả về thông tin xác thực. Vui lòng thử lại sau.');
      return;
    }

    const parseEmailFromCredential = (credentialValue) => {
      try {
        const payload = JSON.parse(atob(credentialValue.split('.')[1]));
        return payload.email || '';
      } catch {
        return '';
      }
    };

    const email = parseEmailFromCredential(credential);
    if (!isStudentLoginValue(email)) {
      alert('Vui lòng chọn một tài khoản Google có địa chỉ email hợp lệ');
      return;
    }
    fetch('http://localhost:5000/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential })
    })
    .then(res => res.json())
    .then(data => {
      if (data.token) {
        const role = data.user?.role?.toLowerCase();
        const allowedRoles = ['admin', 'teacher', 'classcommittee'];
        if (role === 'student') {
          alert("Từ chối truy cập: Tài khoản sinh viên không được phép đăng nhập vào hệ thống quản trị Web. Vui lòng sử dụng ứng dụng di động.");
        } else if (data.user && allowedRoles.includes(role)) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          onLoginSuccess(data.user);
        } else {
          alert("Từ chối truy cập: Tài khoản Google này không có quyền Quản trị.");
        }
      } else {
        alert("Đăng nhập thất bại: " + data.error);
      }
    })
    .catch(err => {
      alert("Lỗi kết nối máy chủ hoặc Google auth không khả dụng trong môi trường này. Vui lòng dùng đăng nhập thường.");
      console.error("Google Login Error:", err);
    });
  };

  // =================================================================
  // 2. XỬ LÝ LUỒNG QUÊN MẬT KHẨU
  // =================================================================
  
  // Bước 1: Gửi yêu cầu lấy mã xác nhận
  const handleRequestResetCode = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // GỌI API BACKEND: Gửi resetUsername lên để Backend kiểm tra và gửi email chứa mã code
      const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: resetUsername })
      });
      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Mã xác nhận đã được gửi đến email của bạn!' });
        setCurrentView('forgot_reset'); // Chuyển sang form nhập mã và mật khẩu mới
      } else {
        setMessage({ type: 'danger', text: data.message || 'Tài khoản không tồn tại!' });
      }
    } catch (error) {
      setMessage({ type: 'danger', text: 'Lỗi kết nối đến máy chủ!' });
    } finally {
      setIsLoading(false);
    }
  };

  // Bước 2: Gửi mã xác nhận và mật khẩu mới để đổi
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // GỌI API BACKEND: Kiểm tra mã code và cập nhật mật khẩu mới
      const response = await fetch('http://localhost:5000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: resetUsername, code: resetCode, newPassword })
      });
      const data = await response.json();

      if (response.ok) {
        alert("Đổi mật khẩu thành công! Vui lòng đăng nhập lại.");
        setCurrentView('login'); // Quay lại form đăng nhập
        setResetUsername('');
        setResetCode('');
        setNewPassword('');
      } else {
        setMessage({ type: 'danger', text: data.message || 'Mã xác nhận không hợp lệ hoặc đã hết hạn!' });
      }
    } catch (error) {
      setMessage({ type: 'danger', text: 'Lỗi kết nối đến máy chủ!' });
    } finally {
      setIsLoading(false);
    }
  };


  // =================================================================
  // 3. RENDER GIAO DIỆN
  // =================================================================
  return (
    <Row className="vh-100 m-0 overflow-hidden">
      <InfoCarousel /> 

      <Col lg={7} xs={12} className="d-flex flex-column justify-content-center align-items-center bg-light position-relative">
        <Card className="border-0 shadow-sm rounded-4 p-2" style={{ width: '100%', maxWidth: '420px', zIndex: 1 }}>
          <Card.Body className="p-4">
            
            {/* Hiển thị thông báo (nếu có) */}
            {message.text && (
              <Alert variant={message.type} className="small py-2 mb-3">
                {message.text}
              </Alert>
            )}

            {/* KỊCH BẢN 1: GIAO DIỆN ĐĂNG NHẬP (MẶC ĐỊNH) */}
            {currentView === 'login' && (
              <>
                <h3 className="fw-bold mb-1 text-dark">Đăng nhập Sinh viên</h3>
                <p className="text-muted small mb-4">Có thể nhập MSSV như httt2311017 hoặc email sinh viên</p>

                <Form onSubmit={handleNormalLogin}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold small text-dark">Tài khoản / Email sinh viên</Form.Label>
                    <InputGroup>
                      <InputGroup.Text className="bg-white text-muted border-end-0">
                        <i className="bi bi-person-badge"></i>
                      </InputGroup.Text>
                      <Form.Control 
                        type="text" 
                        placeholder="VD: httt2311017 hoặc httt2311017@student.ctuet.edu.vn" 
                        className="border-start-0 shadow-none bg-white"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                      />
                    </InputGroup>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <div className="d-flex justify-content-between">
                      <Form.Label className="fw-semibold small text-dark">Mật khẩu</Form.Label>
                      <span 
                        className="text-decoration-none small fw-semibold cursor-pointer" 
                        style={{ color: '#132968', cursor: 'pointer' }}
                        onClick={() => {
                          setCurrentView('forgot_request');
                          setMessage({ type: '', text: '' });
                        }}
                      >
                        Quên mật khẩu?
                      </span>
                    </div>
                    <InputGroup>
                      <InputGroup.Text className="bg-white text-muted border-end-0">
                        <i className="bi bi-lock"></i>
                      </InputGroup.Text>
                      <Form.Control 
                        type={showPassword ? "text" : "password"} 
                        placeholder="••••••••" 
                        className="border-start-0 border-end-0 shadow-none bg-white"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <InputGroup.Text 
                        className="bg-white text-muted border-start-0 cursor-pointer"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ cursor: 'pointer' }}
                      >
                        <i className={showPassword ? "bi bi-eye-slash" : "bi bi-eye"}></i>
                      </InputGroup.Text>
                    </InputGroup>
                  </Form.Group>

                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-100 fw-bold py-2 mb-3 mt-2" 
                    style={{ backgroundColor: '#132968', borderColor: '#132968' }}
                  >
                    {isLoading ? 'Đang xác thực...' : 'Đăng nhập vào Hệ thống'}
                  </Button>
                </Form>

                <div className="d-flex align-items-center my-3">
                  <div className="flex-grow-1 border-bottom"></div>
                  <span className="px-3 text-muted small fw-semibold">HOẶC</span>
                  <div className="flex-grow-1 border-bottom"></div>
                </div>

                <div className="d-flex justify-content-center mb-4">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => alert('Đăng nhập Google gặp sự cố. Vui lòng thử lại hoặc dùng đăng nhập thường.')}
                    useOneTap={false}
                    theme="outline"
                    size="large"
                    text="signin_with"
                    shape="rectangular"
                  />
                </div>
              </>
            )}

            {/* KỊCH BẢN 2: GIAO DIỆN YÊU CẦU LẤY MÃ (FORGOT PASSWORD REQUEST) */}
            {currentView === 'forgot_request' && (
              <>
                <h4 className="fw-bold mb-1 text-dark">Quên mật khẩu</h4>
                <p className="text-muted small mb-4">Nhập MSSV hoặc email sinh viên của bạn để nhận mã xác nhận đổi mật khẩu.</p>

                <Form onSubmit={handleRequestResetCode}>
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold small text-dark">Tên đăng nhập (MSSV hoặc email)</Form.Label>
                    <InputGroup>
                      <InputGroup.Text className="bg-white text-muted border-end-0">
                        <i className="bi bi-person-bounding-box"></i>
                      </InputGroup.Text>
                      <Form.Control 
                        type="text" 
                        placeholder="Nhập MSSV hoặc email sinh viên..." 
                        className="border-start-0 shadow-none bg-white"
                        value={resetUsername}
                        onChange={(e) => setResetUsername(e.target.value)}
                        required
                      />
                    </InputGroup>
                  </Form.Group>

                  <Button type="submit" disabled={isLoading} className="w-100 fw-bold py-2 mb-3" style={{ backgroundColor: '#132968', borderColor: '#132968' }}>
                    {isLoading ? 'Đang gửi...' : 'Gửi mã xác nhận'}
                  </Button>
                  
                  <div className="text-center mt-2">
                    <span 
                      className="text-muted small fw-semibold cursor-pointer" 
                      style={{ cursor: 'pointer' }}
                      onClick={() => setCurrentView('login')}
                    >
                      <i className="bi bi-arrow-left me-1"></i> Quay lại đăng nhập
                    </span>
                  </div>
                </Form>
              </>
            )}

            {/* KỊCH BẢN 3: GIAO DIỆN NHẬP MÃ & ĐỔI MẬT KHẨU (FORGOT PASSWORD RESET) */}
            {currentView === 'forgot_reset' && (
              <>
                <h4 className="fw-bold mb-1 text-dark">Đặt lại mật khẩu</h4>
                <p className="text-muted small mb-4">Vui lòng nhập mã gồm 6 chữ số đã được gửi đến email của bạn và mật khẩu mới.</p>

                <Form onSubmit={handleResetPassword}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold small text-dark">Mã xác nhận</Form.Label>
                    <Form.Control 
                      type="text" 
                      placeholder="VD: 123456" 
                      className="shadow-none"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold small text-dark">Mật khẩu mới</Form.Label>
                    <Form.Control 
                      type="password" 
                      placeholder="Tối thiểu 6 ký tự" 
                      className="shadow-none"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </Form.Group>

                  <Button type="submit" disabled={isLoading} className="w-100 fw-bold py-2 mb-3" variant="success">
                    {isLoading ? 'Đang xử lý...' : 'Xác nhận đổi mật khẩu'}
                  </Button>
                  
                  <div className="text-center mt-2">
                    <span 
                      className="text-muted small fw-semibold cursor-pointer" 
                      style={{ cursor: 'pointer' }}
                      onClick={() => setCurrentView('login')}
                    >
                      Hủy và quay lại đăng nhập
                    </span>
                  </div>
                </Form>
              </>
            )}
            
          </Card.Body>
        </Card>

        <div className="position-absolute bottom-0 w-100 p-4 d-flex justify-content-between align-items-center text-muted" style={{ fontSize: '0.7rem', maxWidth: '600px', zIndex: 0 }}>
          <span>© 2026 Hệ thống Quản lý Điểm Đại học. Đã đăng ký bản quyền.</span>
          <div className="d-flex gap-3">
            <a href="#privacy" className="text-muted text-decoration-none">Chính sách bảo mật</a>
            <a href="#terms" className="text-muted text-decoration-none">Điều khoản</a>
            <a href="#security" className="text-muted text-decoration-none">Tiêu chuẩn bảo mật</a>
          </div>
        </div>
      </Col>
    </Row>
  );
};

export default Login;