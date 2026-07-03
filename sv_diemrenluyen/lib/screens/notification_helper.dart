import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:timezone/data/latest.dart' as tz;

class NotificationHelper {
  static final FlutterLocalNotificationsPlugin _notificationsPlugin = FlutterLocalNotificationsPlugin();

  static Future<void> init() async {
    tz.initializeTimeZones();
    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher'); 
    
    const InitializationSettings initializationSettings = InitializationSettings(
      android: initializationSettingsAndroid,
    );
    await _notificationsPlugin.initialize(initializationSettings);
  }

  static Future<void> scheduleEventNotification({
    required int id,
    required String title,
    required String body,
    required DateTime scheduledTime,
  }) async {
    if (scheduledTime.isBefore(DateTime.now())) return;

    await _notificationsPlugin.zonedSchedule(
      id,
      title,
      body,
      tz.TZDateTime.from(scheduledTime, tz.local),
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'event_reminder_channel_id',
          'Nhắc nhở sự kiện',
          channelDescription: 'Kênh thông báo nhắc lịch khi sự kiện sắp diễn ra',
          importance: Importance.max,
          priority: Priority.high,
        ),
      ),
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      uiLocalNotificationDateInterpretation: UILocalNotificationDateInterpretation.absoluteTime,
    );
  }

  static Future<void> cancelNotification(int id) async {
    await _notificationsPlugin.cancel(id);
  }

  static Future<void> saveNotificationRecord(String title, String body, {String? eventId, DateTime? visibleAt}) async {
    final prefs = await SharedPreferences.getInstance();
    List<String> history = prefs.getStringList('notification_history') ?? [];
    
    final newNoti = jsonEncode({
      'title': title,
      'body': body,
      'time': DateTime.now().toString(),
      'isRead': false,
      'eventId': eventId,
      'visibleAt': (visibleAt ?? DateTime.now()).toString(), 
    });
    
    history.insert(0, newNoti); 
    await prefs.setStringList('notification_history', history);
  }

  static Future<List<Map<String, dynamic>>> getNotificationHistory() async {
    final prefs = await SharedPreferences.getInstance();
    List<String> history = prefs.getStringList('notification_history') ?? [];
    final now = DateTime.now();
    
    List<Map<String, dynamic>> visibleList = [];
    for (String item in history) {
      final map = jsonDecode(item) as Map<String, dynamic>;
      final visibleAtStr = map['visibleAt'];
      if (visibleAtStr != null) {
        final visibleAt = DateTime.parse(visibleAtStr);
        if (now.isAfter(visibleAt)) {
          visibleList.add(map);
        }
      } else {
        visibleList.add(map);
      }
    }
    return visibleList;
  }

  static Future<int> getUnreadCount() async {
    final prefs = await SharedPreferences.getInstance();
    List<String> history = prefs.getStringList('notification_history') ?? [];
    final now = DateTime.now();
    int count = 0;
    
    for (String item in history) {
      final Map<String, dynamic> noti = jsonDecode(item);
      final visibleAtStr = noti['visibleAt'];
      bool isVisible = true;
      if (visibleAtStr != null) {
        isVisible = now.isAfter(DateTime.parse(visibleAtStr));
      }
      
      if (isVisible && (noti['isRead'] == false || noti['isRead'] == null)) {
        count++;
      }
    }
    return count;
  }

  static Future<void> cancelFutureNotifications(String eventId) async {
    final prefs = await SharedPreferences.getInstance();
    List<String> history = prefs.getStringList('notification_history') ?? [];
    history.removeWhere((item) {
      final map = jsonDecode(item);
      return map['eventId'] == eventId;
    });
    await prefs.setStringList('notification_history', history);
  }

  // ĐÃ SỬA: Xóa bằng timeStr để không bị lỗi khi quẹt tay
  static Future<void> deleteNotificationRecord(String timeStr) async {
    final prefs = await SharedPreferences.getInstance();
    List<String> history = prefs.getStringList('notification_history') ?? [];
    
    history.removeWhere((item) {
      final map = jsonDecode(item);
      return map['time'] == timeStr;
    });
    
    await prefs.setStringList('notification_history', history);
  }

  static Future<void> clearAllNotifications() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('notification_history');
  }

  static Future<void> markAllAsRead() async {
    final prefs = await SharedPreferences.getInstance();
    List<String> history = prefs.getStringList('notification_history') ?? [];
    List<String> updatedHistory = [];
    final now = DateTime.now();

    for (String item in history) {
      final Map<String, dynamic> noti = jsonDecode(item);
      
      final visibleAtStr = noti['visibleAt'];
      bool isVisible = true;
      if (visibleAtStr != null) {
        isVisible = now.isAfter(DateTime.parse(visibleAtStr));
      }
      
      if (isVisible) {
        noti['isRead'] = true; 
      }
      updatedHistory.add(jsonEncode(noti));
    }

    await prefs.setStringList('notification_history', updatedHistory);
  }
} // Dấu ngoặc chốt sổ duy nhất cho toàn bộ class