import React from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import App from './App.jsx';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { BrowserRouter } from 'react-router-dom'; // <-- THÊM THƯ VIỆN BỘ ĐỊNH TUYẾN (ROUTER)

// Import CSS của Bootstrap (Rất quan trọng để không bị vỡ giao diện)


// Client ID của bạn (Đã lấy từ Google Cloud)
const GOOGLE_CLIENT_ID = '1021190295168-vsv0rk0pmnq169f4ru3msve4v8oi1js2.apps.googleusercontent.com';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 1. BẮT BUỘC CÓ ĐỂ CHUYỂN TRANG (useNavigate) KHÔNG BỊ TRẮNG MÀN HÌNH */}
    <BrowserRouter>
      {/* 2. BẮT BUỘC CÓ ĐỂ GOOGLE LOGIN HOẠT ĐỘNG */}
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <App />
      </GoogleOAuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);