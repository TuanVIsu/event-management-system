import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:image_picker/image_picker.dart'; // Bổ sung thư viện chọn ảnh
import '../widgets/shared_app_bar.dart'; 
import '../core/app_config.dart';
import 'history_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
class ProfileScreen extends StatefulWidget {
  final Map<String, dynamic> userData; 
  final VoidCallback onLogoutAction;
  
  const ProfileScreen({Key? key, required this.userData, required this.onLogoutAction}) : super(key: key);

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  String _fullName = 'Đang tải...';
  String _mssv = 'Đang tải...';
  String _chiDoan = 'Đang tải...';
  String _faculty = 'Đang tải...';
  String _phone = 'Đang tải...';
  String _role = 'Đang tải...';
  String _avatarUrl = '';
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _initializeDataAndFetch();
  }

  void _initializeDataAndFetch() {
    String email = widget.userData['email'] ?? '';
    _fullName = widget.userData['name'] ?? widget.userData['full_name'] ?? 'Đang tải...';
    _avatarUrl = getUserAvatarUrl(widget.userData);

    if (email.isNotEmpty) {
      _fetchProfileFromDB(email);
    } else {
      setState(() {
        _mssv = 'Không tìm thấy Email';
        _chiDoan = _faculty = _phone = _role = 'Không có thông tin';
        _isLoading = false;
      });
    }
  }

  Future<void> _fetchProfileFromDB(String email) async {
    try {
      // Đã sửa localhost thành backendBaseUrl
      final response = await Dio().get('$backendBaseUrl/api/mobile/profile?email=$email');
      
      if (response.statusCode == 200 && response.data['status'] == 'success') {
        final data = response.data['data'];
        setState(() {
          _fullName = data['full_name'] ?? _fullName;
          _mssv = data['mssv'] ?? 'Chưa cập nhật';
          _chiDoan = data['chi_doan'] ?? 'Chưa cập nhật';
          _faculty = data['faculty'] ?? 'Chưa cập nhật';
          _phone = data['phone'] ?? 'Chưa cập nhật';
          _role = data['role'] == 'student' ? 'Sinh viên' : (data['role'] ?? 'Chưa cập nhật');
          
          if (data['avatar'] != null && data['avatar'].toString().isNotEmpty) {
            // Thêm tham số thời gian để tránh lỗi cache hình ảnh của Flutter
            String rawAvatar = data['avatar'];
            _avatarUrl = rawAvatar.startsWith('http') ? rawAvatar : '$backendBaseUrl/$rawAvatar?t=${DateTime.now().millisecondsSinceEpoch}';
          }
          _isLoading = false;
        });
      } else {
        setState(() {
          _mssv = _chiDoan = _faculty = _phone = _role = 'Chưa có trong CSDL';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _mssv = _chiDoan = _faculty = _phone = _role = 'Lỗi mạng';
        _isLoading = false;
      });
    }
  }

  // ==========================================
  // HÀM 1: CẬP NHẬT ẢNH ĐẠI DIỆN
  // ==========================================
  Future<void> _pickAndUploadAvatar() async {
    final ImagePicker picker = ImagePicker();
    final XFile? image = await picker.pickImage(source: ImageSource.gallery, imageQuality: 70);
    
    if (image != null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Đang tải ảnh lên...')));
      try {
        String email = widget.userData['email'] ?? '';
        FormData formData = FormData.fromMap({
          'email': email,
          'avatar_image': MultipartFile.fromBytes(await image.readAsBytes(), filename: image.name),
        });

        var response = await Dio().post('$backendBaseUrl/api/mobile/update_avatar', data: formData);
        
        if (response.data['status'] == 'success') {
          // Lấy đường dẫn ảnh mới từ API trả về
          String newAvatarPath = response.data['new_avatar_path'];

          setState(() {
            // Cập nhật lại ảnh ngay lập tức trên UI Profile (Thêm timestamp để chống cache)
            _avatarUrl = '$backendBaseUrl/$newAvatarPath?t=${DateTime.now().millisecondsSinceEpoch}';
          });

          // 1. CẬP NHẬT TRỰC TIẾP VÀO BIẾN DÙNG CHUNG (Pass by reference)
          // Nhờ vậy các màn hình khác dùng chung widget.userData sẽ nhận được link mới
          widget.userData['avatar'] = newAvatarPath;

          // 2. LƯU XUỐNG BỘ NHỚ SHAREDPREFERENCES
          // Để lần sau mở App lên, mọi trang đều đọc được avatar mới ngay từ đầu
          final prefs = await SharedPreferences.getInstance();
          final String? savedUserData = prefs.getString('user_data');
          if (savedUserData != null) {
            Map<String, dynamic> localData = jsonDecode(savedUserData);
            localData['avatar'] = newAvatarPath;
            await prefs.setString('user_data', jsonEncode(localData));
          }

          if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Cập nhật ảnh thành công!'), backgroundColor: Colors.green));
        } else {
          if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Lỗi tải ảnh lên!'), backgroundColor: Colors.red));
        }
      } catch (e) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Lỗi kết nối máy chủ!'), backgroundColor: Colors.red));
      }
    }
  }

  // ==========================================
  // HÀM 2: CẬP NHẬT MẬT KHẨU
  // ==========================================
  void _showChangePasswordDialog() {
    TextEditingController passwordController = TextEditingController();
    TextEditingController confirmController = TextEditingController();
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Thiết lập mật khẩu mới', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Thiết lập mật khẩu để có thể đăng nhập bằng Email ở những lần sau.', style: TextStyle(fontSize: 13, color: Colors.grey)),
            const SizedBox(height: 16),
            TextField(
              controller: passwordController,
              obscureText: true,
              decoration: InputDecoration(
                hintText: 'Nhập mật khẩu mới',
                filled: true, fillColor: Colors.grey.shade100,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: confirmController,
              obscureText: true,
              decoration: InputDecoration(
                hintText: 'Xác nhận lại mật khẩu',
                filled: true, fillColor: Colors.grey.shade100,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context), 
            child: const Text('Hủy', style: TextStyle(color: Colors.grey))
          ),
          ElevatedButton(
            onPressed: () {
              if (passwordController.text.length < 6) {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Mật khẩu phải từ 6 ký tự trở lên!'), backgroundColor: Colors.orange));
                return;
              }
              if (passwordController.text != confirmController.text) {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Mật khẩu xác nhận không khớp!'), backgroundColor: Colors.red));
                return;
              }
              Navigator.pop(context);
              _updatePasswordInDB(passwordController.text);
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0D235E), foregroundColor: Colors.white),
            child: const Text('Lưu mật khẩu'),
          )
        ],
      ),
    );
  }

  Future<void> _updatePasswordInDB(String newPassword) async {
    try {
      String email = widget.userData['email'] ?? '';
      var response = await Dio().post(
        '$backendBaseUrl/api/mobile/update_password',
        data: {'email': email, 'new_password': newPassword},
      );
      
      if (response.data['status'] == 'success') {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Đã cập nhật mật khẩu thành công!'), backgroundColor: Colors.green));
      } else {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(response.data['message']), backgroundColor: Colors.red));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Lỗi kết nối mạng!'), backgroundColor: Colors.red));
    }
  }

  // ==========================================
  // HÀM 3: CẬP NHẬT SDT (Giữ nguyên của bạn)
  // ==========================================
  void _showEditPhoneDialog() {
    TextEditingController phoneController = TextEditingController(text: _phone == 'Chưa cập nhật' || _phone == 'Chưa có trong CSDL' ? '' : _phone);
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cập nhật số điện thoại', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        content: TextField(
          controller: phoneController,
          keyboardType: TextInputType.phone,
          decoration: InputDecoration(
            hintText: 'Nhập số điện thoại mới',
            filled: true, fillColor: Colors.grey.shade100,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Hủy', style: TextStyle(color: Colors.grey))),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _updatePhoneInDB(phoneController.text.trim());
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0D235E), foregroundColor: Colors.white),
            child: const Text('Lưu lại'),
          )
        ],
      ),
    );
  }

  Future<void> _updatePhoneInDB(String newPhone) async {
    if (newPhone.isEmpty) return;
    try {
      String email = widget.userData['email'] ?? '';
      var response = await Dio().post(
        '$backendBaseUrl/api/mobile/update_phone',
        data: FormData.fromMap({'email': email, 'phone': newPhone}),
      );
      if (response.data['status'] == 'success') {
        setState(() { _phone = newPhone; });
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Cập nhật SĐT thành công!'), backgroundColor: Colors.green));
      }
    } catch (e) {}
  }
  // ==========================================
  // HÀM 4: CẬP NHẬT HỌ TÊN
  // ==========================================
  void _showEditNameDialog() {
    TextEditingController nameController = TextEditingController(
        text: _fullName == 'Đang tải...' ? '' : _fullName);
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cập nhật họ tên', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        content: TextField(
          controller: nameController,
          decoration: InputDecoration(
            hintText: 'Nhập họ tên mới',
            filled: true, fillColor: Colors.grey.shade100,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Hủy', style: TextStyle(color: Colors.grey))),
          ElevatedButton(
            onPressed: () {
              if (nameController.text.trim().isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Vui lòng nhập tên!'), backgroundColor: Colors.orange));
                return;
              }
              Navigator.pop(context);
              _updateNameInDB(nameController.text.trim());
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0D235E), foregroundColor: Colors.white),
            child: const Text('Lưu lại'),
          )
        ],
      ),
    );
  }

  Future<void> _updateNameInDB(String newName) async {
    try {
      String email = widget.userData['email'] ?? '';
      var response = await Dio().post(
        '$backendBaseUrl/api/mobile/update_name',
        data: FormData.fromMap({'email': email, 'full_name': newName}),
      );
      
      if (response.data['status'] == 'success') {
        setState(() { _fullName = newName; });
        
        // Cập nhật vào SharedPreferences để khi mở lại app vẫn giữ tên mới
        final prefs = await SharedPreferences.getInstance();
        final String? savedUserData = prefs.getString('user_data');
        if (savedUserData != null) {
          Map<String, dynamic> localData = jsonDecode(savedUserData);
          localData['full_name'] = newName;
          localData['name'] = newName; // Cập nhật cả key name phòng hờ
          await prefs.setString('user_data', jsonEncode(localData));
        }

        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Cập nhật tên thành công!'), backgroundColor: Colors.green));
      } else {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Lỗi cập nhật tên!'), backgroundColor: Colors.red));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Lỗi kết nối mạng!'), backgroundColor: Colors.red));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: buildSharedAppBar('Tài khoản của tôi', _avatarUrl),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator()) 
        : SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Container(
                  width: double.infinity, padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.grey.shade200)),
                  child: Column(
                    children: [
                      // Kích hoạt nút bấm thay đổi Avatar
                      GestureDetector(
                        onTap: _pickAndUploadAvatar,
                        child: Stack(
                          alignment: Alignment.bottomRight,
                          children: [
                            CircleAvatar(radius: 50, backgroundImage: NetworkImage(_avatarUrl)),
                            Container(padding: const EdgeInsets.all(6), decoration: const BoxDecoration(color: Color(0xFF2ECA7F), shape: BoxShape.circle), child: const Icon(Icons.camera_alt, color: Colors.white, size: 16))
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
  mainAxisAlignment: MainAxisAlignment.center,
  children: [
    Text(_fullName, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF0D235E))),
    const SizedBox(width: 8),
    GestureDetector(
      onTap: _showEditNameDialog,
      child: const Icon(Icons.edit_square, color: Color(0xFF2ECA7F), size: 20),
    ),
  ],
),
                      const SizedBox(height: 4),
                      const Text('Sinh viên ĐH Kỹ thuật - Công nghệ Cần Thơ', style: TextStyle(color: Colors.grey, fontSize: 13)),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.grey.shade200)),
                  child: Column(
                    children: [
                      _buildProfileTile(Icons.badge_outlined, 'Mã số sinh viên', _mssv),
                      _buildProfileTile(Icons.class_outlined, 'Lớp sinh hoạt', _chiDoan),
                      _buildProfileTile(Icons.school_outlined, 'Ngành học', _faculty),
                      _buildProfileTile(Icons.apartment_outlined, 'Chi đoàn khoa', 'Công nghệ thông tin'),
                      _buildProfileTile(Icons.person, 'Vai trò', _role),
                      _buildProfileTile(
                        Icons.phone, 'Số điện thoại', _phone, 
                        isLast: true,
                        trailingAction: GestureDetector(
                          onTap: _showEditPhoneDialog,
                          child: const Icon(Icons.edit_square, color: Color(0xFF2ECA7F), size: 20),
                        )
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.grey.shade200)),
                  child: Column(
                    children: [
                      _buildActionTile(Icons.history, 'Lịch sử tham gia hoạt động', () {
                        Navigator.push(context, MaterialPageRoute(builder: (context) => HistoryScreen(userData: widget.userData)));
                      }),
                      // Kích hoạt chức năng đổi mật khẩu
                      _buildActionTile(Icons.lock_reset_outlined, 'Thiết lập / Đổi mật khẩu', _showChangePasswordDialog),
                      _buildActionTile(Icons.info_outline_rounded, 'Thông tin phiên bản v1.0.2', () {}, showChevron: false, isLast: true),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity, height: 50,
                  child: OutlinedButton.icon(
                    onPressed: widget.onLogoutAction,
                    icon: const Icon(Icons.logout, color: Colors.red),
                    label: const Text('Đăng xuất tài khoản', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 15)),
                    style: OutlinedButton.styleFrom(side: const BorderSide(color: Colors.red, width: 1.2), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), backgroundColor: Colors.red.withOpacity(0.05)),
                  ),
                ),
                const SizedBox(height: 40),
              ],
            ),
          ),
    );
  }

  Widget _buildProfileTile(IconData icon, String label, String value, {bool isLast = false, Widget? trailingAction}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(border: isLast ? null : Border(bottom: BorderSide(color: Colors.grey.shade100))),
      child: Row(
        children: [
          Icon(icon, color: const Color(0xFF0D235E), size: 20), 
          const SizedBox(width: 16), 
          Text(label, style: const TextStyle(color: Colors.grey, fontSize: 13)), 
          const Spacer(), 
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.black87, fontSize: 14)),
          if (trailingAction != null) ...[
            const SizedBox(width: 10),
            trailingAction,
          ]
        ]
      ),
    );
  }

  Widget _buildActionTile(IconData icon, String title, VoidCallback onTap, {bool showChevron = true, bool isLast = false}) {
    return ListTile(
      onTap: onTap, 
      dense: true, 
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2), 
      shape: isLast ? null : Border(bottom: BorderSide(color: Colors.grey.shade100)), 
      leading: Icon(icon, color: const Color(0xFF0D235E), size: 20), 
      title: Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: Colors.black87)), 
      trailing: showChevron ? const Icon(Icons.chevron_right, size: 18, color: Colors.grey) : null
    );
  }
}