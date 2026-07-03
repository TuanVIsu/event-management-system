import 'package:flutter/material.dart'; // Bắt buộc phải có dòng này để dùng Icon

// --- 1. MODEL CHO TIÊU CHÍ (CRITERIA) ---
class CriteriaModel {
  final String title;
  final int currentPoints;
  final int maxPoints;
  final IconData icon;

  CriteriaModel({
    required this.title,
    required this.currentPoints,
    required this.maxPoints,
    required this.icon,
  });

  // Chuyển đổi JSON từ CSDL thành Object Dart
  factory CriteriaModel.fromJson(Map<String, dynamic> json) {
    return CriteriaModel(
      title: json['title'] ?? '',
      currentPoints: json['current_points'] != null ? int.parse(json['current_points'].toString()) : 0,
      maxPoints: json['max_points'] != null ? int.parse(json['max_points'].toString()) : 0,
      icon: _getIconFromString(json['icon_name'] ?? ''),
    );
  }

  // Hàm tiện ích chuyển String từ CSDL thành Icon Flutter
  static IconData _getIconFromString(String iconName) {
    switch (iconName) {
      case 'menu_book': return Icons.menu_book;
      case 'volunteer_activism': return Icons.volunteer_activism;
      case 'nature_people': return Icons.nature_people;
      case 'psychology_outlined': return Icons.psychology_outlined;
      default: return Icons.extension; // Icon mặc định
    }
  }
}

// --- 2. MODEL CHO SỰ KIỆN / HOẠT ĐỘNG (Bảng `events`) ---
class ActivityModel {
  final String id;
  final String name; 
  final String category; 
  final DateTime date; 
  final String status; 
  final bool isSpecial; 

  ActivityModel({
    required this.id,
    required this.name,
    required this.category,
    required this.date,
    required this.status,
    this.isSpecial = false,
  });

  // Hàm chuyển đổi JSON từ API (Backend trả về) sang Object Dart
  factory ActivityModel.fromJson(Map<String, dynamic> json) {
    return ActivityModel(
      id: json['id']?.toString() ?? '',
      name: json['name'] ?? 'Chưa có tên',
      category: json['category'] ?? 'Khác',
      date: json['date'] != null ? DateTime.tryParse(json['date']) ?? DateTime.now() : DateTime.now(),
      status: json['status'] ?? '',
    );
  }

  // Định dạng ngày tháng hiển thị trên UI
  String getFormattedDate() {
    List<String> months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    return '${date.day.toString().padLeft(2, '0')} Thg ${months[date.month - 1]},\n${date.year}';
  }
}