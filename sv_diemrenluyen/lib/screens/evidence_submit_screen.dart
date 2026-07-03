import 'package:flutter/material.dart';
import 'dart:typed_data'; 
import 'package:dio/dio.dart'; 
import 'package:image_picker/image_picker.dart'; 
import '../widgets/shared_app_bar.dart'; 
import '../core/app_config.dart'; 
import 'notification_helper.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'history_screen.dart';
import 'package:http_parser/http_parser.dart'; 
class EvidenceSubmitScreen extends StatefulWidget {
  final Map<String, dynamic> userData;
  final String? initialEventId;   
  final String? initialEventName; 
  final String? initialCategory;
  final double? latitude;  
  final double? longitude; 
  final bool requireProof;

  const EvidenceSubmitScreen({
    Key? key, 
    required this.userData,
    this.initialEventId,
    this.initialEventName,
    this.initialCategory,
    this.latitude,
    this.longitude,
    this.requireProof = true,
  }) : super(key: key);
  
  @override
  State<EvidenceSubmitScreen> createState() => _EvidenceSubmitScreenState();
}

class _EvidenceSubmitScreenState extends State<EvidenceSubmitScreen> {
  String? _selectedCategory;
  List<String> _categories = []; 
  bool _isLoadingCategories = true;
  
  List<dynamic> _ongoingEvents = [];
  bool _isLoadingEvents = false;
  String? _selectedEventId;

  final TextEditingController _nameController = TextEditingController();
  XFile? _selectedImage;
  Uint8List? _imageBytes; 
  bool _isSubmitting = false;

  // --- TRẠNG THÁI QUẢN LÝ REQUIRE_PROOF ĐỘNG THEO SỰ KIỆN ---
  bool _currentEventRequireProof = true; 

  // --- THÔNG TIN DANH SÁCH MINH CHỨNG ĐÃ NỘP ---
  List<dynamic> _submittedProofsList = [];
  bool _isLoadingProofs = true;

@override
  void initState() {
    super.initState();
    
    _currentEventRequireProof = widget.requireProof;

    if (widget.initialEventName != null) {
      _nameController.text = widget.initialEventName!;
    }
    if (widget.initialCategory != null) {
      _selectedCategory = widget.initialCategory;
    }

    _fetchCategories();
    
    // Gọi hàm fetch lịch sử trước, sau khi có dữ liệu lịch sử mới bắt đầu lọc sự kiện dropdown
    _fetchSubmittedProofs().then((_) {
      if (widget.initialEventId == null) {
        _fetchOngoingEvents();
      }
    });
  }

  // Hàm định dạng chuỗi thời gian hiển thị tương tự bên trang lịch sử hoạt động
  String _formatDateTime(String? isoString) {
    if (isoString == null || isoString.isEmpty) return 'Chưa cập nhật';
    try {
      DateTime dt = DateTime.parse(isoString).toLocal();
      String hour = dt.hour.toString().padLeft(2, '0');
      String minute = dt.minute.toString().padLeft(2, '0');
      String second = dt.second.toString().padLeft(2, '0');
      String day = dt.day.toString().padLeft(2, '0');
      String month = dt.month.toString().padLeft(2, '0');
      return '$hour:$minute:$second $day/$month/${dt.year}';
    } catch (e) {
      return isoString;
    }
  }

  // --- HÀM TẢI DANH SÁCH MINH CHỨNG GIỐNG BÊN LỊCH SỬ ---
  Future<void> _fetchSubmittedProofs() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final String? savedUserData = prefs.getString('user_data');
      String mssv = '';
      
      if (savedUserData != null) {
        final Map<String, dynamic> localData = jsonDecode(savedUserData);
        mssv = localData['mssv']?.toString() ?? '';
      }

      if (mssv.isEmpty) {
        setState(() => _isLoadingProofs = false);
        return;
      }

      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final response = await Dio().get('$backendBaseUrl/api/mobile/history?mssv=$mssv&_t=$timestamp');
      
      if (response.statusCode == 200 && response.data['status'] == 'success') {
        final List<dynamic> allHistory = response.data['data'] ?? [];
        setState(() {
          _submittedProofsList = allHistory;
          _isLoadingProofs = false;
        });
      } else {
        setState(() => _isLoadingProofs = false);
      }
    } catch (e) {
      setState(() => _isLoadingProofs = false);
    }
  }

Future<void> _fetchOngoingEvents() async {
    setState(() => _isLoadingEvents = true);
    try {
      final mssv = widget.userData['mssv'] ?? '';
      final response = await Dio().get('$backendBaseUrl/api/mobile/events?mssv=$mssv');
      
      if (response.statusCode == 200 && response.data['status'] == 'success') {
        final List<dynamic> events = response.data['events'] ?? [];
        
        final filtered = events.where((e) {
            bool isRegistered = e['is_registered'] == 1 || e['is_registered'] == '1';
            bool isEnded = e['status'] == 'Đã kết thúc' || e['status'] == 'Ngừng hoạt động';
            
            // Đọc cấu hình từ Backend xem sự kiện này có bắt buộc nộp minh chứng hay không
            bool requireProof = e['require_proof'] == 1 || e['require_proof'] == '1' || e['require_proof'] == true;
            
            // Sinh viên ĐÃ điểm danh qua quét mã QR/GPS thành công tại sự kiện hay chưa
            bool isCheckedIn = e['is_checked_in'] == 1 || e['is_checked_in'] == '1' || e['is_checked_in'] == true;

            // -----------------------------------------------------------------
            // VÁ LỖI 1: CHẶN ĐIỀU KIỆN QUÉT MÃ QR TRƯỚC KHI NỘP MINH CHỨNG
            // -----------------------------------------------------------------
            // Nếu sự kiện BẮT BUỘC minh chứng (nhưng hình thức là quét QR hệ thống), 
            // thì sinh viên PHẢI quét QR thành công (isCheckedIn == true) thì mới cho hiện ở đây để nộp ảnh bổ sung.
            // Nếu sự kiện không cần quét QR (nộp thẳng tự do), cho phép qua cửa này.
            bool passCheckInRule = !requireProof || isCheckedIn;

// -----------------------------------------------------------------
// VÁ LỖI 2: CHỐNG BUFF ĐIỂM (CHẶN NỘP NHIỀU LẦN ĐỒNG BỘ THEO SCORE_TYPE)
// -----------------------------------------------------------------
// Sửa h['id'] thành h['event_id'] để so sánh chính xác mã sự kiện trong danh sách lịch sử
final existingHistory = _submittedProofsList.firstWhere(
  (h) => h['event_id'].toString() == e['id'].toString(), // <--- ĐỔI TỪ h['id'] THÀNH h['event_id']
  orElse: () => null,
);

bool passDuplicateRule = true;
if (existingHistory != null) {
  final String proofStatus = (existingHistory['proof_status'] ?? '').toString().trim().toLowerCase();
  
  // ĐỒNG BỘ ĐỘNG: Đọc trực tiếp cấu hình cơ chế từ CSDL backend gửi lên
  bool isCountByTurn = (e['score_type'] ?? 'once').toString().trim().toLowerCase() == 'multiple';

  if (!isCountByTurn) {
    // Nếu tính THEO LẦN: Đang chờ duyệt (pending) hoặc Đã duyệt (approved) -> ẨN KHỎI DROPDOWN
    if (proofStatus == 'approved' || proofStatus == 'pending') {
      passDuplicateRule = false;
    }
  }
}

            // Sự kiện hợp lệ phải thỏa mãn tất cả các điều kiện bảo mật trên
            return isRegistered && !isEnded && passCheckInRule && passDuplicateRule;
          }).toList();

        // Deduplicate by id to avoid DropdownMenuItem value collisions
        final Map<String, dynamic> uniqueById = {};
        for (var ev in filtered) {
          final idStr = ev['id']?.toString() ?? '';
          if (idStr.isEmpty) continue;
          if (!uniqueById.containsKey(idStr)) uniqueById[idStr] = ev;
        }

        setState(() {
          _ongoingEvents = uniqueById.values.toList();
          _isLoadingEvents = false;
        });
      } else {
        setState(() => _isLoadingEvents = false);
      }
    } catch (e) {
      setState(() => _isLoadingEvents = false);
    }
  }

Future<void> _fetchCategories() async {
    try { 
      Response response = await Dio().get('$backendBaseUrl/api/criteria');
      if (response.statusCode == 200) {
        // Cú pháp an toàn bóc tách cấu trúc phân cấp mới từ backend Node.js
        final responseData = response.data;
        
        if (responseData is Map && responseData['status'] == 'success') {
          final List<dynamic> mainCategories = responseData['data'] ?? [];
          
          setState(() {
            // Duyệt qua danh mục lớn và lấy ra tên hiển thị đúng thuộc tính 'name'
            _categories = mainCategories.map((item) => item['name'].toString()).toList();
            _isLoadingCategories = false;
          });
          print('✅ Tải thành công nhóm tiêu chí: $_categories');
        } else {
          setState(() => _isLoadingCategories = false);
        }
      } else {
        setState(() => _isLoadingCategories = false);
      }
    } catch (e) {
      print('⚠️ Lỗi parse danh mục tiêu chí: $e');
      setState(() => _isLoadingCategories = false);
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  void _showImageSourceActionSheet() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (BuildContext context) {
        return SafeArea(
          child: Wrap(
            children: <Widget>[
              ListTile(
                leading: const Icon(Icons.photo_camera, color: Color(0xFF0D235E)),
                title: const Text('Chụp ảnh mới'),
                onTap: () {
                  Navigator.of(context).pop();
                  _pickImage(ImageSource.camera);
                },
              ),
              ListTile(
                leading: const Icon(Icons.photo_library, color: Color(0xFF0D235E)),
                title: const Text('Chọn từ thư viện'),
                onTap: () {
                  Navigator.of(context).pop();
                  _pickImage(ImageSource.gallery);
                },
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _pickImage(ImageSource source) async {
    final ImagePicker picker = ImagePicker();
    try {
      final XFile? image = await picker.pickImage(source: source, imageQuality: 80);
      if (image != null) {
        final bytes = await image.readAsBytes();
        setState(() { _selectedImage = image; _imageBytes = bytes; });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Không thể mở máy ảnh/thư viện!'), backgroundColor: Colors.red));
    }
  }

  Future<void> _submitEvidence() async {
    final finalEventId = widget.initialEventId ?? _selectedEventId;

    // SỬA LOGIC CHẶN: Chỉ bắt buộc kiểm tra hình ảnh nếu _currentEventRequireProof bằng TRUE
    if (_nameController.text.isEmpty || 
        _selectedCategory == null || 
        finalEventId == null || 
        (_currentEventRequireProof && _selectedImage == null)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('⚠️ Vui lòng chọn sự kiện và tải lên ảnh minh chứng bắt buộc!'), backgroundColor: Colors.red)
      );
      return;
    }
    
    setState(() => _isSubmitting = true);
    
    try {
      final prefs = await SharedPreferences.getInstance();
      final String? savedUserData = prefs.getString('user_data');
      String realMssv = 'Chưa rõ MSSV';
      int realStudentId = 1;
      String realFullName = ''; 

      if (savedUserData != null) {
        final Map<String, dynamic> localData = jsonDecode(savedUserData);
        realMssv = localData['mssv']?.toString() ?? 'Chưa rõ MSSV';
        realStudentId = int.tryParse(localData['id']?.toString() ?? '1') ?? 1;
        realFullName = localData['full_name']?.toString() ?? ''; 
      }

// -----------------------------------------------------------------
// SỬA LẠI ĐOẠN ĐÓNG GÓI FORM DATA TRONG EVIDENCE_SUBMIT_SCREEN.DART
// -----------------------------------------------------------------
Map<String, dynamic> mapData = {
  'student_id': realStudentId,  
  'mssv': realMssv,             
  'student_name': realFullName, 
  'event_id': finalEventId, 
  'event_name': _nameController.text,
  'category': _selectedCategory,
  'latitude': widget.latitude ?? 0.0,
  'longitude': widget.longitude ?? 0.0,
};

FormData formData = FormData.fromMap(mapData);

if (_selectedImage != null) {
  // Lấy tên file, nếu chạy trên web mất đuôi thì gán đuôi mặc định .jpg
  String fileName = _selectedImage!.name;
  if (!fileName.contains('.')) {
    fileName = '${DateTime.now().millisecondsSinceEpoch}.jpg';
  }

  formData.files.add(MapEntry(
    'proof_image',
    MultipartFile.fromBytes(
      _imageBytes ?? await _selectedImage!.readAsBytes(), 
      filename: fileName,
      contentType: MediaType('image', 'jpeg'), // Yêu cầu: import 'package:http_parser/http_parser.dart';
    ),
  ));
}
      
      Response response = await Dio().post('$backendBaseUrl/api/proofs/upload_ai', data: formData);
      
      if (response.statusCode == 200) {
        final data = response.data;
        if (!mounted) return;
        
        if (data['status'] == 'success') {
          await NotificationHelper.saveNotificationRecord(
            '✅ Điểm danh thành công', 
            'Bạn đã điểm danh và nộp minh chứng thành công cho sự kiện: ${_nameController.text}',
            eventId: finalEventId,
          );
          _showResultDialog(data['auto_status'] ?? 'pending', data['phash_warning']?.toString() == '1' ? 'Phát hiện trùng lặp' : 'Hợp lệ');
          
          _fetchSubmittedProofs();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('⚠️ Lỗi: ${data['message']}'), backgroundColor: Colors.orange));
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('⚠️ Lỗi kết nối: ${response.statusCode}'), backgroundColor: Colors.red));
      }
} catch (e) {
      if (!mounted) return;
      
      // Bóc tách lỗi chi tiết từ Dio nếu server trả về 400, 500
      if (e is DioException && e.response != null && e.response?.data != null) {
        final errorMessage = e.response?.data['error'] ?? e.response?.data['message'] ?? 'Lỗi không xác định từ máy chủ';
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('⚠️ $errorMessage'), backgroundColor: Colors.orange));
      } else {
        // Chỉ khi nào sập nguồn server hoặc mất mạng hoàn toàn mới hiện dòng này
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('❌ Lỗi kết nối tới máy chủ AI!'), backgroundColor: Colors.red));
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }
  
  void _showDetailDialogFromSubmit(Map<String, dynamic> item) {
    final String proofStatus = (item['proof_status'] ?? '').toString().trim().toLowerCase();
    final bool isApproved = proofStatus == 'approved';
    final bool isRejected = proofStatus == 'rejected';
    final bool isPending = proofStatus == 'pending' || (proofStatus.isEmpty && item['checkin_time'] != null);

    String statusText = 'KHÔNG YÊU CẦU MINH CHỨNG';
    Color statusColor = Colors.grey;
    Color statusBgColor = Colors.grey.shade100;
    if (isApproved) {
      statusText = 'ĐÃ DUYỆT MINH CHỨNG';
      statusColor = const Color(0xFF2ECA7F);
      statusBgColor = const Color(0xFF2ECA7F).withOpacity(0.1);
    } else if (isRejected) {
      statusText = 'BỊ TỪ CHỐI';
      statusColor = Colors.red;
      statusBgColor = Colors.red.withOpacity(0.1);
    } else if (isPending) {
      statusText = 'ĐANG CHỜ DUYỆT';
      statusColor = Colors.orange;
      statusBgColor = Colors.orange.withOpacity(0.1);
    }

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        contentPadding: EdgeInsets.zero,
        content: SizedBox(
          width: MediaQuery.of(context).size.width * 0.9,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                child: Container(
                  height: 100,
                  width: double.infinity,
                  color: const Color(0xFF0D235E),
                  child: Stack(
                    children: [
                      Positioned.fill(
                        child: Opacity(
                          opacity: 0.15,
                          child: const Center(
                            child: Text('CTUT', style: TextStyle(color: Colors.white, fontSize: 70, fontWeight: FontWeight.w900, letterSpacing: 5)),
                          ),
                        ),
                      ),
                      Positioned(
                        top: 10, left: 10,
                        child: CircleAvatar(
                          backgroundColor: Colors.black26, radius: 16,
                          child: IconButton(
                            padding: EdgeInsets.zero,
                            icon: const Icon(Icons.arrow_back, color: Colors.white, size: 18),
                            onPressed: () => Navigator.pop(ctx),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(color: const Color(0xFFE8EFFF), borderRadius: BorderRadius.circular(4)),
                            child: Text(item['category']?.toString() ?? 'Tham gia học tập', style: const TextStyle(color: Color(0xFF0D235E), fontSize: 11, fontWeight: FontWeight.bold)),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(color: statusBgColor, borderRadius: BorderRadius.circular(4)),
                            child: Text(statusText.toUpperCase(), style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.bold)),
                          ),
                          const Spacer(),
                          Text('+${item['points'] ?? 0} ĐRL', style: const TextStyle(color: Color(0xFF2ECA7F), fontWeight: FontWeight.bold, fontSize: 14)),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Container(
                        width: double.infinity, padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(color: const Color(0xFFFFF7EB), borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFFFFE3B8))),
                        child: Row(
                          children: [
                            const Icon(Icons.star, color: Colors.orange, size: 18),
                            const SizedBox(width: 8),
                            Text('Điểm rèn luyện/hoạt động: ${item['points'] ?? 0}', style: const TextStyle(color: Color(0xFFB36B00), fontWeight: FontWeight.bold, fontSize: 13)),
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),
                      Text(item['name'] ?? 'Tên sự kiện', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87)),
                      const SizedBox(height: 14),
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(color: const Color(0xFFF8F9FA), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200)),
                        child: Column(
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.play_circle_outline, size: 18, color: Color(0xFF0D235E)),
                                const SizedBox(width: 8),
                                Text('Bắt đầu: ', style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
                                Expanded(child: Text(_formatDateTime(item['event_date'] ?? item['date']), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500))),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                const Icon(Icons.stop_circle_outlined, size: 18, color: Color(0xFF0D235E)),
                                const SizedBox(width: 8),
                                Text('Kết thúc: ', style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
                                Expanded(child: Text(_formatDateTime(item['event_end_date'] ?? item['end_date']), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500))),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                const Icon(Icons.location_on_outlined, size: 18, color: Color(0xFF0D235E)),
                                const SizedBox(width: 8),
                                Text('Hình thức: ', style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
                                Expanded(child: Text(item['method'] ?? 'Quét mã QR hệ thống', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500))),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Text('Nội dung chi tiết', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0D235E))),
                      const SizedBox(height: 6),
                      Text(
                        (item['event_description'] != null && item['event_description'].toString().isNotEmpty)
                            ? item['event_description'].toString()
                            : (item['description'] != null && item['description'].toString().isNotEmpty)
                                ? item['description'].toString()
                                : 'Không có mô tả chi tiết cho hoạt động này.',
                        style: TextStyle(fontSize: 13, color: Colors.grey.shade700, height: 1.4),
                      ),
                      const SizedBox(height: 16),
                      const Text('Tài liệu đính kèm', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0D235E))),
                      const SizedBox(height: 8),
                      () {
                        List<String> attachedFiles = [];
                        try {
                          final rawAttached = item['attached_file'] ?? item['event_attached_file'];
                          if (rawAttached != null && rawAttached.toString().isNotEmpty) {
                            final decoded = jsonDecode(rawAttached.toString());
                            if (decoded is List) attachedFiles = decoded.map((f) => f.toString()).toList();
                          }
                        } catch (e) {
                          if (item['attached_file'] != null) attachedFiles.add(item['attached_file'].toString());
                        }

                        if (attachedFiles.isEmpty) {
                          return Padding(padding: const EdgeInsets.symmetric(vertical: 4.0), child: Text('Không có tài liệu đính kèm.', style: TextStyle(fontSize: 12, color: Colors.grey.shade500, fontStyle: FontStyle.italic)));
                        }

                        return Column(
                          children: attachedFiles.map((filePath) {
                            final fileName = filePath.split('/').last;
                            return Container(
                              margin: const EdgeInsets.only(bottom: 8), padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(color: const Color(0xFFF8F9FA), borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.grey.shade200)),
                              child: Row(
                                children: [
                                  Icon(fileName.endsWith('.pdf') ? Icons.picture_as_pdf : Icons.description, color: fileName.endsWith('.pdf') ? Colors.red : Colors.blue, size: 28),
                                  const SizedBox(width: 10),
                                  Expanded(child: Text(fileName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13), maxLines: 1, overflow: TextOverflow.ellipsis)),
                                  const Icon(Icons.download, color: Color(0xFF0D235E), size: 20),
                                ],
                              ),
                            );
                          }).toList(),
                        );
                      }(),
                    ],
                  ),
                ),
              ),
              Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  color: isApproved ? Colors.grey.shade300 : const Color(0xFF0D235E),
                  borderRadius: const BorderRadius.vertical(bottom: Radius.circular(16)),
                ),
                child: isApproved
                    ? const Padding(padding: EdgeInsets.all(14), child: Center(child: Text('Đã được phê duyệt hoàn tất', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14))))
                    : Builder(
                        builder: (context) {
                          bool isExpired = false;
                          final now = DateTime.now();
                          final endData = item['event_end_date'] ?? item['end_date'];
                          if (endData != null) {
                            final endTime = DateTime.tryParse(endData.toString());
                            if (endTime != null && now.isAfter(endTime)) isExpired = true;
                          }

                          if (isExpired) {
                            return Padding(
                              padding: const EdgeInsets.all(14),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(Icons.lock_clock, color: Colors.white, size: 18),
                                  const SizedBox(width: 8),
                                  Text('SỰ KIỆN ĐÃ HẾT HẠN - KHÔNG THỂ NỘP LẠI MINH CHỨNG', style: TextStyle(color: Colors.white.withOpacity(0.9), fontWeight: FontWeight.bold, fontSize: 13)),
                                ],
                              ),
                            );
                          }

// TÌM ĐOẠN NÀY VÀ SỬA LẠI:
return InkWell(
onTap: () {
  Navigator.pop(ctx);
  setState(() {
    _selectedEventId = item['event_id']?.toString();
    _nameController.text = item['name']?.toString() ?? '';
    _selectedCategory = item['category']?.toString();
    
    _currentEventRequireProof = item['require_proof'] == 1 || 
                                item['require_proof'] == '1' || 
                                item['require_proof'] == true;

    _selectedImage = null;
    _imageBytes = null;

    // ---------------------------------------------------------
    // VÁ LOGIC: Đút tạm sự kiện pending vào list để Dropdown nhận diện
    // ---------------------------------------------------------
    if (_selectedEventId != null) {
      // Normalize and ensure we don't introduce duplicates
      final newEvent = {
        'id': _selectedEventId.toString(),
        'name': _nameController.text,
        'category': _selectedCategory,
        'require_proof': _currentEventRequireProof,
      };

      _ongoingEvents.add(newEvent);

      // Rebuild unique list by id string
      final Map<String, dynamic> uniq = {};
      for (var ev in _ongoingEvents) {
        final idStr = ev['id']?.toString() ?? '';
        if (idStr.isEmpty) continue;
        if (!uniq.containsKey(idStr)) uniq[idStr] = ev;
      }
      _ongoingEvents = uniq.values.toList();
    }
  });
},
  borderRadius: const BorderRadius.vertical(bottom: Radius.circular(16)),
  child: Padding(
    padding: const EdgeInsets.all(14),
    child: Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(isRejected ? Icons.replay_rounded : Icons.edit_document, color: Colors.white, size: 18),
        const SizedBox(width: 8),
        Text(isRejected ? 'MINH CHỨNG BỊ TỪ CHỐI - BẤM ĐỂ NỘP LẠI' : 'ĐANG CHỜ DUYỆT - BẤM ĐỂ CẬP NHẬT LẠI', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
      ],
    ),
  ),
);
                        }
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showResultDialog(String status, String aiMessage) {
    showDialog(
      context: context,
      barrierDismissible: false, 
      builder: (ctx) => AlertDialog(
        title: const Text('Kết quả Nộp Minh Chứng', style: TextStyle(fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(status == 'approved' ? '✅ Hệ thống AI đã duyệt tự động!' : '⏳ Đã nộp. Đang chờ cán bộ duyệt.'),
            const SizedBox(height: 12),
            Text('Phân tích từ AI:', style: TextStyle(color: Colors.grey.shade700, fontSize: 12)),
            Text(aiMessage, style: TextStyle(
              color: aiMessage.contains('trùng lặp') || aiMessage.contains('⚠️') ? Colors.red : Colors.green, 
              fontWeight: FontWeight.bold
            )),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(ctx); 
              if (widget.initialEventId != null && Navigator.canPop(context)) {
                Navigator.pop(context, true); 
              } else {
                setState(() {
                  if (widget.initialEventName == null) _nameController.clear();
                  if (widget.initialCategory == null) _selectedCategory = null;
                  _selectedEventId = null;
                  _selectedImage = null;
                  _imageBytes = null;
                });
                _fetchOngoingEvents(); 
              }
            }, 
            child: const Text('Đóng', style: TextStyle(color: Color(0xFF0D235E), fontWeight: FontWeight.bold))
          )
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    String avatarUrl = getUserAvatarUrl(widget.userData);

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: buildSharedAppBar('Nộp Minh Chứng', avatarUrl),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // --- BOX 1: FORM NỘP MINH CHỨNG ---
            Container(
              padding: const EdgeInsets.all(20), 
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Nộp Minh Chứng Mới', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0D235E))),
                  const SizedBox(height: 20),
                  
                  const Text('TÊN HOẠT ĐỘNG', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                  const SizedBox(height: 8),
                  
                  if (widget.initialEventId != null)
                    TextField(
                      controller: _nameController, 
                      readOnly: true,
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: Colors.grey.shade100,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8))
                      )
                    )
                  else
                    _isLoadingEvents 
                      ? const Center(child: CircularProgressIndicator(color: Color(0xFF0D235E)))
                      : _ongoingEvents.isEmpty
                        ? const Text('Bạn chưa tham gia sự kiện nào cần nộp minh chứng.', style: TextStyle(color: Colors.red, fontStyle: FontStyle.italic))
                        : DropdownButtonFormField<String>(
  // --- FIX LỖI DROPDOWN CRASH TẠI ĐÂY ---
  // Kiểm tra: Nếu list hiển thị chứa ID đang chọn thì mới truyền vào, nếu không thì trả về null
  value: _ongoingEvents.any((e) => e['id'].toString() == _selectedEventId)
      ? _selectedEventId
      : null,
  hint: const Text('Chọn sự kiện bạn đã tham gia'),
  isExpanded: true,
  decoration: InputDecoration(border: OutlineInputBorder(borderRadius: BorderRadius.circular(8))),
  items: _ongoingEvents.map((e) => DropdownMenuItem<String>(
    value: e['id'].toString(), 
    child: Text(e['name'], maxLines: 1, overflow: TextOverflow.ellipsis)
  )).toList(),
  onChanged: (val) {
    setState(() {
      _selectedEventId = val;
      final ev = _ongoingEvents.firstWhere((e) => e['id'].toString() == val);
      _nameController.text = ev['name'];
      _selectedCategory = ev['category'];
      
      _currentEventRequireProof = ev['require_proof'] == 1 || 
                                  ev['require_proof'] == '1' || 
                                  ev['require_proof'] == true;

      _selectedImage = null;
      _imageBytes = null;
    });
  },
),
                  const SizedBox(height: 16),
                  
const Text('DANH MỤC TIÊU CHÍ', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
const SizedBox(height: 8),

if (widget.initialCategory != null || _selectedEventId != null)
  TextField(
    controller: TextEditingController(text: _selectedCategory ?? ''),
    readOnly: true,
    decoration: InputDecoration(
      filled: true,
      fillColor: Colors.grey.shade100,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8))
    )
  )
else
  _isLoadingCategories 
    ? const Center(child: CircularProgressIndicator(color: Color(0xFF0D235E)))
    : DropdownButtonFormField<String>(
  // Chuẩn hóa bảo vệ: Nếu danh sách sự kiện đang hoạt động chứa ID đang chọn thì hiển thị,
  // nếu không (hoặc là sự kiện pending nạp tạm) thì tự động trả về null để tránh crash.
  value: _ongoingEvents.any((e) => e['id'].toString() == _selectedEventId?.toString())
      ? _selectedEventId?.toString()
      : null,
  hint: const Text('Chọn sự kiện bạn đã tham gia'),
  isExpanded: true,
  decoration: InputDecoration(border: OutlineInputBorder(borderRadius: BorderRadius.circular(8))),
  items: _ongoingEvents.map((e) => DropdownMenuItem<String>(
    value: e['id'].toString(), 
    child: Text(e['name'] ?? 'Chưa có tên', maxLines: 1, overflow: TextOverflow.ellipsis)
  )).toList(),
  onChanged: (val) {
    setState(() {
      _selectedEventId = val;
      final ev = _ongoingEvents.firstWhere((e) => e['id'].toString() == val);
      _nameController.text = ev['name'] ?? '';
      _selectedCategory = ev['category'];
      
      _currentEventRequireProof = ev['require_proof'] == 1 || 
                                  ev['require_proof'] == '1' || 
                                  ev['require_proof'] == true;

      // Reset file để sinh viên sẵn sàng chụp/tải ảnh mới cho lượt tiếp theo
      _selectedImage = null;
      _imageBytes = null;
    });
  },
),
                  const SizedBox(height: 16),
                  
                  GestureDetector(
                    onTap: _showImageSourceActionSheet, 
                    child: Container(
                      width: double.infinity, height: 180,
                      decoration: BoxDecoration(
                        color: const Color(0xFFF4F6FB), 
                        borderRadius: BorderRadius.circular(12), 
                        border: Border.all(color: const Color(0xFFD6E0FF)), 
                        image: _imageBytes != null 
                          ? DecorationImage(image: MemoryImage(_imageBytes!), fit: BoxFit.cover) 
                          : null
                      ),
                      child: _imageBytes == null 
                        ? Column(
                            mainAxisAlignment: MainAxisAlignment.center, 
                            children: [
                              Icon(
                                Icons.camera_alt, 
                                size: 40, 
                                color: _currentEventRequireProof ? const Color(0xFF0D235E) : Colors.grey
                              ), 
                              const SizedBox(height: 8), 
                              Text(
                                _currentEventRequireProof 
                                  ? 'Nhấn để chụp hoặc tải ảnh lên (*)' 
                                  : 'Sự kiện quét mã QR - Tải ảnh lên ', 
                                style: TextStyle(
                                  fontWeight: FontWeight.bold, 
                                  color: _currentEventRequireProof ? const Color(0xFF0D235E) : Colors.green
                                )
                              )
                            ]
                          )
                        : const Stack(
                            children: [
                              Positioned(bottom: 8, right: 8, child: CircleAvatar(backgroundColor: Colors.black54, radius: 16, child: Icon(Icons.edit, color: Colors.white, size: 20))),
                            ],
                          ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  
                  SizedBox(
                    width: double.infinity, height: 45,
                    child: ElevatedButton(
                      onPressed: _isSubmitting ? null : _submitEvidence, 
                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0D235E)), 
                      child: _isSubmitting 
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) 
                        : const Text('Gửi Minh Chứng Lên CSDL', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold))
                    ),
                  )
                ],
              ),
            ),
            
            const SizedBox(height: 20),

            // --- BOX 2: CHI TIẾT HOẠT ĐỘNG ĐÃ THAM GIA ---
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Hoạt động tham gia gần đây', 
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0D235E)),
                ),
                if (_submittedProofsList.length > 5)
                  TextButton(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => HistoryScreen(userData: widget.userData),
                        ),
                      );
                    },
                    child: const Row(
                      children: [
                        Text('Xem thêm', style: TextStyle(color: Color(0xFF0D235E), fontWeight: FontWeight.bold)),
                        Icon(Icons.arrow_forward_ios, size: 14, color: Color(0xFF0D235E)),
                      ],
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 8),

            _isLoadingProofs
                ? const Center(child: Padding(padding: EdgeInsets.all(16.0), child: CircularProgressIndicator()))
                : _submittedProofsList.isEmpty
                    ? const Card(
                        child: Padding(
                          padding: EdgeInsets.all(24.0),
                          child: Center(child: Text('Bạn chưa nộp minh chứng cho sự kiện nào.', style: TextStyle(color: Colors.grey))),
                        ),
                      )
                    : ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: _submittedProofsList.length > 5 ? 5 : _submittedProofsList.length,
                        itemBuilder: (context, index) {
                          final item = _submittedProofsList[index];
                          
                          String statusLabel = 'Đang chờ';
                          Color labelColor = Colors.orange;
                          IconData leadingIcon = Icons.pending;
                          
                          final String currentStatus = (item['proof_status'] ?? '').toString().trim().toLowerCase();

                          if (currentStatus == 'approved') {
                            statusLabel = 'Đã duyệt';
                            labelColor = const Color(0xFF2ECA7F);
                            leadingIcon = Icons.check_circle;
                          } else if (currentStatus == 'rejected') {
                            statusLabel = 'Bị từ chối';
                            labelColor = Colors.red;
                            leadingIcon = Icons.cancel;
                          }

// SỬA LẠI ĐOẠN LISTTILE TRONG LISTVIEW.BUILDER
return Card(
  margin: const EdgeInsets.only(bottom: 12),
  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
  child: InkWell(
    borderRadius: BorderRadius.circular(12),
    onTap: () => _showDetailDialogFromSubmit(item),
    child: ListTile(
      contentPadding: const EdgeInsets.all(16),
      leading: CircleAvatar(
        backgroundColor: labelColor.withOpacity(0.2),
        child: Icon(leadingIcon, color: labelColor),
      ),
      // Cách sửa bảo vệ phần Title không lấn át không gian ngang
      title: Text(
        item['name'] ?? 'Tên sự kiện', 
        style: const TextStyle(fontWeight: FontWeight.bold),
        maxLines: 1,
        overflow: TextOverflow.ellipsis, // Thêm dấu ... nếu tên quá dài
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 8),
          Text('Thời gian check-in: ${_formatDateTime(item['checkin_time'])}', style: const TextStyle(fontSize: 12)),
          const SizedBox(height: 4),
          Text(
            'Trạng thái minh chứng: $statusLabel', 
            style: TextStyle(fontSize: 12, color: labelColor, fontWeight: FontWeight.bold)
          ),
        ],
      ),
      // --- FIX LỖI RENDERFLEX OVERFLOWED TẠI ĐÂY ---
      trailing: SizedBox(
        width: 85, // Giới hạn không gian cố định cho khu vực điểm số
        child: Row(
          mainAxisAlignment: MainAxisAlignment.end, // Đẩy toàn bộ nội dung về bên phải sát lề
          children: [
            Expanded(
              child: Text(
                '+${item['points'] ?? 0} Đ', 
                style: const TextStyle(color: Color(0xFF0D235E), fontWeight: FontWeight.bold, fontSize: 16),
                textAlign: TextAlign.end,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 4),
            const Icon(Icons.chevron_right, color: Colors.grey, size: 18),
          ],
        ),
      ),
    ),
  ),
);
                        },
                      ),
          ],
        ),
      ),
    );
  }
}