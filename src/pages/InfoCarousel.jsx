import React, { useState } from 'react';
import { Col, Carousel } from 'react-bootstrap';

/**
 * Component tái tạo chính xác phần giao diện thông tin và carousel bên trái.
 * Đảm bảo căn giữa hoàn hảo và bố cục Carousel 2 lớp như hình ảnh image_1.png.
 */
const InfoCarousel = () => {
  // Dữ liệu cho các poster chuyển động
  const posterData = [
    {
      title: "Chào mừng đến với Cổng\nthông tin Điểm rèn luyện",
      description: "Truy cập bảng điều khiển thống nhất của bạn để theo dõi, quản lý và xác thực điểm rèn luyện của sinh viên. Hệ thống bảo mật đảm bảo tính minh bạch và đơn giản hóa.",
      icon: "bi-bar-chart-fill", // Icon cho slide đầu tiên
    },
    // Thêm dữ liệu giả cho 3 slide tiếp theo để tạo 4 chỉ báo chính ở chân trang
    {
      title: "Cập nhật nhanh chóng,\nMinh bạch rõ ràng",
      description: "Hệ thống lưu trữ dữ liệu thời gian thực, giúp bạn dễ dàng theo dõi tiến độ tham gia các hoạt động ngoại khóa.",
      icon: "bi-shield-check",
    },
    {
      title: "Đơn giản hóa quy trình\nHành chính",
      description: "Thay thế hoàn toàn giấy tờ truyền thống. Mọi thao tác nộp minh chứng, chấm điểm và xét duyệt đều được thực hiện trực tuyến.",
      icon: "bi-lightning-fill",
    },
    {
      title: "Hệ thống Báo cáo\nThông minh",
      description: "Tự động tổng hợp dữ liệu, xuất báo cáo thống kê chi tiết cho từng cá nhân và tập thể.",
      icon: "bi-graph-up-arrow",
    }
  ];

  // State để quản lý slide hiện tại
  const [activeIndex, setActiveIndex] = useState(0);

  // Xử lý khi chọn slide
  const handleSelect = (selectedIndex, e) => {
    setActiveIndex(selectedIndex);
  };

  return (
    <Col lg={5} className="d-none d-lg-flex flex-column p-5 text-white h-100 position-relative" style={{ backgroundColor: '#132968' }}>
      
      {/* ================= HEADER CĂN GIỮA ================= */}
      <div className="d-flex flex-column align-items-center text-center mb-5 w-100">
        {/* Nhóm Icon và Title lớn */}
        <div className="d-flex align-items-center mb-1">
          <i className="bi bi-star-fill fs-4 me-2"></i>
          <h5 className="fw-bold mb-0" style={{ letterSpacing: '0.5px' }}>Hệ thống Quản lý Điểm</h5>
        </div>
        {/* Title nhỏ ở dưới */}
        <small className="text-white-50" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>CỔNG THÔNG TIN ĐIỂM RÈN LUYỆN</small>
      </div>

      {/* ================= CAROUSEL CHÍNH VÀ KHUNG MINH HỌA CĂN GIỮA ================= */}
      <Carousel 
        controls={false} // Tắt nút prev/next
        indicators={false} // Tắt indicators mặc định của bootstrap để tự tạo indicators custom ở dưới
        interval={4000} // Thời gian chuyển slide
        fade // Hiệu ứng mờ dần
        activeIndex={activeIndex}
        onSelect={handleSelect}
        className="flex-grow-1 d-flex flex-column"
      >
        {posterData.map((item, index) => (
          <Carousel.Item key={index} className="flex-column text-center h-100 w-100">
            
            {/* 1. Văn bản tiêu đề lớn (H1) */}
            <h1 className="fw-bold mb-4" style={{ fontSize: '2.5rem', lineHeight: '1.3', whiteSpace: 'pre-line' }}>
              {item.title}
            </h1>
            
            {/* 2. Văn bản mô tả (P) */}
            <p className="text-white-50 mb-5 text-center mx-auto" style={{ fontSize: '1.05rem', lineHeight: '1.6', maxWidth: '85%' }}>
              {item.description}
            </p>
            
            {/* 3. Khung minh họa (Giả lập Carousel Lồng nhau - Lớp 2) */}
            <div className="w-100 d-flex justify-content-center mt-auto mb-5">
              {/* Khung container lớn bên ngoài (mờ) */}
              <div className="bg-white bg-opacity-10 rounded-4 d-flex flex-column justify-content-center align-items-center p-4 shadow-sm" style={{ width: '80%', minHeight: '180px' }}>
                
                {/* Khung trắng nhỏ chứa icon */}
                <div className="bg-white rounded p-3 mb-3 shadow-sm transition-all">
                  <i className={`bi ${item.icon}`} style={{ fontSize: '2.5rem', color: '#132968' }}></i>
                </div>
                
                {/* Chấm giả nội bộ (2 chấm cho slide hiện tại) */}
                <div className="d-flex gap-1 mb-2">
                  <div className={`rounded-circle ${index === 0 ? 'bg-white' : 'bg-white bg-opacity-50'}`} style={{ width: '6px', height: '6px' }}></div>
                  <div className={`rounded-circle ${index === 1 ? 'bg-white' : 'bg-white bg-opacity-50'}`} style={{ width: '6px', height: '6px' }}></div>
                  {/* Nếu chỉ có 2 chấm nội bộ cố định */}
                </div>
              </div>
            </div>
          </Carousel.Item>
        ))}
      </Carousel>

      {/* ================= MAIN INDICATORS (CHÂN TRANG) TỰ TẠO ================= */}
      <div className="main-carousel-indicators d-flex justify-content-center gap-2 mt-auto pb-4 w-100">
        {[...Array(posterData.length)].map((_, i) => (
          <div
            key={i}
            className={`rounded-pill ${i === activeIndex ? 'bg-white' : 'bg-white bg-opacity-50'}`}
            style={{ width: '10px', height: '4px', cursor: 'pointer' }}
            onClick={() => setActiveIndex(i)}
          />
        ))}
      </div>

    </Col>
  );
};

export default InfoCarousel;