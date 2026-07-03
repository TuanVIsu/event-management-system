import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'screens/login_screen.dart';
import 'screens/main_screen.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  bool _isLoggedIn = false;
  Map<String, dynamic>? _currentUserData;
  bool _isCheckingMemory = true;

  @override
  void initState() {
    super.initState();
    _checkSavedLoginStatus();
  }

  Future<void> _checkSavedLoginStatus() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final String? savedUserData = prefs.getString('user_data');

      if (savedUserData != null) {
        // Parse JSON an toàn và ép kiểu tường minh
        final decodedData = jsonDecode(savedUserData);
        _currentUserData = Map<String, dynamic>.from(decodedData);
        _isLoggedIn = true;
      }
    } catch (e) {
      debugPrint("⚠️ Lỗi đọc bộ nhớ cục bộ: $e");
      // Nếu dữ liệu cũ bị hỏng, xóa nó đi để tránh lỗi vòng lặp
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('user_data');
    } finally {
      // Sử dụng mounted trước khi gọi setState trong hàm async
      if (mounted) {
        setState(() => _isCheckingMemory = false);
      }
    }
  }

  Future<void> _handleLoginSuccess(Map<String, dynamic> data) async {
    // Chặn ngay nếu dữ liệu truyền từ LoginScreen lên bị rỗng
    if (data.isEmpty) return;

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('user_data', jsonEncode(data));

      if (mounted) {
        setState(() {
          _isLoggedIn = true;
          _currentUserData = data;
        });
      }
    } catch (e) {
      debugPrint("⚠️ Lỗi lưu dữ liệu đăng nhập: $e");
    }
  }

  Future<void> _handleLogout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('user_data');

    if (mounted) {
      setState(() {
        _isLoggedIn = false;
        _currentUserData = null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isCheckingMemory) {
      return const MaterialApp(
        debugShowCheckedModeBanner: false,
        home: Scaffold(body: Center(child: CircularProgressIndicator())),
      );
    }

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Hệ thống Điểm Rèn Luyện',
      theme: ThemeData(
        primaryColor: const Color(0xFF0D235E),
        scaffoldBackgroundColor: const Color(0xFFF8F9FA),
        useMaterial3: true,
        fontFamily: 'Roboto',
      ),
      // Ràng buộc thêm điều kiện _currentUserData != null để đảm bảo an toàn tuyệt đối
      home: _isLoggedIn && _currentUserData != null
          ? MainScreen(userData: _currentUserData!, onLogout: _handleLogout)
          : LoginScreen(onLoginSuccess: _handleLoginSuccess),
    );
  }
}
