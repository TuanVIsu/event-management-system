import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Badge, Modal, Form, Dropdown, Pagination, InputGroup, Tabs, Tab, Table, Spinner, Nav } from 'react-bootstrap';
import { QRCodeCanvas } from 'qrcode.react';
import * as XLSX from 'xlsx';
import { useLocation } from 'react-router-dom';
import defaultPoster from "../../assets/ctut-placeholder.jpg";
import { matchesNaturalQuery } from '../../utils/searchUtils';
import { getCategoryMaxPoints, normalizeCategoryOptions } from '../../utils/categoryUtils';
import { getMatchingPresetForCoordinates, isLocationPresetLocked, shouldRequireLocationName } from '../../utils/locationUtils';

const isGpsEnabled = (value) => value === true || value === 1 || value === '1';

const normalizeEventGps = (evt) => {
  const enabled = isGpsEnabled(evt?.require_gps);
  return {
    ...evt,
    require_gps: enabled,
    latitude: enabled ? evt?.latitude || '' : '',
    longitude: enabled ? evt?.longitude || '' : '',
    location_preset_id: enabled ? evt?.location_preset_id || null : null,
  };
};

const getCategoryStyle = (category) => {
  if (!category) return 'secondary';
  const lowerCat = category.toLowerCase();
  if (lowerCat.includes('học thuật') || lowerCat.includes('hội thảo')) return 'primary';
  if (lowerCat.includes('phong trào') || lowerCat.includes('thể thao')) return 'success';
  if (lowerCat.includes('tình nguyện') || lowerCat.includes('cộng đồng')) return 'warning';
  return 'info';
};

const EventManagement = ({ searchQuery = '' }) => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const selectedEventId = queryParams.get('id');
  const [filterMainCategory, setFilterMainCategory] = useState('Tất cả'); 
  const [selectedParentId, setSelectedParentId] = useState(''); 
  
  const [localSearchQuery, setLocalSearchQuery] = useState(selectedEventId || searchQuery || '');

  useEffect(() => {
    if (selectedEventId) {
      setLocalSearchQuery(selectedEventId);
      setCurrentPage(1); 
    }
  }, [selectedEventId]);

  const [filterCategory, setFilterCategory] = useState('Tất cả');
  const [filterStatus, setFilterStatus] = useState('Tất cả');
  const [filteredEvents, setFilteredEvents] = useState([]);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [criteriaOptions, setCriteriaOptions] = useState([]);
  const [rawCriteria, setRawCriteria] = useState([]);
  const [availableFaculties, setAvailableFaculties] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const eventsPerPage = 6;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [activeTab, setActiveTab] = useState('edit');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailEvent, setDetailEvent] = useState(null);

  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const defaultRequiredFields = ['mssv', 'name', 'phone', 'chi_doan', 'checkin_time', 'method'];
  const requiredFieldOptions = [
    { key: 'mssv', label: 'MSSV' },
    { key: 'name', label: 'HỌ VÀ TÊN' },
    { key: 'phone', label: 'SĐT' },
    { key: 'chi_doan', label: 'CHI ĐOÀN / KHOA' },
    { key: 'checkin_time', label: 'THỜI GIAN CHECK-IN' },
    { key: 'method', label: 'PHƯƠNG THỨC CLB' }
  ];
  const EVENT_REQUIRED_FIELDS_STORAGE_KEY = 'Doan3_event_required_fields';

  const [formData, setFormData] = useState({
    id: '', name: '', date: '', end_date: '', description: '',
    category: '', status: 'Sắp diễn ra', points: 0,
    require_gps: false, latitude: '', longitude: '', required_fields: defaultRequiredFields,
    require_proof: true,       
    max_participants: '',       
    score_type: 'once', // Mặc định tính theo Lần
    facultyLimits: { HTTT: '', KTPM: '', KHMT: '', MMTT: '' }
  });
  const [posterFile, setPosterFile] = useState(null);
  const [attachedFiles, setAttachedFiles] = useState([]); 

  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [savedLocationPresets, setSavedLocationPresets] = useState([]);
  const [locationSelectionMode, setLocationSelectionMode] = useState('manual');
  const [selectedPresetId, setSelectedPresetId] = useState(null);
  const [autoDetectPreset, setAutoDetectPreset] = useState(true);

  useEffect(() => {
    fetchEvents();
    fetchCriteria();
    fetchLocationPresets();
    fetchFaculties();
  }, []);

  const fetchFaculties = () => {
    fetch('http://localhost:5000/api/faculties')
      .then(res => res.json())
      .then(data => {
        setAvailableFaculties(Array.isArray(data) ? data : []);
      })
      .catch(err => {
        console.error('Lỗi khi tải danh sách ngành:', err);
        setAvailableFaculties([]);
      });
  };

  useEffect(() => {
    if (!autoDetectPreset || !formData.require_gps || !formData.latitude || !formData.longitude || savedLocationPresets.length === 0) {
      return;
    }
    const matchingPreset = getMatchingPresetForCoordinates(formData.latitude, formData.longitude, savedLocationPresets);
    if (matchingPreset) {
      setLocationSelectionMode('preset');
      setSelectedPresetId(matchingPreset.id);
    }
  }, [autoDetectPreset, formData.require_gps, formData.latitude, formData.longitude, savedLocationPresets]);

  const fetchCriteria = () => {
    fetch('http://localhost:5000/api/criteria')
      .then(res => res.json())
      .then(response => {
        const actualData = response.data || response;
        setRawCriteria(actualData); 
        const normalized = normalizeCategoryOptions(actualData);
        setCriteriaOptions(normalized);
      })
      .catch(err => {
        console.error('Lỗi fetch danh mục:', err);
        setCriteriaOptions([]);
        setRawCriteria([]); 
      });
  };

  const fetchEvents = () => {
    fetch('http://localhost:5000/api/events')
      .then(res => res.json())
      .then(data => {
        const now = new Date();
        let needsUpdate = false;

        data.forEach(evt => {
          if (evt.status !== 'Ngừng hoạt động') {
            const startDate = new Date(evt.date);
            const endDate = evt.end_date ? new Date(evt.end_date) : null;
            let targetStatus = evt.status;

            if (endDate && now > endDate && evt.status !== 'Đã kết thúc') {
              targetStatus = 'Đã kết thúc';
            } else if (now >= startDate && (!endDate || now <= endDate) && evt.status === 'Sắp diễn ra') {
              targetStatus = 'Đang diễn ra';
            }

            if (targetStatus !== evt.status) {
              fetch(`http://localhost:5000/api/events/${evt.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: targetStatus })
              });
              needsUpdate = true;
            }
          }
        });

        if (needsUpdate) {
          setTimeout(() => {
            fetch('http://localhost:5000/api/events')
              .then(r => r.json())
              .then(newData => { setEvents((Array.isArray(newData) ? newData : []).map(normalizeEventGps)); setLoading(false); });
          }, 500);
        } else {
          setEvents((Array.isArray(data) ? data : []).map(normalizeEventGps));
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Lỗi fetch sự kiện:', err);
        setLoading(false);
      });
  };

  const getRequiredFieldsForEvent = (eventId) => {
    try {
      const saved = JSON.parse(localStorage.getItem(EVENT_REQUIRED_FIELDS_STORAGE_KEY) || '{}');
      return saved[eventId] || null;
    } catch {
      return null;
    }
  };

  const saveRequiredFieldsForEvent = (eventId, fields) => {
    try {
      const saved = JSON.parse(localStorage.getItem(EVENT_REQUIRED_FIELDS_STORAGE_KEY) || '{}');
      saved[eventId] = fields;
      localStorage.setItem(EVENT_REQUIRED_FIELDS_STORAGE_KEY, JSON.stringify(saved));
    } catch {
      // ignore
    }
  };

  const parseRequiredFields = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try { return JSON.parse(value); } catch { return defaultRequiredFields; }
    }
    return defaultRequiredFields;
  };

  const toggleRequiredField = (fieldKey) => {
    setFormData(prev => {
      const current = new Set(prev.required_fields || []);
      if (current.has(fieldKey)) current.delete(fieldKey);
      else current.add(fieldKey);
      return { ...prev, required_fields: [...current] };
    });
  };

  const handleOpenCreate = () => {
    let emptyLimits = {};
    availableFaculties.forEach(fac => {
      emptyLimits[fac.key] = '';
    });

    setFormData({ 
      id: '', name: '', date: '', end_date: '', description: '', category: '', status: 'Sắp diễn ra', points: 0, require_gps: false, latitude: '', longitude: '', required_fields: defaultRequiredFields,
      require_proof: true,
      max_participants: '',
      score_type: 'once', 
      facultyLimits: emptyLimits 
    });
    setPosterFile(null); setAttachedFiles([]);
    setLocationSelectionMode('manual');
    setSelectedPresetId(null);
    setSelectedParentId('');
    setAutoDetectPreset(true);
    setShowCreateModal(true);
  };

  const toDateTimeLocal = (dateStr) => {
    if (!dateStr) return '';
    const dt = new Date(dateStr);
    if (isNaN(dt.getTime())) return '';
    const pad = (n) => n.toString().padStart(2, '0');
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  };

  const handleOpenManage = (evt) => {
    const normalizedEvent = normalizeEventGps(evt);
    setSelectedEvent(normalizedEvent);

    let databaseLimits = {};
    if (evt.faculty_limits) {
      try {
        databaseLimits = JSON.parse(evt.faculty_limits) || {};
      } catch (e) {
        console.error("Lỗi parse faculty_limits:", e);
      }
    }

    let initialLimits = {};
    availableFaculties.forEach(fac => {
      initialLimits[fac.key] = databaseLimits[fac.key] !== undefined ? databaseLimits[fac.key] : '';
    });

    if (normalizedEvent.category) {
      const prefix = normalizedEvent.category.split('_')[0];
      setSelectedParentId(prefix);
    } else {
      setSelectedParentId('');
    }

// Tìm đến hàm handleOpenManage trong EventManagement.jsx và cập nhật block setFormData:
setFormData({
  id: normalizedEvent.id,
  name: normalizedEvent.name,
  date: toDateTimeLocal(normalizedEvent.date),
  end_date: toDateTimeLocal(normalizedEvent.end_date),
  description: normalizedEvent.description || '',
  category: normalizedEvent.category,
  status: normalizedEvent.status,
  points: normalizedEvent.points || 0,
  require_gps: normalizedEvent.require_gps,
  latitude: normalizedEvent.latitude || '',
  longitude: normalizedEvent.longitude || '',
  required_fields: parseRequiredFields(normalizedEvent.required_fields) || getRequiredFieldsForEvent(normalizedEvent.id) || defaultRequiredFields,
  require_proof: evt.require_proof !== undefined ? Boolean(Number(evt.require_proof)) : true,
  max_participants: evt.max_participants || '',
  
  // --- ĐÃ VÁ LỖI: CHUẨN HÓA CHUỖI VÀ CHỐNG TRẢ VỀ NULL/TRỐNG ---
  score_type: (evt.score_type && evt.score_type.toString().trim() !== '') 
      ? evt.score_type.toString().trim().toLowerCase() 
      : 'once', 
      
  facultyLimits: initialLimits 
});

    setPosterFile(null);
    setAttachedFiles([]);

    fetchLocationPresets().then((presets) => {
      let matchingPreset = null;
      if (normalizedEvent.location_preset_id) {
        matchingPreset = presets.find(p => p.id === normalizedEvent.location_preset_id);
      }
      if (!matchingPreset) {
        matchingPreset = getMatchingPresetForCoordinates(normalizedEvent.latitude, normalizedEvent.longitude, presets);
      }
      setLocationSelectionMode(matchingPreset ? 'preset' : 'manual');
      setSelectedPresetId(matchingPreset?.id ?? null);
      setAutoDetectPreset(Boolean(matchingPreset));
    });

    setActiveTab('edit');
    setShowManageModal(true);

    setLoadingParticipants(true);
    fetch(`http://localhost:5000/api/events/${evt.id}/participants`)
      .then(res => {
        if (!res.ok) throw new Error('Không thể lấy danh sách tham gia');
        return res.json();
      })
      .then(data => { setParticipants(data); setLoadingParticipants(false); })
      .catch((err) => {
        console.error('Lỗi fetch participants:', err);
        setParticipants([]);
        setLoadingParticipants(false);
      });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'category') {
      setFormData(prev => ({ ...prev, category: value, points: 0 }));
    } else if (name === 'points') {
      const nextValue = Number(value);
      const cat = criteriaOptions.find(c => c.name === formData.category);
      const categoryMax = cat && Number.isFinite(cat.maxPoints) ? cat.maxPoints : getCategoryMaxPoints(formData.category, criteriaOptions) || 100;
      const maxPts = Number.isFinite(categoryMax) ? categoryMax : 100;
      setFormData(prev => ({
        ...prev,
        points: Number.isFinite(nextValue) ? Math.min(Math.max(nextValue, 0), maxPts) : 0,
      }));
    } else if (name === 'require_gps') {
      setFormData(prev => ({
        ...prev,
        require_gps: checked,
        ...(checked ? {} : { latitude: '', longitude: '' }),
      }));
      setLocationSelectionMode('manual');
      setSelectedPresetId(null);
      setAutoDetectPreset(false);
    } else if (name === 'require_proof') {
      setFormData(prev => ({ ...prev, require_proof: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  const handleFacultyLimitChange = (nganh, value) => {
    setFormData(prev => ({
      ...prev,
      facultyLimits: {
        ...prev.facultyLimits,
        [nganh]: value
      }
    }));
  };

  const fetchLocationPresets = () => {
    return fetch('http://localhost:5000/api/location-presets')
      .then(res => res.json())
      .then(data => {
        const presets = Array.isArray(data) ? data : [];
        setSavedLocationPresets(presets);
        return presets;
      })
      .catch(() => {
        setSavedLocationPresets([]);
        return [];
      });
  };

  const handleCoordinateInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (locationSelectionMode !== 'manual') setLocationSelectionMode('manual');
    if (selectedPresetId !== null) setSelectedPresetId(null);
    setAutoDetectPreset(false);
  };

  const saveLocationPreset = async (name, coords) => {
    if (!name || !coords) return null;
    try {
      const response = await fetch('http://localhost:5000/api/location-presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), latitude: coords.latitude, longitude: coords.longitude })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || 'Không thể lưu tọa độ');
      setSavedLocationPresets(prev => [data.preset, ...prev.filter(item => item.name.toLowerCase() !== name.trim().toLowerCase())].slice(0, 8));
      return data.preset;
    } catch (err) {
      alert(err.message || 'Không thể lưu tọa độ');
      return null;
    }
  };

  const removeLocationPreset = async (presetId) => {
    if (!window.confirm('Bạn có chắc muốn xóa vị trí này khỏi danh sách đã lưu không?')) return;
    try {
      const response = await fetch(`http://localhost:5000/api/location-presets/${presetId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || 'Không thể xóa vị trí');
      setSavedLocationPresets(prev => prev.filter(item => item.id !== presetId));
      if (selectedPresetId === presetId) {
        setLocationSelectionMode('manual');
        setSelectedPresetId(null);
        setAutoDetectPreset(false);
      }
    } catch (err) {
      alert(err.message || 'Không thể xóa vị trí');
    }
  };

  const applyLocationPreset = (preset) => {
    setFormData(prev => ({ ...prev, latitude: preset.latitude, longitude: preset.longitude }));
    setLocationSelectionMode('preset');
    setSelectedPresetId(preset.id);
    setAutoDetectPreset(false);
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) { alert("Trình duyệt không hỗ trợ GPS."); return; }
    if (!window.isSecureContext && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      alert('Trình duyệt cần chạy trên localhost hoặc HTTPS để lấy vị trí.'); return;
    }

    setIsGettingLocation(true);
    let isActive = true;
    const finish = () => { if (!isActive) return; isActive = false; setIsGettingLocation(false); };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!isActive) return;
        const latitude = position.coords.latitude.toFixed(6);
        const longitude = position.coords.longitude.toFixed(6);
        setFormData(prev => ({ ...prev, latitude, longitude }));
        setLocationSelectionMode('manual'); setSelectedPresetId(null); setAutoDetectPreset(false);
        finish();

        window.setTimeout(() => {
          const shouldSave = window.confirm('Bạn có muốn lưu tọa độ này vào danh sách để dùng lại sau không?');
          if (shouldSave) {
            const presetName = window.prompt('Đặt tên cho vị trí này:', 'Vị trí mới');
            if (presetName && presetName.trim()) saveLocationPreset(presetName, { latitude, longitude });
          }
        }, 0);
      },
      (error) => {
        if (!isActive) return;
        fetch('https://get.geojs.io/v1/ip/geo.json')
          .then(res => res.json())
          .then(data => {
            finish();
            if (data.latitude && data.longitude) {
              const latitude = parseFloat(data.latitude).toFixed(6);
              const longitude = parseFloat(data.longitude).toFixed(6);
              setFormData(prev => ({ ...prev, latitude, longitude }));
              setLocationSelectionMode('manual'); setSelectedPresetId(null); setAutoDetectPreset(false);
              alert("Đã lấy vị trí tương đối dựa trên mạng Internet (IP) vì GPS không khả dụng.");
              window.setTimeout(async () => { 
                const shouldSave = window.confirm('Bạn có muốn lưu tọa độ này vào danh sách để dùng lại sau không?');
                if (shouldSave) {
                  const presetName = window.prompt('Đặt tên cho vị trí này:', 'Vị trí mới');
                  if (presetName && presetName.trim()) {
                    const savedPreset = await saveLocationPreset(presetName, { latitude, longitude });
                    if (savedPreset) {
                      applyLocationPreset(savedPreset); 
                    }
                  }
                }
              }, 100);
            } else { throw new Error("Invalid IP location data"); }
          })
          .catch(err => {
            finish();
            const errorMessage = error?.code === 1 ? 'Bạn đã từ chối quyền truy cập vị trí hoặc thiết bị đang tắt định vị.' : 'Không thể lấy vị trí hiện tại.';
            alert(errorMessage);
          });
      }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e, isEditMode) => {
    e.preventDefault();
    if (!formData.category) return alert("Vui lòng chọn danh mục cho sự kiện!");
    const maxPts = getEffectiveMaxPoints();
    if (Number(formData.points) > maxPts) return alert(`Điểm hoạt động không được vượt quá ${maxPts} điểm!`);
    if (formData.require_gps && (!formData.latitude || !formData.longitude)) return alert("Vui lòng nhập Vĩ độ và Kinh độ.");

    const limitTong = parseInt(formData.max_participants) || 0;
    if (limitTong > 0) {
      const tongCacNganh = Object.values(formData.facultyLimits || {}).reduce((sum, currentVal) => {
        return sum + (parseInt(currentVal) || 0);
      }, 0);

      if (tongCacNganh > limitTong) {
        alert(`❌ Không thể lưu! Tổng chỉ tiêu phân bổ cho các ngành hiện tại là [ ${tongCacNganh} ] suất, vượt quá mức "Giới hạn tổng" cho phép của sự kiện là [ ${limitTong} ] suất. Vui lòng cân đối lại số lượng!`);
        return; 
      }
    }

    let finalPresetId = selectedPresetId;
    if (shouldRequireLocationName({ requireGps: formData.require_gps, latitude: formData.latitude, longitude: formData.longitude, locationMode: locationSelectionMode, selectedPresetId })) {
      const manualName = window.prompt('Nhập tên cho vị trí tổ chức:', 'Vị trí mới');
      if (!manualName || !manualName.trim()) return alert('Vui lòng nhập tên cho vị trí tổ chức để tiếp tục.');
      const savedPreset = await saveLocationPreset(manualName, { latitude: formData.latitude, longitude: formData.longitude });
      if (!savedPreset) return;
      finalPresetId = savedPreset.id;
    }

    const payload = new FormData();
    const eventId = isEditMode ? formData.id : 'EV-' + Math.floor(1000 + Math.random() * 9000); 
    
    payload.append('id', eventId);
    payload.append('name', formData.name); 
    payload.append('date', formData.date); 
    payload.append('end_date', formData.end_date);
    payload.append('description', formData.description);
    payload.append('require_gps', formData.require_gps ? 1 : 0);
    payload.append('require_proof', formData.require_proof ? 1 : 0); 
    payload.append('max_participants', limitTong);
    payload.append('required_fields', JSON.stringify(formData.required_fields || defaultRequiredFields));
    payload.append('category', formData.category);
    payload.append('status', formData.status || 'Sắp diễn ra');
    payload.append('points', Number(formData.points || 0));
    payload.append('score_type', formData.score_type); // Gửi cơ chế tính điểm lên Server
    
    payload.append('faculty_limits', JSON.stringify(formData.facultyLimits));

    if (formData.require_gps) {
      payload.append('latitude', formData.latitude || '');
      payload.append('longitude', formData.longitude || '');
      if (locationSelectionMode === 'preset' || finalPresetId) {
        payload.append('location_preset_id', finalPresetId || selectedPresetId || '');
      }
    } else {
      payload.append('latitude', ''); payload.append('longitude', ''); payload.append('location_preset_id', '');
    }
    
    if (posterFile) payload.append('poster', posterFile);

    if (attachedFiles && attachedFiles.length > 0) {
      attachedFiles.forEach(file => {
        payload.append('attached_files', file);
      });
    }

    const apiUrl = isEditMode ? `http://localhost:5000/api/events/${eventId}` : 'http://localhost:5000/api/events';
    const apiMethod = isEditMode ? 'PUT' : 'POST';

    fetch(apiUrl, { method: apiMethod, body: payload })
      .then(async (res) => {
        if (!res.ok) {
          const errorBody = await res.json().catch(() => ({}));
          throw new Error(errorBody.error || errorBody.message || 'Lỗi hệ thống khi xử lý sự kiện');
        }
        return res.json();
      })
      .then(() => {
        saveRequiredFieldsForEvent(eventId, formData.required_fields || defaultRequiredFields);
        const nextGpsEnabled = Boolean(formData.require_gps);
        const normalizedSavedEvent = {
          id: eventId, 
          name: formData.name, 
          date: formData.date, 
          end_date: formData.end_date,
          description: formData.description, 
          category: formData.category, 
          status: formData.status || 'Sắp diễn ra',
          points: Number(formData.points || 0), 
          require_gps: nextGpsEnabled,
          latitude: nextGpsEnabled ? (formData.latitude || '') : '',
          longitude: nextGpsEnabled ? (formData.longitude || '') : '',
          location_preset_id: nextGpsEnabled ? (finalPresetId || selectedPresetId || null) : null,
          require_proof: Boolean(formData.require_proof), 
          max_participants: limitTong, 
          score_type: formData.score_type,
          required_fields: formData.required_fields || defaultRequiredFields,
          faculty_limits: JSON.stringify(formData.facultyLimits)
        };
        
        setEvents(prev => {
          const existing = prev.find(evt => evt.id === eventId);
          if (existing) return prev.map(evt => evt.id === eventId ? { ...evt, ...normalizedSavedEvent } : evt);
          return [normalizedSavedEvent, ...prev];
        });

        alert(isEditMode ? "✅ Đã lưu thay đổi sự kiện thành công!" : "🎉 Tạo sự kiện mới thành công!");
        if (isEditMode) setShowManageModal(false); else setShowCreateModal(false);
        fetchEvents();
      })
      .catch(err => alert("Lỗi hệ thống: " + err.message));
  };

  const handleDeactivate = (id, currentName) => {
    if (window.confirm(`⚠️ Ngừng hoạt động sự kiện [${currentName}]?`)) {
      fetch(`http://localhost:5000/api/events/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'Ngừng hoạt động' }) }).then(() => fetchEvents());
    }
  };

  const handleExportParticipants = () => {
    if (participants.length === 0) return alert("Chưa có sinh viên nào điểm danh!");
    const headers = [['MSSV', 'HỌ VÀ TÊN', 'SĐT', 'CHI ĐOÀN / KHOA', 'THỜI GIAN ĐIỂM DANH', 'PHƯƠNG THỨC']];
    const rows = participants.map(p => [p.id, p.name, p.phone || '-', p.chi_doan || '-', p.checkin_time, p.method]);
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...rows]);
    ws['!cols'] = [{ wch: 15 }, { wch: 28 }, { wch: 16 }, { wch: 24 }, { wch: 25 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DanhSachDiemDanh");
    XLSX.writeFile(wb, `DiemDanh_${selectedEvent.id}.xlsx`);
  };

  const handleOpenQr = (evt) => { setSelectedEvent(evt); setShowQrModal(true); };
  const handleDownloadQr = () => {
    const canvas = document.getElementById('event-qr-code');
    const pngUrl = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
    const downloadLink = document.createElement('a'); downloadLink.href = pngUrl; downloadLink.download = `QR_${selectedEvent.id}.png`;
    document.body.appendChild(downloadLink); downloadLink.click(); document.body.removeChild(downloadLink);
  };

  const indexOfLastEvent = currentPage * eventsPerPage;
  const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;
  const currentEvents = filteredEvents.slice(indexOfFirstEvent, indexOfLastEvent);
  const totalPages = Math.ceil(filteredEvents.length / eventsPerPage);

  useEffect(() => {
      applyFilters();
  }, [filterMainCategory, filterCategory, filterStatus, localSearchQuery, events]);

  const applyFilters = () => {
      let filtered = events;
      if (localSearchQuery) {
          filtered = filtered.filter(event =>
              event.name.toLowerCase().includes(localSearchQuery.toLowerCase()) ||
              (event.id && event.id.toString().includes(localSearchQuery))
          );
      }
      if (filterMainCategory !== 'Tất cả' && filterCategory === 'Tất cả') {
          filtered = filtered.filter(event => event.category && event.category.startsWith(filterMainCategory + '_'));
      }
      if (filterCategory !== 'Tất cả') {
          filtered = filtered.filter(event => event.category === filterCategory);
      }
      setFilteredEvents(filtered);
  };

  const getEffectiveMaxPoints = () => {
    if (!formData.category) return 100;
    const cat = criteriaOptions.find(c => c.name === formData.category);
    const categoryMax = cat && Number.isFinite(cat.maxPoints) ? cat.maxPoints : getCategoryMaxPoints(formData.category, criteriaOptions) || 100;
    return Number.isFinite(categoryMax) ? categoryMax : 100;
  };

  const renderEventForm = (isEditMode) => (
    <Form onSubmit={(e) => handleSubmit(e, isEditMode)} className="px-4 pb-4">
      <Row className="g-4 mb-4">
        {/* CỘT TRÁI: Chi tiết sự kiện */}
        <Col lg={8}>
          <div className="bg-white p-4 rounded-3 border shadow-sm h-100">
            <h5 className="fw-bold mb-4 text-dark">Chi tiết sự kiện</h5>

            <Row className="mb-3">
              <Col md={4} sm={12}>
                <Form.Group>
                  <Form.Label className="fw-semibold small text-dark">1. Nhóm danh mục</Form.Label>
                  <Form.Select
                    value={selectedParentId}
                    onChange={(e) => {
                      setSelectedParentId(e.target.value);
                      handleChange({ target: { name: 'category', value: '' } }); 
                    }}
                    className="shadow-none form-control"
                  >
                    <option value="">-- Chọn nhóm lớn --</option>
                    {rawCriteria.map((mainCat) => (
                      <option key={mainCat.id} value={mainCat.id}>
                        [{mainCat.id}] {mainCat.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={5} sm={12}>
                <Form.Group>
                  <Form.Label className="fw-semibold small text-dark">2. Tiêu chí chi tiết <span className="text-danger">*</span></Form.Label>
                  <Form.Select 
                    name="category" 
                    value={formData.category || ""} 
                    onChange={handleChange}
                    className="shadow-none form-control" 
                    required
                    disabled={!selectedParentId}
                  >
                    <option value="">-- Chọn tiêu chí --</option>
                    {rawCriteria
                      .filter(mainCat => String(mainCat.id) === String(selectedParentId))
                      .map(mainCat => (
                        mainCat.subCategories && mainCat.subCategories.map(sub => (
                          <option key={sub.id} value={sub.id}>[{sub.id}] {sub.name}</option>
                        ))
                      ))
                    }
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={3} sm={12}>
                <Form.Group>
                  <Form.Label className="fw-semibold small text-dark">Trạng thái</Form.Label>
                  <Form.Select name="status" value={formData.status} onChange={handleChange} className="shadow-none form-control">
                    <option>Sắp diễn ra</option>
                    <option>Đang diễn ra</option>
                    <option>Đã kết thúc</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            {/* HÀNG CẤU HÌNH TÊN, GIỚI HẠN VÀ CƠ CHẾ CỘNG ĐIỂM */}
            <Row className="mb-3 align-items-end">
              <Form.Group as={Col} md={5} sm={12}>
                <Form.Label className="fw-semibold small text-dark">Tên sự kiện</Form.Label>
                <Form.Control type="text" name="name" value={formData.name} onChange={handleChange} required className="shadow-none form-control-lg fs-6" />
              </Form.Group>
              <Form.Group as={Col} md={3} sm={12}>
                <Form.Label className="fw-semibold small text-dark">Giới hạn tổng (Tất cả)</Form.Label>
                <Form.Control type="number" min="0" name="max_participants" value={formData.max_participants} onChange={handleChange} className="shadow-none form-control-lg fs-6" placeholder="0 = Không giới hạn" />
              </Form.Group>
              <Form.Group as={Col} md={4} sm={12}>
                <Form.Label className="fw-semibold small text-dark">Cơ chế tính điểm ĐRL</Form.Label>
                <div className="d-flex gap-2 align-items-center h-100 pt-2 flex-wrap">
                  <Form.Check
                    type="radio"
                    id="score-once"
                    label={<span className="small fw-bold text-dark">Theo Lần (1 lần duy nhất)</span>}
                    name="score_type"
                    value="once"
                    checked={formData.score_type === 'once'}
                    onChange={handleChange}
                    className="me-2"
                  />
                  <Form.Check
                    type="radio"
                    id="score-multiple"
                    label={<span className="small fw-bold text-success">Theo Lượt (Cộng dồn)</span>}
                    name="score_type"
                    value="multiple"
                    checked={formData.score_type === 'multiple'}
                    onChange={handleChange}
                  />
                </div>
              </Form.Group>
            </Row>

            {/* BLOCK DYNAMIC LIST DATABASE PHÂN BỔ SUẤT CHI TIẾT KHOA/NGÀNH */}
            <div className="border rounded-3 p-3 mb-3 bg-white shadow-sm">
              <div className="d-flex justify-content-between align-items-center mb-2 border-bottom pb-2">
                <div className="fw-bold small text-secondary">
                  <i className="bi bi-sliders me-2"></i>Phân bổ theo từng ngành (Để trống nếu không giới hạn)
                </div>
                <Badge bg="info" className="bg-opacity-10 text-dark fw-semibold small px-2 py-1.5">
                  Tổng chỉ tiêu ngành: {
                    Object.values(formData.facultyLimits || {}).reduce((sum, val) => sum + (parseInt(val) || 0), 0)
                  } / {formData.max_participants || '∞'} suất
                </Badge>
              </div>

              <div style={{ maxHeight: '180px', overflowY: 'auto', overflowX: 'hidden', paddingRight: '4px' }}>
                <Row className="g-2">
                  {availableFaculties.map((fac) => (
                    <Col md={4} sm={6} xs={12} key={fac.key}>
                      <div className="d-flex align-items-center justify-content-between p-2 rounded border bg-light bg-opacity-50">
                        <span className="small fw-semibold text-muted text-truncate me-2" title={fac.label} style={{ maxWidth: '65%', fontSize: '0.82rem' }}>
                          {fac.label}
                        </span>
                        <Form.Control 
                          type="number" 
                          min="0" 
                          placeholder="∞"
                          size="sm"
                          style={{ width: '80px' }}
                          value={formData.facultyLimits?.[fac.key] || ''} 
                          onChange={(e) => handleFacultyLimitChange(fac.key, e.target.value)}
                          className="shadow-none text-center fw-bold bg-white"
                        />
                      </div>
                    </Col>
                  ))}
                </Row>
              </div>
              {availableFaculties.length === 0 && (
                <div className="text-center text-muted small py-2">
                  <Spinner animation="border" size="sm" className="me-2" /> Đang đồng bộ ngành...
                </div>
              )}
            </div>

            <Row className="mb-3">
              <Form.Group as={Col}>
                <Form.Label className="fw-semibold small text-dark">Bắt đầu lúc</Form.Label>
                <Form.Control type="datetime-local" name="date" value={formData.date} onChange={handleChange} required className="shadow-none form-control-lg fs-6" />
              </Form.Group>
              <Form.Group as={Col}>
                <Form.Label className="fw-semibold small text-dark">Kết thúc lúc</Form.Label>
                <Form.Control type="datetime-local" name="end_date" value={formData.end_date} onChange={handleChange} required className="shadow-none form-control-lg fs-6" />
              </Form.Group>
            </Row>

            <Form.Group className="mb-0">
              <Form.Label className="fw-semibold small text-dark">Nội dung / Mô tả sự kiện</Form.Label>
              <Form.Control as="textarea" rows={6} name="description" value={formData.description} onChange={handleChange} className="shadow-none form-control-lg fs-6" />
            </Form.Group>
          </div>
        </Col>

        {/* CỘT PHẢI: Điểm & Đính kèm */}
        <Col lg={4}>
          <div className="bg-white p-4 rounded-3 border shadow-sm mb-4">
            <h5 className="fw-bold mb-3 text-dark d-flex align-items-center">
              <i className="bi bi-award text-primary me-2"></i> Điểm hoạt động
            </h5>
            <Form.Group>
              <Form.Control
                type="number"
                min="0"
                max={getEffectiveMaxPoints()}
                name="points"
                value={formData.points}
                onChange={handleChange}
                className="shadow-none form-control-lg fs-6"
                disabled={!formData.category}
              />
            </Form.Group>
          </div>

          <div className="bg-white p-4 rounded-3 border shadow-sm">
            <h5 className="fw-bold mb-3 text-dark">Tài liệu đính kèm</h5>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold small text-dark">Tải ảnh Poster</Form.Label>
              <div className="border border-1 rounded p-3 text-center position-relative bg-light" style={{ borderStyle: 'dashed !important', borderColor: '#c4c4c4' }}>
                <i className="bi bi-file-earmark-arrow-up fs-3 text-muted"></i>
                <div className="fw-medium small mt-2">Chọn tệp hoặc kéo thả</div>
                <div className="text-muted" style={{ fontSize: '11px' }}>JPG, PNG lên đến 5MB</div>
                <Form.Control type="file" accept="image/*" className="position-absolute top-0 start-0 w-100 h-100 opacity-0" style={{ cursor: 'pointer' }} onChange={(e) => setPosterFile(e.target.files[0])} />
              </div>
            </Form.Group>

            <Form.Group className="mb-0 mt-3">
              <Form.Label className="fw-semibold small text-dark">File đính kèm (Chọn nhiều file)</Form.Label>
              <div className="border border-1 rounded p-3 text-center position-relative bg-light" style={{ borderStyle: 'dashed !important', borderColor: '#c4c4c4' }}>
                <i className="bi bi-paperclip fs-3 text-muted"></i>
                <div className="fw-medium small mt-2">Đính kèm tài liệu</div>
                <div className="text-muted" style={{ fontSize: '11px' }}>PDF, DOCX lên đến 10MB</div>
                <Form.Control
                  type="file"
                  multiple
                  className="position-absolute top-0 start-0 w-100 h-100 opacity-0"
                  style={{ cursor: 'pointer' }}
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    setAttachedFiles(prev => [...prev, ...files]);
                    e.target.value = null;
                  }}
                />
              </div>

              {attachedFiles.length > 0 && (
                <div className="mt-2 d-flex flex-column gap-1">
                  {attachedFiles.map((file, idx) => (
                    <div key={idx} className="d-flex justify-content-between align-items-center bg-white border p-2 rounded small shadow-sm">
                      <span className="text-truncate" style={{ maxWidth: '85%' }}>
                        <i className="bi bi-file-earmark-text me-2 text-primary"></i>
                        {file.name}
                      </span>
                      <i className="bi bi-x-circle-fill text-danger" style={{ cursor: 'pointer', fontSize: '1rem' }} onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))} title="Xóa file này"></i>
                    </div>
                  ))}
                </div>
              )}

              {isEditMode && selectedEvent?.attached_file && (
                <div className="mt-3 small bg-light p-3 rounded">
                  <div className="fw-semibold mb-2">File hiện tại trên hệ thống:</div>
                  {(() => {
                    try {
                      const files = JSON.parse(selectedEvent.attached_file);
                      return Array.isArray(files) ? files.map((f, i) => (
                        <a key={i} href={`http://localhost:5000${f}`} target="_blank" rel="noreferrer" className="d-block text-decoration-none text-primary mb-1">
                          <i className="bi bi-download me-1"></i> Tải xuống Tài liệu {i + 1}
                        </a>
                      )) : null;
                    } catch {
                      return <a href={`http://localhost:5000${selectedEvent.attached_file}`} target="_blank" rel="noreferrer" className="text-decoration-none fw-bold">Xem / Tải xuống</a>;
                    }
                  })()}
                </div>
              )}
            </Form.Group>
          </div>
        </Col>
      </Row>

      {/* CỘT DƯỚI 1: Thông tin điểm danh */}
      <div className="bg-white p-4 rounded-3 border mb-4 shadow-sm">
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <div>
            <h5 className="fw-bold text-dark mb-1">Thông tin điểm danh cần thu</h5>
            <span className="text-muted small">Chọn những thông tin sinh viên phải cung cấp khi check-in.</span>
          </div>
          
          <div className="d-flex align-items-center bg-light px-3 py-2 rounded border flex-wrap gap-2">
            <div className="d-flex align-items-center">
              <label htmlFor="gps-switch" className="fw-semibold small me-2 mb-0" style={{ cursor: 'pointer' }}>Check-in bằng GPS</label>
              <Form.Check type="switch" id="gps-switch" name="require_gps" checked={!!formData.require_gps} onChange={handleChange} className="m-0 fs-5" />
            </div>
            <div className="border-start border-secondary opacity-25 mx-2 d-none d-md-block" style={{ height: '24px' }}></div>
            <div className="d-flex align-items-center">
              <label htmlFor="proof-switch" className="fw-semibold small me-2 text-danger mb-0" style={{ cursor: 'pointer' }}>Bắt buộc nộp ảnh minh chứng</label>
              <Form.Check type="switch" id="proof-switch" name="require_proof" checked={!!formData.require_proof} onChange={(e) => setFormData(prev => ({ ...prev, require_proof: e.target.checked }))} className="m-0 fs-5" />
            </div>
          </div>
        </div>

        <Row className="gy-3 mt-3">
          {requiredFieldOptions.map(field => (
            <Col xs={6} md={4} lg={2} key={field.key}>
              <Form.Check
                type="checkbox"
                id={`required-field-${field.key}`}
                label={<span className="small fw-bold text-dark text-uppercase">{field.label}</span>}
                checked={(formData.required_fields || []).includes(field.key)}
                onChange={() => toggleRequiredField(field.key)}
              />
            </Col>
          ))}
        </Row>
      </div>

      {/* CỘT DƯỚI 2: Tọa độ GPS */}
      {formData.require_gps && (
        <div className="p-4 rounded-3 border mb-4 shadow-sm" style={{ backgroundColor: '#f5f8fc', borderColor: '#d1def0' }}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h5 className="fw-bold text-dark mb-0 d-flex align-items-center">
              <i className="bi bi-geo-alt text-primary me-2"></i> Tọa độ tổ chức
            </h5>
            <Button variant="outline-primary" size="sm" onClick={handleGetCurrentLocation} disabled={isGettingLocation} className="bg-white px-3 py-1 fw-medium">
              {isGettingLocation ? <><Spinner animation="border" size="sm" /> Đang lấy...</> : <><i className="bi bi-crosshair me-1"></i>Lấy vị trí của tôi</>}
            </Button>
          </div>

          <Row className="g-4 mb-4">
            <Form.Group as={Col} md={6}>
              <Form.Label className="small text-muted text-uppercase fw-semibold">Vĩ độ (Lat)</Form.Label>
              <Form.Control type="text" name="latitude" value={formData.latitude} onChange={handleCoordinateInputChange} required={formData.require_gps} readOnly={isLocationPresetLocked(locationSelectionMode, selectedPresetId)} disabled={isLocationPresetLocked(locationSelectionMode, selectedPresetId)} className="shadow-none form-control-lg fs-6 bg-white" placeholder="0.000000" />
            </Form.Group>
            <Form.Group as={Col} md={6}>
              <Form.Label className="small text-muted text-uppercase fw-semibold">Kinh độ (Lng)</Form.Label>
              <Form.Control type="text" name="longitude" value={formData.longitude} onChange={handleCoordinateInputChange} required={formData.require_gps} readOnly={isLocationPresetLocked(locationSelectionMode, selectedPresetId)} disabled={isLocationPresetLocked(locationSelectionMode, selectedPresetId)} className="shadow-none form-control-lg fs-6 bg-white" placeholder="0.000000" />
            </Form.Group>
          </Row>

          <div className="small text-muted mb-2">Bạn có thể nhập thủ công hoặc chọn một vị trí đã lưu.</div>

          {savedLocationPresets.length > 0 && (
            <div className="d-flex align-items-center gap-2 flex-wrap mt-2">
              <span className="small text-muted me-2">Tọa độ đã lưu:</span>
              {savedLocationPresets.map((preset) => (
                <Badge
                  key={preset.id}
                  pill
                  bg="white"
                  text="dark"
                  className={`border px-3 py-2 fw-normal ${selectedPresetId === preset.id ? 'border-primary shadow-sm' : 'border-secondary text-secondary'} d-flex align-items-center`}
                  style={{ cursor: 'pointer', fontSize: '0.85rem' }}
                  onClick={() => applyLocationPreset(preset)}
                >
                  <i className="bi bi-geo-alt me-2 text-muted"></i>
                  {preset.name}
                  {selectedPresetId === preset.id && (
                    <i className="bi bi-x ms-2 text-danger" style={{ cursor: 'pointer' }} onClick={(e) => { 
                      e.stopPropagation(); 
                      removeLocationPreset(preset.id); 
                    }}></i>
                  )}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        <Button className="btn-indigo-primary w-100 fw-bold py-3 fs-6 rounded-3 shadow" type="submit">
          <i className="bi bi-floppy me-2"></i> {isEditMode ? 'Lưu thay đổi' : 'Tạo sự kiện'}
        </Button>
      </div>
    </Form>
  );

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold mb-0">Quản lý Sự kiện</h3>
        <div className="d-flex gap-3 flex-wrap align-items-center">
          <div className="d-flex bg-white border rounded shadow-sm">
            <div className="d-flex align-items-center px-3 bg-light text-muted border-end rounded-start">
              <i className="bi bi-funnel-fill"></i>
            </div>
            <Form.Select
              value={filterMainCategory}
              onChange={(e) => {
                setFilterMainCategory(e.target.value);
                setFilterCategory('Tất cả'); 
              }}
              className="border-0 shadow-none fw-medium text-dark rounded-0"
              style={{ minWidth: '180px', maxWidth: '250px', cursor: 'pointer' }}
            >
              <option value="Tất cả">Tất cả nhóm danh mục</option>
              {rawCriteria.map(mainCat => (
                <option key={mainCat.id} value={mainCat.id}>Mục {mainCat.id}</option>
              ))}
            </Form.Select>

            <Form.Select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="border-0 shadow-none fw-medium text-dark border-start rounded-end bg-transparent"
              style={{ minWidth: '220px', maxWidth: '300px', cursor: 'pointer' }}
              disabled={filterMainCategory === 'Tất cả'}
            >
              <option value="Tất cả">
                {filterMainCategory === 'Tất cả' ? '-- Chọn nhóm lớn trước --' : 'Tất cả tiêu chí chi tiết'}
              </option>
              {rawCriteria
                .filter(mainCat => String(mainCat.id) === String(filterMainCategory))
                .map(mainCat => (
                  mainCat.subCategories && mainCat.subCategories.map(sub => (
                    <option key={sub.id} value={sub.id}>[{sub.id}] {sub.name}</option>
                  ))
                ))
              }
            </Form.Select>
          </div>

          <Button className="btn-indigo-primary fw-semibold shadow-sm" onClick={handleOpenCreate}>
            <i className="bi bi-plus-lg me-1"></i>Tạo sự kiện mới
          </Button>
        </div>
      </div>

      <Row className="g-4">
        <Col md={8}>
          <Row className="g-3">
            {loading ? <p className="text-muted">Đang tải dữ liệu...</p> : currentEvents.map((evt) => {
              const theme = getCategoryStyle(evt.category);
              const isDeactivated = evt.status === 'Ngừng hoạt động';

              return (
                <Col md={6} key={evt.id}>
                  <Card className={`dashboard-card h-100 border-0 shadow-sm ${isDeactivated ? 'opacity-75 bg-light' : ''}`}>
                    <Card.Img variant="top" src={evt.poster_url ? `http://localhost:5000${evt.poster_url}` : defaultPoster} style={{ height: '160px', objectFit: 'cover', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }} alt="Poster" />
                    <Card.Body className="d-flex flex-column p-3">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <Badge bg={theme} className={`bg-opacity-10 text-${theme === 'warning' ? 'dark' : theme} rounded-pill px-3 py-2 fw-semibold text-uppercase`}>{evt.category}</Badge>
                      </div>
                      <h5 className={`fw-bold mt-3 mb-2 ${isDeactivated ? 'text-decoration-line-through text-muted' : ''}`}>{evt.name}</h5>
                      <p className="text-muted small mb-1"><i className="bi bi-calendar-event me-2"></i> Bắt đầu: {new Date(evt.date).toLocaleString('vi-VN')}</p>
                      {evt.end_date && <p className="text-muted small mb-3"><i className="bi bi-clock-history me-2"></i> Kết thúc: {new Date(evt.end_date).toLocaleString('vi-VN')}</p>}

                      <div className="d-flex gap-2 mb-3 mt-2 flex-wrap">
                        <Badge bg={evt.status === 'Đang diễn ra' ? 'success' : (isDeactivated ? 'secondary' : (evt.status === 'Đã kết thúc' ? 'dark' : 'warning'))} className={`${evt.status === 'Đã kết thúc' ? 'bg-opacity-10 text-dark' : 'bg-opacity-25 text-dark'} px-2 py-1`}>{evt.status}</Badge>
                        <Badge bg="primary" className="bg-opacity-10 text-primary px-2 py-1">Điểm: {Number(evt.points || 0)}</Badge>
                        <Badge bg={evt.score_type === 'multiple' ? 'success' : 'secondary'} className="bg-opacity-10 px-2 py-1">
                          {evt.score_type === 'multiple' ? 'Tính theo Lượt' : 'Tính theo Lần'}
                        </Badge>
                      </div>
                      {evt.required_fields && (
                        <p className="text-muted small mb-3">Yêu cầu: {parseRequiredFields(evt.required_fields).map(fieldKey => requiredFieldOptions.find(opt => opt.key === fieldKey)?.label || fieldKey).join(', ')}</p>
                      )}
                    </Card.Body>
                    <div className="d-flex justify-content-between align-items-center mt-auto pt-3 border-top p-3">
                      <small className="text-muted fw-bold">{evt.id}</small>
                      <div className="d-flex gap-2">
                        {!isDeactivated && <Button variant="outline-dark" size="sm" className="px-2" title="Lấy mã QR" onClick={() => handleOpenQr(evt)}><i className="bi bi-qr-code"></i></Button>}
                        {!isDeactivated && <Button variant="outline-danger" size="sm" onClick={() => handleDeactivate(evt.id, evt.name)}><i className="bi bi-stop-circle"></i></Button>}
                        <Button className="btn-indigo-primary px-3 fw-semibold" size="sm" onClick={() => handleOpenManage(evt)}>
                          <i className="bi bi-gear-fill me-1"></i> Quản lý
                        </Button>
                      </div>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>

          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-4">
              <Pagination>
                <Pagination.Prev onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} />
                {[...Array(totalPages)].map((_, idx) => (
                  <Pagination.Item key={idx + 1} active={idx + 1 === currentPage} onClick={() => setCurrentPage(idx + 1)}>{idx + 1}</Pagination.Item>
                ))}
                <Pagination.Next onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} />
              </Pagination>
            </div>
          )}
        </Col>

        <Col md={4}>
          <h5 className="fw-bold mb-3">Thống kê Tương tác</h5>
          <Card className="dashboard-card mb-4 border-0 shadow-sm">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-end mb-2">
                <span className="text-muted fw-semibold">Tổng số sự kiện</span>
                <h3 className="fw-bold mb-0 text-primary">{filteredEvents.length}</h3>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ================= MODAL 1: TẠO SỰ KIỆN MỚI ================= */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} backdrop="static" size="xl">
        <Modal.Header className="bg-white border-bottom d-flex justify-content-between align-items-center py-3 w-100">
          <Modal.Title className="fw-bold fs-4 m-0">Tạo sự kiện mới</Modal.Title>
          <Button variant="outline-secondary" className="px-3 py-1 bg-white ms-auto" onClick={() => setShowCreateModal(false)}>
            <i className="bi bi-x me-1"></i> Hủy bỏ
          </Button>
        </Modal.Header>
        <Modal.Body className="bg-light p-4">{renderEventForm(false)}</Modal.Body>
      </Modal>

      {/* ================= MODAL 2: BẢNG ĐIỀU KHIỂN SỰ KIỆN ================= */}
      <Modal show={showManageModal} onHide={() => setShowManageModal(false)} backdrop="static" size="xl">
        <Modal.Header className="bg-white border-bottom pb-0 pt-3 px-4 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-end w-100">
            <div className="me-4 flex-grow-1">
              <h4 className="fw-bold mb-3">Quản lý: <span className="text-primary">{selectedEvent?.name}</span></h4>
              <Nav variant="tabs" className="border-bottom-0">
                <Nav.Item>
                  <Nav.Link active={activeTab === 'edit'} onClick={() => setActiveTab('edit')} className={`fw-semibold px-2 me-4 pb-2 ${activeTab === 'edit' ? 'text-primary border-0 border-bottom border-primary border-2 bg-transparent' : 'text-muted border-0 bg-transparent'}`}>
                    <i className="bi bi-info-circle me-1"></i> Thông tin chung
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link active={activeTab === 'participants'} onClick={() => setActiveTab('participants')} className={`fw-semibold px-2 pb-2 ${activeTab === 'participants' ? 'text-primary border-0 border-bottom border-primary border-2 bg-transparent' : 'text-muted border-0 bg-transparent'}`}>
                    <i className="bi bi-people me-1"></i> Danh sách tham gia
                  </Nav.Link>
                </Nav.Item>
              </Nav>
            </div>
            <Button variant="outline-secondary" className="mb-3 px-3 py-1 bg-white" onClick={() => setShowManageModal(false)}>
              <i className="bi bi-x me-1"></i> Hủy bỏ
            </Button>
          </div>
        </Modal.Header>

        <Modal.Body className="p-0 bg-light">
          {activeTab === 'edit' ? (
            <div className="pt-4">{renderEventForm(true)}</div>
          ) : (
            <div className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h6 className="fw-bold mb-1">Thống kê điểm danh</h6>
                  <span className="text-muted small">Đã ghi nhận: <strong className="text-success fs-6">{participants.length}</strong> lượt check-in</span>
                </div>
                <Button variant="success" size="sm" className="fw-bold px-3" onClick={handleExportParticipants} disabled={participants.length === 0}>
                  <i className="bi bi-file-earmark-excel me-1"></i> Xuất Excel
                </Button>
              </div>

              <div className="border rounded-3 shadow-sm bg-white overflow-hidden">
                <Table hover responsive size="sm" className="mb-0 align-middle">
                  <thead className="bg-light text-muted" style={{ fontSize: '0.85rem' }}>
                    <tr>
                      <th className="py-3 px-3">MSSV</th>
                      <th className="py-3">HỌ VÀ TÊN</th>
                      <th className="py-3">SĐT</th>
                      <th className="py-3">CHI ĐOÀN / KHOA</th>
                      <th className="py-3">THỜI GIAN CHECK-IN</th>
                      <th className="py-3">PHƯƠNG THỨC</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontSize: '0.9rem' }}>
                    {loadingParticipants ? (
                      <tr><td colSpan="6" className="text-center py-4"><Spinner animation="border" size="sm" /> Đang tải danh sách...</td></tr>
                    ) : participants.length === 0 ? (
                      <tr><td colSpan="6" className="text-center py-4 text-muted">Chưa có sinh viên nào điểm danh.</td></tr>
                    ) : (
                      participants.map((p, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2 fw-semibold">{p.id}</td>
                          <td className="py-2">{p.name}</td>
                          <td className="py-2">{p.phone || '-'} </td>
                          <td className="py-2">{p.chi_doan || '-'}</td>
                          <td className="py-2 text-muted">{p.checkin_time}</td>
                          <td className="py-2"><Badge bg="info" className="bg-opacity-10 text-info px-2 py-1">{p.method}</Badge></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* ================= MODAL HIỂN THỊ MÃ QR ================= */}
      <Modal show={showQrModal} onHide={() => setShowQrModal(false)} centered>
        <Modal.Header closeButton className="border-0"><Modal.Title className="fw-bold">Mã QR Điểm danh</Modal.Title></Modal.Header>
        <Modal.Body className="text-center pb-4">
          {selectedEvent && (
            <>
              <h5 className="fw-bold text-primary mb-3">{selectedEvent.name}</h5>
              <div className="bg-light p-4 rounded d-inline-block shadow-sm mb-3">
                <QRCodeCanvas id="event-qr-code" value={`${window.location.origin}/checkin/${selectedEvent.id}`} size={220} level="H" includeMargin={true} />
              </div>
              <div className="d-grid gap-2">
                <Button variant="success" className="fw-bold" onClick={handleDownloadQr}><i className="bi bi-download me-2"></i>Tải mã QR xuống</Button>
              </div>
            </>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
};

export default EventManagement;