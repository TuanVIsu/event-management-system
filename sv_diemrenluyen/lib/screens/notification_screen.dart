import 'package:flutter/material.dart';
import 'notification_helper.dart';

class NotificationScreen extends StatefulWidget {
  const NotificationScreen({Key? key}) : super(key: key);

  @override
  State<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  List<Map<String, dynamic>> _notifications = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    final history = await NotificationHelper.getNotificationHistory();
    await NotificationHelper.markAllAsRead();
    setState(() {
      _notifications = history;
      _isLoading = false;
    });
  }

Future<void> _deleteNotification(int index) async {
    // 1. Lấy mã time của thông báo đang bị quẹt
    final timeStr = _notifications[index]['time']; 
    
    if (timeStr != null) {
      // 2. Truyền mã đó xuống helper để xóa dưới database/shared_preferences
      await NotificationHelper.deleteNotificationRecord(timeStr);
    }
    
    // 3. Xóa khỏi giao diện
    setState(() {
      _notifications.removeAt(index);
    });
  }
  Future<void> _clearAll() async {
    bool confirm = await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Xóa tất cả?'),
        content: const Text('Bạn có chắc chắn muốn xóa toàn bộ lịch sử thông báo không?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Hủy', style: TextStyle(color: Colors.grey))),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Xóa hết', style: TextStyle(color: Colors.red))),
        ],
      ),
    ) ?? false;

    if (confirm) {
      await NotificationHelper.clearAllNotifications();
      setState(() {
        _notifications.clear();
      });
    }
  }

  String _formatTime(String timeStr) {
    try {
      final dt = DateTime.parse(timeStr);
      return "${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')} - ${dt.day}/${dt.month}/${dt.year}";
    } catch (e) {
      return timeStr;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF0D235E)),
        title: const Text('Thông báo của tôi', style: TextStyle(color: Color(0xFF0D235E), fontWeight: FontWeight.bold)),
        actions: [
          if (_notifications.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.delete_sweep, color: Colors.redAccent),
              tooltip: 'Xóa tất cả',
              onPressed: _clearAll,
            )
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _notifications.isEmpty
              ? const Center(child: Text('Bạn chưa có thông báo nào.', style: TextStyle(color: Colors.grey)))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _notifications.length,
                  itemBuilder: (context, index) {
                    final noti = _notifications[index];
                    return Dismissible(
                      key: Key(noti['time'] ?? index.toString()),
                      direction: DismissDirection.endToStart,
                      background: Container(
                        alignment: Alignment.centerRight,
                        padding: const EdgeInsets.only(right: 20),
                        decoration: BoxDecoration(color: Colors.red.shade400, borderRadius: BorderRadius.circular(12)),
                        margin: const EdgeInsets.only(bottom: 12),
                        child: const Icon(Icons.delete_outline, color: Colors.white, size: 30),
                      ),
                      onDismissed: (direction) => _deleteNotification(index),
                      child: Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 1,
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: Colors.blue.shade50,
                            child: const Icon(Icons.notifications_active, color: Colors.blue),
                          ),
                          title: Text(noti['title'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const SizedBox(height: 4),
                              Text(noti['body'] ?? '', style: const TextStyle(fontSize: 13, color: Colors.black87)),
                              const SizedBox(height: 6),
                              Text(_formatTime(noti['time'] ?? ''), style: const TextStyle(fontSize: 11, color: Colors.grey)),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}