import 'package:flutter/material.dart';
import 'dart:async';
import 'dart:convert';                                // Thêm thư viện giải mã JSON
import 'package:shared_preferences/shared_preferences.dart'; // Thêm thư viện bộ nhớ
import '../screens/notification_screen.dart';
import '../screens/notification_helper.dart';
import '../core/app_config.dart';                     // Thêm để dùng hàm getUserAvatarUrl

// 1. Hàm gọi chung cho toàn app, không làm vỡ code cũ ở các màn hình khác
PreferredSizeWidget buildSharedAppBar(String title, String avatarUrl) {
  return SharedAppBarWidget(title: title, avatarUrl: avatarUrl);
}

// 2. Class StatefulWidget để biến AppBar thành một Widget "sống"
class SharedAppBarWidget extends StatefulWidget implements PreferredSizeWidget {
  final String title;
  final String avatarUrl;

  const SharedAppBarWidget({super.key, required this.title, required this.avatarUrl});

  @override
  State<SharedAppBarWidget> createState() => _SharedAppBarWidgetState();

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);
}

// 3. State xử lý logic đếm thông báo và hiển thị giao diện
class _SharedAppBarWidgetState extends State<SharedAppBarWidget> {
  int _unreadCount = 0;
  Timer? _timer;
  String _currentAvatarUrl = ''; // Biến lưu ảnh hiện tại của AppBar

  @override
  void initState() {
    super.initState();
    _currentAvatarUrl = widget.avatarUrl; // Lấy ảnh lúc đầu truyền vào
    _loadUnreadCount();
    _syncAvatarFromStorage(); // Cập nhật ngay khi khởi tạo

    // Tự động quét cập nhật thông báo VÀ avatar mỗi 3 giây ở mọi màn hình
    _timer = Timer.periodic(const Duration(seconds: 3), (timer) {
      if (mounted) {
        _loadUnreadCount();
        _syncAvatarFromStorage();
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  // HÀM MỚI: Tự động kiểm tra bộ nhớ máy xem có link Avatar mới không
  Future<void> _syncAvatarFromStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final String? savedUserData = prefs.getString('user_data');
      if (savedUserData != null) {
        final Map<String, dynamic> localData = jsonDecode(savedUserData);
        // Dùng hàm từ app_config để tạo link chuẩn xác
        String latestAvatar = getUserAvatarUrl(localData);

        // Nếu ảnh trong bộ nhớ khác với ảnh đang hiển thị -> Cập nhật UI
        if (mounted && _currentAvatarUrl != latestAvatar) {
          setState(() {
            _currentAvatarUrl = latestAvatar; 
          });
        }
      }
    } catch (e) {
      debugPrint("Lỗi đồng bộ Avatar AppBar: $e");
    }
  }

  Future<void> _loadUnreadCount() async {
    final count = await NotificationHelper.getUnreadCount();
    if (mounted && count != _unreadCount) {
      setState(() {
        _unreadCount = count;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AppBar(
      backgroundColor: Colors.white,
      elevation: 0,
      iconTheme: const IconThemeData(color: Color(0xFF0D235E)),
      title: Row(
        children: [
          // Icon trang trí nhỏ gọn cạnh Tiêu đề
          Container(
            padding: const EdgeInsets.all(8), 
            decoration: BoxDecoration(color: Colors.grey.shade200, borderRadius: BorderRadius.circular(8)), 
            child: Icon(
              widget.title.contains('Điểm') ? Icons.account_balance_wallet : Icons.verified_user, 
              color: Colors.grey, 
              size: 20
            )
          ), 
          const SizedBox(width: 10), 
          Text(
            widget.title, 
            style: const TextStyle(color: Color(0xFF0D235E), fontWeight: FontWeight.bold, fontSize: 18)
          )
        ]
      ),
      actions: [
        // ==========================================
        // CÁI CHUÔNG THÔNG BÁO TỰ ĐỘNG ĐỒNG BỘ
        // ==========================================
        Stack(
          alignment: Alignment.center,
          children: [
            IconButton(
              icon: const Icon(Icons.notifications_none, color: Color(0xFF0D235E)), 
              onPressed: () async {
                await Navigator.push(
                  context, 
                  MaterialPageRoute(builder: (context) => const NotificationScreen())
                );
                _loadUnreadCount(); // Bấm xem xong quay lại tự reset số
              }
            ),
            if (_unreadCount > 0)
              Positioned(
                top: 10,
                right: 10,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: const BoxDecoration(
                    color: Colors.redAccent,
                    shape: BoxShape.circle,
                  ),
                  constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                  child: Text(
                    '$_unreadCount',
                    style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                    textAlign: TextAlign.center,
                  ),
                ),
              )
          ],
        ),

        // ==========================================
        // AVATAR THÔNG MINH - TỰ ĐỘNG CẬP NHẬT
        // ==========================================
        Padding(
          padding: const EdgeInsets.only(right: 16.0, left: 8.0),
          child: Center(
            child: ClipOval(
              child: Image.network(
                _currentAvatarUrl, // SỬ DỤNG BIẾN ĐỘNG NÀY THAY VÌ widget.avatarUrl
                width: 32,
                height: 32,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return Container(
                    width: 32,
                    height: 32,
                    color: Colors.blue.shade50,
                    child: Icon(Icons.person, color: Colors.blue.shade300, size: 20),
                  );
                },
              ),
            ),
          ),
        ),
      ],
    );
  }
}