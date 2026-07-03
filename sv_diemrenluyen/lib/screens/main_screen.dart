import 'package:flutter/material.dart';
import '../core/app_config.dart';
import 'dashboard_screen.dart';
import 'event_list_screen.dart';
import 'qr_scan_screen.dart';
import 'evidence_submit_screen.dart';
import 'profile_screen.dart';

class MainScreen extends StatefulWidget {
  final Map<String, dynamic> userData;
  final VoidCallback onLogout;
  const MainScreen({Key? key, required this.userData, required this.onLogout})
      : super(key: key);

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _currentIndex = 0;
  late List<Widget> _screens;

  @override
  void initState() {
    super.initState();
    _screens = [
      DashboardScreen(
        userData: widget.userData,
        onViewAllActivities: () => setState(() => _currentIndex = 1),
      ),
      EventListScreen(
          userData: widget
              .userData), // (Có thể bạn sẽ cần truyền userData vào đây sau này nếu muốn)

      // ĐÃ SỬA: Truyền userData vào QRScanScreen và EvidenceSubmitScreen
      QRScanScreen(userData: widget.userData),
      EvidenceSubmitScreen(userData: widget.userData),

      ProfileScreen(userData: widget.userData, onLogoutAction: _handleLogout),
    ];
  }

  Future<void> _handleLogout() async {
    await googleSignIn.signOut();
    widget.onLogout();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        type: BottomNavigationBarType.fixed,
        selectedItemColor: const Color(0xFF0D235E),
        unselectedItemColor: Colors.grey,
        selectedLabelStyle:
            const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
        unselectedLabelStyle: const TextStyle(fontSize: 11),
        items: const [
          BottomNavigationBarItem(
              icon: Icon(Icons.dashboard_outlined),
              activeIcon: Icon(Icons.dashboard),
              label: 'Tổng quan'),
          BottomNavigationBarItem(
              icon: Icon(Icons.calendar_month_outlined),
              activeIcon: Icon(Icons.calendar_month),
              label: 'Sự kiện'),
          BottomNavigationBarItem(
              icon: Icon(Icons.qr_code_scanner, size: 32),
              activeIcon: Icon(Icons.qr_code_scanner, size: 32),
              label: 'Quét mã'),
          BottomNavigationBarItem(
              icon: Icon(Icons.upload_file_outlined),
              activeIcon: Icon(Icons.upload_file),
              label: 'Minh chứng'),
          BottomNavigationBarItem(
              icon: Icon(Icons.person_outline),
              activeIcon: Icon(Icons.person),
              label: 'Cá nhân'),
        ],
      ),
    );
  }
}
