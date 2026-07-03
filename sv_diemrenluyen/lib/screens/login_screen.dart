import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:google_sign_in_web/web_only.dart' as web;
import '../core/app_config.dart';
import 'dart:convert'; // Thêm dòng này để dùng jsonDecode

class LoginScreen extends StatefulWidget {
  final Function(Map<String, dynamic>) onLoginSuccess;
  const LoginScreen({Key? key, required this.onLoginSuccess}) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool _isConnecting = false;
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void initState() {
    super.initState();
    // Lắng nghe sự thay đổi trạng thái đăng nhập
    googleSignIn.onCurrentUserChanged
        .listen((GoogleSignInAccount? account) async {
      if (account != null && mounted) {
        setState(() => _isConnecting = true);

        try {
          // GỌI API NODE.JS XÁC THỰC GOOGLE
          final response = await Dio().post(
            '$backendBaseUrl/api/auth/google',
            data: {
              'email': account.email,                 // Dùng biến account lấy từ GoogleSignIn
              'name': account.displayName ?? '',
              'picture': account.photoUrl ?? '',      // API Node.js dùng 'picture' thay vì 'avatar'
            },
          );

          // 1. Kiểm tra Null ngay từ đầu
          if (response.data == null) {
            _showSnackBar('⚠️ Server không trả về dữ liệu (null)!');
            if (mounted) setState(() => _isConnecting = false);
            return;
          }

          // 2. Chuyển đổi dữ liệu an toàn sang Map<String, dynamic>
          Map<String, dynamic> parsedData;
          try {
            if (response.data is String) {
              // Nếu server trả về chuỗi JSON, ta decode nó
              parsedData = jsonDecode(response.data);
            } else {
              // Nếu Dio đã tự parse, ta ép kiểu an toàn
              parsedData = Map<String, dynamic>.from(response.data);
            }
          } catch (parseError) {
            print("🔥 LỖI ĐỊNH DẠNG DỮ LIỆU: $parseError");
            _showSnackBar(
                '⚠️ Dữ liệu server trả về không đúng định dạng JSON!');
            if (mounted) setState(() => _isConnecting = false);
            return;
          }

          // 3. Gọi callback với dữ liệu đã được parse chuẩn
          // API Node.js trả về cấu trúc bọc trong object "user"
          if (parsedData.containsKey('user')) {
             widget.onLoginSuccess(parsedData['user']);
          } else {
             widget.onLoginSuccess(parsedData);
          }
          
        } catch (error) {
          print("🔥 LỖI KẾT NỐI BACKEND: $error");
          _showSnackBar('Kết nối Server thất bại!');
        } finally {
          if (mounted) setState(() => _isConnecting = false);
        }
      }
    });
  }

  void _showSnackBar(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(message), backgroundColor: Colors.red));
    }
  }

  Future<void> _handleSignInMobile() async {
    setState(() => _isConnecting = true);
    try {
      await googleSignIn.signIn();
    } catch (error) {
      print("🔥 LỖI GOOGLE SIGN-IN MOBILE: $error");
      if (mounted) setState(() => _isConnecting = false);
    }
  }

  Future<void> _handleNormalLogin() async {
    final username = _usernameController.text.trim();
    final password = _passwordController.text;

    if (username.isEmpty || password.isEmpty) {
      _showSnackBar('Vui lòng nhập tài khoản và mật khẩu!');
      return;
    }

    setState(() => _isConnecting = true);
    try {
      final response = await Dio().post(
        '$backendBaseUrl/api/auth/login',
        data: {
          'username': username,
          'password': password,
        },
      );

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        if (data['user'] != null) {
          widget.onLoginSuccess(data['user']);
        } else {
          _showSnackBar('Không tìm thấy thông tin user trong phản hồi.');
        }
      }
    } on DioError catch (e) {
      String errorMessage = 'Đăng nhập thất bại!';
      if (e.response != null && e.response?.data != null) {
        errorMessage = e.response?.data['message'] ?? errorMessage;
      }
      _showSnackBar(errorMessage);
    } catch (e) {
      _showSnackBar('Lỗi kết nối máy chủ!');
    } finally {
      if (mounted) setState(() => _isConnecting = false);
    }
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF0F4C81), Color(0xFF1E3A8A), Color(0xFF3B82F6)],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                          color: Colors.black.withOpacity(0.12),
                          blurRadius: 24,
                          offset: const Offset(0, 12)),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          color: const Color(0xFFEEF4FF),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(20),
                          child: Image.asset(
                            'assets/img/ctut-placeholder.jpg',
                            fit: BoxFit.cover,
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Đăng nhập vào hệ thống',
                        style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0D235E)),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Theo dõi điểm rèn luyện, tham gia sự kiện và cập nhật hoạt động mới nhất ngay trên điện thoại.',
                        style: TextStyle(
                            fontSize: 13, color: Colors.grey, height: 1.4),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 20),
                      TextField(
                        controller: _usernameController,
                        decoration: InputDecoration(
                          hintText: 'MSSV hoặc Email',
                          prefixIcon: const Icon(Icons.person_outline, color: Color(0xFF1E3A8A)),
                          filled: true,
                          fillColor: const Color(0xFFF5F8FF),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: Color(0xFFDAE7FF)),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: Color(0xFFDAE7FF)),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _passwordController,
                        obscureText: _obscurePassword,
                        decoration: InputDecoration(
                          hintText: 'Mật khẩu',
                          prefixIcon: const Icon(Icons.lock_outline, color: Color(0xFF1E3A8A)),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscurePassword ? Icons.visibility_off : Icons.visibility,
                              color: const Color(0xFF1E3A8A),
                            ),
                            onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                          ),
                          filled: true,
                          fillColor: const Color(0xFFF5F8FF),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: Color(0xFFDAE7FF)),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: Color(0xFFDAE7FF)),
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton(
                          onPressed: _isConnecting ? null : _handleNormalLogin,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF1A3B8B),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: _isConnecting
                              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                              : const Text('Đăng nhập', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: const [
                          Expanded(child: Divider(color: Color(0xFFDAE7FF))),
                          Padding(
                            padding: EdgeInsets.symmetric(horizontal: 10),
                            child: Text('HOẶC', style: TextStyle(color: Colors.grey, fontSize: 12, fontWeight: FontWeight.bold)),
                          ),
                          Expanded(child: Divider(color: Color(0xFFDAE7FF))),
                        ],
                      ),
                      const SizedBox(height: 16),
                      kIsWeb
                          ? web.renderButton()
                          : SizedBox(
                              width: double.infinity,
                              height: 48,
                              child: ElevatedButton.icon(
                                onPressed:
                                    _isConnecting ? null : _handleSignInMobile,
                                icon: _isConnecting
                                    ? const SizedBox.shrink()
                                    : const Icon(Icons.g_mobiledata_rounded,
                                        size: 24),
                                label: _isConnecting
                                    ? const SizedBox(
                                        width: 18,
                                        height: 18,
                                        child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                            color: Colors.white),
                                      )
                                    : const Text('Đăng nhập bằng Google',
                                        style: TextStyle(
                                            fontSize: 15,
                                            fontWeight: FontWeight.w600)),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.white,
                                  foregroundColor: const Color(0xFF4B5A78),
                                  shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                      side: const BorderSide(color: Color(0xFFDAE7FF))),
                                  elevation: 0,
                                ),
                              ),
                            ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}