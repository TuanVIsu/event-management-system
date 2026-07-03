import React, { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Col, Row, Spinner } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const getAcademicTerm = (value) => {
  if (!value) {
    return { key: 'unknown', label: 'Chưa xác định' };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { key: 'unknown', label: 'Chưa xác định' };
  }

  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  if (month >= 9 && month <= 12) {
    return { key: `${year}-${year + 1}-1`, label: `Học kỳ 1 (${year}-${year + 1})` };
  }

  if (month >= 1 && month <= 3) {
    return { key: `${year - 1}-${year}-2`, label: `Học kỳ 2 (${year - 1}-${year})` };
  }

  return { key: `${year}-${year + 1}-he`, label: `Học kỳ hè (${year}-${year + 1})` };
};

const StudentActivityHistory = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [studentRes, activitiesRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/users/${studentId}`),
          axios.get(`http://localhost:5000/api/users/${studentId}/activities`),
        ]);
        setStudent(studentRes.data || null);
        setActivities(Array.isArray(activitiesRes.data) ? activitiesRes.data : []);
      } catch (error) {
        console.error('Lỗi khi tải lịch sử hoạt động sinh viên:', error);
        setStudent(null);
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    if (studentId) {
      fetchData();
    }
  }, [studentId]);

  const groupedActivities = useMemo(() => {
    const groups = {};
    activities.forEach((activity) => {
      const term = getAcademicTerm(activity.event_date || activity.checkin_time || activity.created_at);
      if (!groups[term.key]) {
        groups[term.key] = {
          key: term.key,
          label: term.label,
          items: [],
        };
      }
      groups[term.key].items.push(activity);
    });

    return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key));
  }, [activities]);

  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <div className="text-uppercase text-muted small">Danh bạ sinh viên</div>
          <h4 className="fw-bold mb-1">Lịch sử tham gia hoạt động</h4>
          <p className="text-muted mb-0">
            {student?.full_name || 'Đang tải thông tin sinh viên...'}
          </p>
        </div>
        <Button variant="outline-secondary" onClick={() => navigate('/admin/users')}>
          <i className="bi bi-arrow-left me-2"></i>Quay về
        </Button>
      </div>

      {loading ? (
        <Card className="border-0 shadow-sm">
          <Card.Body className="text-center py-5 text-muted">
            <Spinner animation="border" size="sm" className="me-2" />
            Đang tải lịch sử hoạt động...
          </Card.Body>
        </Card>
      ) : groupedActivities.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <Card.Body className="py-5 text-center text-muted">
            Sinh viên chưa có hoạt động nào được ghi nhận.
          </Card.Body>
        </Card>
      ) : (
        groupedActivities.map((group) => (
          <Card key={group.key} className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 py-3">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <h6 className="fw-bold mb-0">{group.label}</h6>
                <Badge bg="primary" className="bg-opacity-10 text-primary px-3 py-2">
                  {group.items.length} hoạt động
                </Badge>
              </div>
            </Card.Header>
            <Card.Body className="pt-0">
              <Row className="g-3">
                {group.items.map((activity, index) => (
                  <Col md={6} key={`${activity.event_id || activity.id || index}-${index}`}>
                    <div className="border rounded-3 p-3 h-100">
                      <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                        <div>
                          <div className="fw-semibold text-dark">{activity.event_name || 'Hoạt động chưa có tên'}</div>
                          <div className="text-muted small">{activity.category || 'Chưa phân loại'}</div>
                        </div>
                        <Badge bg="success" className="bg-opacity-10 text-success">Hoàn thành</Badge>
                      </div>
                      <div className="text-muted small mb-2">
                        <i className="bi bi-calendar-event me-2"></i>
                        {activity.event_date ? new Date(activity.event_date).toLocaleString('vi-VN') : 'Chưa có thời gian sự kiện'}
                      </div>
                      <div className="text-muted small mb-2">
                        <i className="bi bi-clock-history me-2"></i>
                        Tham gia lúc: {activity.checkin_time || 'Chưa cập nhật'}
                      </div>
                      <div className="text-muted small">
                        <i className="bi bi-info-circle me-2"></i>
                        {activity.event_description || 'Không có mô tả chi tiết.'}
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
            </Card.Body>
          </Card>
        ))
      )}
    </div>
  );
};

export default StudentActivityHistory;
