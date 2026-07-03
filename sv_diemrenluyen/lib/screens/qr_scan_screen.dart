import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:geolocator/geolocator.dart';
import 'package:dio/dio.dart';
import 'package:image_picker/image_picker.dart'; 
import '../widgets/shared_app_bar.dart'; 
import '../core/app_config.dart';
import 'evidence_submit_screen.dart'; 
import 'package:flutter/foundation.dart';
import 'package:image/image.dart' as img;
import 'package:qr_code_vision/qr_code_vision.dart';
class QRScanScreen extends StatefulWidget {
  final Map<String, dynamic> userData;
  final String? expectedEventId;   
  final String? expectedEventName; 
  final String? expectedCategory;

  const QRScanScreen({
    Key? key, 
    required this.userData,
    this.expectedEventId, 
    this.expectedEventName,
    this.expectedCategory,
  }) : super(key: key);

  @override
  State<QRScanScreen> createState() => _QRScanScreenState();
}

class _QRScanScreenState extends State<QRScanScreen> {
  final MobileScannerController _scannerController = MobileScannerController();
  final Dio _dio = Dio();
  
  bool _isProcessing = false;
  bool _isGpsLocked = false;
  Position? _currentPosition;
  String _gpsStatusText = 'Đang tìm vị trí...';
  List<dynamic> _localEvents = []; 
  bool _isPreFetchDataLoaded = false;
  @override
  void initState() {
    super.initState();
    _determinePosition();
    _preFetchEventsData();
  }

  Future<void> _preFetchEventsData() async {
    try {
      final mssv = widget.userData['mssv'] ?? '';
      // Gọi API lấy dữ liệu một lần duy nhất lúc vào màn hình
      final response = await _dio.get('$backendBaseUrl/api/mobile/events?mssv=$mssv');
      
      if (response.statusCode == 200 && response.data['status'] == 'success') {
        if (mounted) {
          setState(() {
            _localEvents = response.data['events'] ?? [];
            _isPreFetchDataLoaded = true;
          });
        }
      }
    } catch (e) {
      print('Cảnh báo lỗi Pre-fetch dữ liệu: $e');
      // Không cần block người dùng, nếu lỗi ta sẽ xử lý dự phòng ở hàm check-in sau
    }
  }

  @override
  void dispose() {
    _scannerController.dispose();
    super.dispose();
  }

  Future<void> _determinePosition() async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      if(mounted) setState(() => _gpsStatusText = 'Vui lòng bật GPS');
      return;
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        if(mounted) setState(() => _gpsStatusText = 'Bị từ chối quyền vị trí');
        return;
      }
    }
    
    if (permission == LocationPermission.deniedForever) {
      if(mounted) setState(() => _gpsStatusText = 'Quyền bị vô hiệu hóa vĩnh viễn');
      return;
    }

    try {
      Position position = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
      if(mounted) {
        setState(() {
          _currentPosition = position;
          _isGpsLocked = true;
          _gpsStatusText = 'Đã chốt vị trí GPS';
        });
      }
    } catch (e) {
      if(mounted) setState(() => _gpsStatusText = 'Lỗi lấy tọa độ GPS');
    }
  }

  void _showErrorAndResume(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message), backgroundColor: Colors.red));
    setState(() => _isProcessing = false);
    _scannerController.start();
  }

  // --- HÀM MỞ HỘP THOẠI CHỌN NGUỒN ẢNH QR (CHỤP HOẶC THƯ VIỆN) ---
  void _showQrImageSourceSheet() {
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
                title: const Text('Chụp ảnh mã QR mới'),
                onTap: () {
                  Navigator.of(context).pop();
                  _pickAndDecodeQrImage(ImageSource.camera);
                },
              ),
              ListTile(
                leading: const Icon(Icons.photo_library, color: Color(0xFF0D235E)),
                title: const Text('Chọn ảnh mã QR từ thư viện'),
                onTap: () {
                  Navigator.of(context).pop();
                  _pickAndDecodeQrImage(ImageSource.gallery);
                },
              ),
            ],
          ),
        );
      },
    );
  }

// --- HÀM CHẠY NỀN (ISOLATE) ĐỂ KHÔNG LÀM ĐƠ TRÌNH DUYỆT ---


// --- HÀM CHẠY NỀN ĐỂ ĐỌC QR TRÊN WEB (TRÁNH ĐƠ GIAO DIỆN) ---
  static String? _decodeQrTask(Uint8List bytes) {
    final img.Image? decodedImage = img.decodeImage(bytes);
    if (decodedImage == null) return null;

    final img.Image smallImage = img.copyResize(decodedImage, width: 400);
    final int width = smallImage.width;
    final int height = smallImage.height;
    final rgbaBytes = smallImage.getBytes(order: img.ChannelOrder.rgba);

    final qrCode = QrCode();
    qrCode.scanRgbaBytes(rgbaBytes, width, height);

    return qrCode.content?.text;
  }

  // --- THUẬT TOÁN ĐỌC MÃ QR ĐA NỀN TẢNG ---
  Future<void> _pickAndDecodeQrImage(ImageSource source) async {
    final ImagePicker picker = ImagePicker();
    try {
      final XFile? image = await picker.pickImage(
        source: source, 
        imageQuality: 60,
      );
      if (image == null) return;

      // 1. Hiển thị loading và tắt camera
      setState(() => _isProcessing = true);
      await _scannerController.stop();

      String? decodedCode;

      // 2. RẼ NHÁNH XỬ LÝ THEO NỀN TẢNG
      if (kIsWeb) {
        // --- XỬ LÝ TRÊN WEB (Dùng QR Code Vision thuần Dart) ---
        final bytes = await image.readAsBytes();
        decodedCode = await compute(_decodeQrTask, bytes);
      } else {
        // --- XỬ LÝ TRÊN APP ANDROID/IOS (Dùng ML Kit cực nhanh) ---
        final BarcodeCapture? capture = await _scannerController.analyzeImage(image.path);
        if (capture != null && capture.barcodes.isNotEmpty) {
          decodedCode = capture.barcodes.first.rawValue;
        }
      }

      // 3. VÁ LỖI TREO LOADING VĨNH VIỄN
      // Bắt buộc phải tắt biến _isProcessing TRƯỚC KHI gọi _handleCheckIn
      setState(() => _isProcessing = false);

      // 4. KIỂM TRA VÀ CHUYỂN HƯỚNG
      if (decodedCode != null && decodedCode.isNotEmpty) {
        _handleCheckIn(decodedCode);
      } else {
        _showErrorAndResume('Không tìm thấy mã QR trong ảnh hoặc ảnh quá mờ!');
      }
      
    } catch (e) {
      _showErrorAndResume('Lỗi xử lý giải mã ảnh: $e');
    }
  }

// --- XỬ LÝ QUÉT THÔNG MINH (TRÍCH XUẤT ID & ĐĂNG KÝ NHANH) ---
  Future<void> _handleCheckIn(String qrData) async {
    // 1. CHẶN LẬP TỨC: Đổi trạng thái xử lý và dừng quét ngay để tránh đơ app
    if (_isProcessing || !_isGpsLocked || _currentPosition == null) return;
    
    setState(() => _isProcessing = true);
    await _scannerController.stop(); // Chờ controller dừng hẳn

    // Trích xuất lấy ID từ chuỗi URL QR (Vd: http://localhost:3000/checkin/EV-1234 -> EV-1234)
    String scannedEventId = qrData.split('/').last.trim();

    try {
      final mssv = widget.userData['mssv'] ?? '';

      // TÌM KIẾM SỰ KIỆN TRONG DỮ LIỆU ĐÃ TẢI TRƯỚC (Tốc độ phản hồi 0ms)
      dynamic matchedEvent = _localEvents.firstWhere(
        (e) => e['id'].toString() == scannedEventId,
        orElse: () => null
      );

      // DỰ PHÒNG (Fallback): Nếu lúc vào màn hình bị lỗi mạng chưa tải được dữ liệu, tiến hành fetch lại
      if (matchedEvent == null && !_isPreFetchDataLoaded) {
        final response = await _dio.get('$backendBaseUrl/api/mobile/events?mssv=$mssv');
        if (response.statusCode == 200 && response.data['status'] == 'success') {
          _localEvents = response.data['events'] ?? [];
          _isPreFetchDataLoaded = true;
          matchedEvent = _localEvents.firstWhere(
            (e) => e['id'].toString() == scannedEventId,
            orElse: () => null
          );
        }
      }

      // Nếu vẫn không tìm thấy sự kiện
      if (matchedEvent == null) {
        _showErrorAndResume('Mã QR không hợp lệ hoặc sự kiện không tồn tại trên hệ thống!');
        return;
      }

      // Kiểm tra trạng thái đăng ký của sinh viên
      bool isRegistered = matchedEvent['is_registered'] == 1 || matchedEvent['is_registered'] == '1';
      
      if (!isRegistered) {
        bool? confirm = await showDialog<bool>(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            title: const Text('Phát hiện chưa đăng ký', style: TextStyle(color: Colors.orange, fontWeight: FontWeight.bold)),
            content: Text('Bạn chưa đăng ký tham gia sự kiện:\n\n"${matchedEvent['name']}"\n\nBạn có muốn ghi danh và điểm danh luôn bây giờ không?'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Hủy bỏ', style: TextStyle(color: Colors.grey))),
              ElevatedButton(
                onPressed: () => Navigator.pop(ctx, true), 
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0D235E)),
                child: const Text('Đăng ký & Điểm danh', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold))
              ),
            ],
          )
        );

        if (confirm != true) {
          _showErrorAndResume('Đã hủy thao tác điểm danh.');
          return;
        }

        showDialog(context: context, barrierDismissible: false, builder: (_) => const Center(child: CircularProgressIndicator()));
        final regRes = await _dio.post('$backendBaseUrl/api/mobile/register_event', data: {'event_id': scannedEventId, 'mssv': mssv});
        Navigator.pop(context); 

        if (regRes.data['status'] != 'success') {
          _showErrorAndResume('Đăng ký thất bại: ${regRes.data['message']}');
          return;
        }
      }

      bool requireProof = matchedEvent['require_proof'] == 1 || matchedEvent['require_proof'] == '1' || matchedEvent['require_proof'] == true;

      final result = await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => EvidenceSubmitScreen(
            userData: widget.userData,
            initialEventId: scannedEventId,
            initialEventName: matchedEvent['name'],
            initialCategory: matchedEvent['category'],
            latitude: _currentPosition!.latitude,
            longitude: _currentPosition!.longitude,
            requireProof: requireProof,
          ),
        ),
      );

      if (result == true) {
        if (!mounted) return;
        if (Navigator.canPop(context)) {
          Navigator.pop(context, true); 
        } else {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('✅ Check-in hoàn tất!'), backgroundColor: Colors.green));
          setState(() => _isProcessing = false);
          _scannerController.start();
        }
      } else {
        setState(() => _isProcessing = false);
        _scannerController.start();
      }

    } catch (e) {
      _showErrorAndResume('Lỗi kết nối mạng: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    String avatarUrl = getUserAvatarUrl(widget.userData);

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: buildSharedAppBar('Điểm danh QR', avatarUrl),
      body: Stack(
        children: [
          Center(
            child: Container(
              width: double.infinity, height: double.infinity,
              decoration: const BoxDecoration(
                image: DecorationImage(
                  image: NetworkImage('https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1000&auto=format&fit=crop'), 
                  fit: BoxFit.cover, 
                  colorFilter: ColorFilter.mode(Colors.black54, BlendMode.darken)
                ),
              ),
            ),
          ),
          
          Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(vertical: 40),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('Quét QR Sự Kiện', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  const Text('Đưa mã QR vào khung hoặc đăng tải từ ảnh', style: TextStyle(color: Colors.white70, fontSize: 14)),
                  const SizedBox(height: 40),
                  
                  Container(
                    width: 250, height: 250,
                    decoration: BoxDecoration(
                      border: Border.all(color: const Color(0xFF2ECA7F), width: 2), 
                      borderRadius: BorderRadius.circular(16)
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(14),
                      child: Stack(
                        children: [
                          MobileScanner(
                            controller: _scannerController,
                            onDetect: (BarcodeCapture capture) {
                              final List<Barcode> barcodes = capture.barcodes;
                              if (barcodes.isNotEmpty) {
                                final String code = barcodes.first.rawValue ?? '';
                                _handleCheckIn(code);
                              }
                            },
                          ),
                          if (_isProcessing)
                            Container(
                              color: Colors.black54,
                              child: const Center(child: CircularProgressIndicator(color: Color(0xFF2ECA7F))),
                            ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),
                  
                  // --- CỤM NÚT TRỢ NĂNG: FLASH & CHỌN ẢNH QR ---
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Nút 1: Bật tắt Đèn Flash
                      GestureDetector(
                        onTap: () => _scannerController.toggleTorch(),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10), 
                          decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(30), border: Border.all(color: Colors.white24)), 
                          child: const Row(
                            mainAxisSize: MainAxisSize.min, 
                            children: [
                              Icon(Icons.flashlight_on, color: Colors.white, size: 18), 
                              SizedBox(width: 8), 
                              Text('Đèn Flash', style: TextStyle(color: Colors.white, fontSize: 13))
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      // Nút 2: Chọn từ ảnh/Chụp ảnh thiết bị
                      GestureDetector(
                        onTap: _showQrImageSourceSheet,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10), 
                          decoration: BoxDecoration(color: const Color(0xFF0D235E).withOpacity(0.8), borderRadius: BorderRadius.circular(30), border: Border.all(color: const Color(0xFF2ECA7F).withOpacity(0.5))), 
                          child: const Row(
                            mainAxisSize: MainAxisSize.min, 
                            children: [
                              Icon(Icons.image_search, color: Color(0xFF2ECA7F), size: 18), 
                              SizedBox(width: 8), 
                              Text('Tải ảnh QR', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold))
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 100), 
                ],
              ),
            ),
          ),

          Positioned(
            bottom: 30, left: 20, right: 20,
            child: Container(
              padding: const EdgeInsets.all(16), 
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10), 
                    decoration: BoxDecoration(
                      color: _isGpsLocked ? const Color(0xFF2ECA7F).withOpacity(0.2) : Colors.orange.withOpacity(0.2), 
                      shape: BoxShape.circle
                    ), 
                    child: Icon(Icons.location_on, color: _isGpsLocked ? const Color(0xFF2ECA7F) : Colors.orange)
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start, 
                      children: [
                        Text(_gpsStatusText, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)), 
                        Text(_isGpsLocked ? 'Sẵn sàng điểm danh' : 'Đang xử lý...', style: const TextStyle(color: Colors.grey, fontSize: 12))
                      ],
                    ),
                  ),
                  if (_isGpsLocked)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6), 
                      decoration: BoxDecoration(color: const Color(0xFF2ECA7F).withOpacity(0.2), borderRadius: BorderRadius.circular(4)), 
                      child: const Text('ACTIVE', style: TextStyle(color: Color(0xFF2ECA7F), fontWeight: FontWeight.bold, fontSize: 10))
                    )
                  else
                    const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
                ],
              ),
            ),
          )
        ],
      ),
    );
  }
}