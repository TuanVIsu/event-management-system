import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../core/app_config.dart';
import 'notification_screen.dart';
import 'notification_helper.dart';
import 'dart:async'; 
import 'event_detail_screen.dart';
import 'qr_scan_screen.dart';

// =========================================================
// MÀN HÌNH DANH SÁCH SỰ KIỆN - CHUẨN UX/UI ĐẦY ĐỦ CHỈ TIÊU TEXT
// =========================================================
class EventListScreen extends StatefulWidget {
  final Map<String, dynamic> userData;
  const EventListScreen({Key? key, required this.userData}) : super(key: key);
  @override
  State<EventListScreen> createState() => _EventListScreenState();
}

class _EventListScreenState extends State<EventListScreen> with SingleTickerProviderStateMixin {
  final Dio _dio = Dio();
  
  List<dynamic> _availableEvents = []; 
  List<dynamic> _registeredEvents = []; 
  
  bool _isLoading = true;
  late TabController _tabController;
  int _unreadCount = 0;
  String _searchQuery = '';
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    NotificationHelper.init();
    _fetchEventsFromBackend();
    _loadUnreadCount();

    _timer = Timer.periodic(const Duration(seconds: 10), (timer) {
      if (mounted) {
        _loadUnreadCount(); 
        setState(() {});    
      }
    });
  }

  @override
  void dispose() { 
    _timer?.cancel(); 
    _tabController.dispose(); 
    super.dispose(); 
  }

  Future<void> _loadUnreadCount() async {
    final count = await NotificationHelper.getUnreadCount();
    if (mounted) {
      setState(() {
        _unreadCount = count;
      });
    }
  }

  Future<String?> _getRealMSSV() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final String? savedUserData = prefs.getString('user_data');
      if (savedUserData != null) {
        final Map<String, dynamic> userData = jsonDecode(savedUserData);
        return userData['mssv']?.toString();
      }
    } catch (e) {
      debugPrint("Lỗi đọc MSSV từ user_data: $e");
    }
    return null;
  }
  
  Future<void> _fetchEventsFromBackend() async {
    try {
      final mssv = await _getRealMSSV(); 
      final url = mssv != null 
          ? '$backendBaseUrl/api/mobile/events?mssv=$mssv' 
          : '$backendBaseUrl/api/mobile/events'; 

      final response = await _dio.get(url); 
      
      if (response.statusCode == 200 && response.data['status'] == 'success') { 
        final List<dynamic> eventData = response.data['events'] ?? []; 
        final DateTime now = DateTime.now(); 

        if (mounted) {
          setState(() {
            bool isEventEnded(dynamic e) {
              if (e['status'] == 'Đã kết thúc') return true; 
              if (e['date'] != null) {
                try {
                  DateTime startTime = DateTime.parse(e['date']); 
                  DateTime endTime = e['end_date'] != null 
                      ? DateTime.parse(e['end_date']) 
                      : startTime.add(const Duration(hours: 4)); 
                  return now.isAfter(endTime); 
                } catch (_) {}
              }
              return false;
            }

_availableEvents = eventData.where((e) {
  if (e == null) return false; 
  if (isEventEnded(e)) return false; 
  
  bool isCheckedIn = e['is_checked_in'] == 1 || e['is_checked_in'] == '1' || e['is_checked_in'] == true; 
  int isReg = e['is_registered'] != null ? int.tryParse(e['is_registered'].toString()) ?? 0 : 0; 
  bool isMultiple = e['score_type'] == 'multiple'; 

  // Nếu là sự kiện tính theo Lượt (multiple), luôn hiển thị lại để đăng ký lượt mới nếu cần
  if (isMultiple) {
    return isReg == 0;
  }

  if (isCheckedIn) return false; 
  return isReg == 0; 
}).toList();

_registeredEvents = eventData.where((e) {
  if (e == null) return false; 
  if (isEventEnded(e)) return false; 
  
  bool isCheckedIn = e['is_checked_in'] == 1 || e['is_checked_in'] == '1' || e['is_checked_in'] == true; 
  int isReg = e['is_registered'] != null ? int.tryParse(e['is_registered'].toString()) ?? 0 : 0; 
  bool isMultiple = e['score_type'] == 'multiple';

  // Nếu tính theo Lượt, chỉ cần đã bấm nút Đăng ký là cho nằm bên tab "Đã đăng ký" để chờ quét mã QR tiếp
  if (isMultiple) {
    return isReg == 1;
  }

  if (isCheckedIn) return false; 
  return isReg == 1; 
}).toList();

            _availableEvents.sort((a, b) {
              bool isAOngoing = a['status'] == 'Đang diễn ra'; 
              bool isBOngoing = b['status'] == 'Đang diễn ra'; 

              int maxA = int.tryParse(a['max_participants']?.toString() ?? '0') ?? 0; 
              int curA = int.tryParse(a['current_participants']?.toString() ?? '0') ?? 0; 
              bool isFullA = maxA > 0 && curA >= maxA; 

              int maxB = int.tryParse(b['max_participants']?.toString() ?? '0') ?? 0; 
              int curB = int.tryParse(b['current_participants']?.toString() ?? '0') ?? 0; 
              bool isFullB = maxB > 0 && curB >= maxB; 

              bool isClosedA = (isAOngoing) || isFullA; 
              bool isClosedB = (isBOngoing) || isFullB;

              if (!isClosedA && isClosedB) return -1;
              if (isClosedA && !isClosedB) return 1;

              final dateA = DateTime.tryParse(a['date']?.toString() ?? '') ?? DateTime.now(); 
              final dateB = DateTime.tryParse(b['date']?.toString() ?? '') ?? DateTime.now(); 
              return dateA.compareTo(dateB); 
            });

            _isLoading = false; 
          });
        }
      } else {
        if (mounted) setState(() => _isLoading = false); 
      }
    } catch (e) { 
      if (mounted) setState(() => _isLoading = false); 
    }
  }

  Future<void> _registerForEvent(String eventId) async {
    final mssv = await _getRealMSSV();
    if (!mounted) return;

    if (mssv == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('⚠️ Không tìm thấy thông tin đăng nhập!'), backgroundColor: Colors.red));
      return;
    }

    showDialog(context: context, barrierDismissible: false, builder: (context) => const Center(child: CircularProgressIndicator()));

    try {
      final response = await _dio.post('$backendBaseUrl/api/mobile/register_event', data: {'event_id': eventId, 'mssv': mssv});
      
      if (!mounted) return;
      Navigator.pop(context);

      if (response.data['status'] == 'success') {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('🎉 ${response.data['message']}'), backgroundColor: Colors.green));
        
        setState(() {
          final index = _availableEvents.indexWhere((e) => e['id'].toString() == eventId);
          if (index != -1) {
            final targetEvent = _availableEvents[index];
            targetEvent['is_registered'] = 1; 
            if (!_registeredEvents.any((e) => e['id'].toString() == eventId)) {
                _registeredEvents.add(targetEvent);
            }

            NotificationHelper.saveNotificationRecord(
              '🎉 Đăng ký thành công', 
              'Bạn vừa đăng ký tham gia sự kiện: ${targetEvent['name']}',
              eventId: eventId,
            );

            if (targetEvent['date'] != null) {
              try {
                DateTime startTime = DateTime.parse(targetEvent['date']);
                int baseId = int.tryParse(eventId) ?? 0;
                
                DateTime morningReminder = DateTime(startTime.year, startTime.month, startTime.day, 6, 0);
                if (morningReminder.isAfter(DateTime.now()) && morningReminder.isBefore(startTime)) {
                  NotificationHelper.scheduleEventNotification(
                    id: baseId * 10 + 1, 
                    title: '📅 Hôm nay có sự kiện!',
                    body: 'Sự kiện "${targetEvent['name']}" sẽ diễn ra vào hôm nay lúc ${startTime.hour.toString().padLeft(2, '0')}:${startTime.minute.toString().padLeft(2, '0')}. Bạn nhớ lịch nhé!',
                    scheduledTime: morningReminder,
                  );

                  NotificationHelper.saveNotificationRecord(
                    '📅 Hôm nay có sự kiện',
                    'Sự kiện "${targetEvent['name']}" sẽ diễn ra hôm nay lúc ${startTime.hour.toString().padLeft(2, '0')}:${startTime.minute.toString().padLeft(2, '0')}.',
                    eventId: eventId,
                    visibleAt: morningReminder,
                  );
                }

                DateTime reminder2Hours = startTime.subtract(const Duration(hours: 2));
                if (reminder2Hours.isAfter(DateTime.now())) {
                  NotificationHelper.scheduleEventNotification(
                    id: baseId * 10 + 2, 
                    title: '⏰ Chuẩn bị đi thôi!',
                    body: 'Chỉ còn 2 tiếng nữa là bắt đầu sự kiện "${targetEvent['name']}". Chuẩn bị xe cộ và đồ đạc dần thôi nào!',
                    scheduledTime: reminder2Hours,
                  );

                  NotificationHelper.saveNotificationRecord(
                    '⏰ Sự kiện sắp bắt đầu',
                    'Chỉ còn 2 tiếng nữa là bắt đầu sự kiện "${targetEvent['name']}". Hãy chuẩn bị tham gia nhé!',
                    eventId: eventId,
                    visibleAt: reminder2Hours,
                  );
                }

                NotificationHelper.saveNotificationRecord(
                  '🔥 Sự kiện đã bắt đầu',
                  'Sự kiện "${targetEvent['name']}" đã chính thức bắt đầu lúc ${startTime.hour.toString().padLeft(2, '0')}:${startTime.minute.toString().padLeft(2, '0')}. Hãy vào tiến hành điểm danh!',
                  eventId: eventId,
                  visibleAt: startTime,
                );

              } catch (e) {
                debugPrint("Không thể cài thông báo lịch: $e");
              }
            }
          }
        });

        _loadUnreadCount(); 
        _tabController.animateTo(1);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('⚠️ ${response.data['message']}'), backgroundColor: Colors.orange));
      }
    } catch (e) {
      if (!mounted) return;
      Navigator.pop(context); 
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('❌ Lỗi mạng: $e'), backgroundColor: Colors.red));
    }
  }

  Future<void> _checkInForEvent(String eventId) async {
    final mssv = await _getRealMSSV();
    if (!mounted) return;

    if (mssv == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('⚠️ Lỗi: Không tìm thấy thông tin đăng nhập!'), backgroundColor: Colors.red));
      return;
    }

    showDialog(context: context, barrierDismissible: false, builder: (context) => const Center(child: CircularProgressIndicator()));

    try {
      final response = await _dio.post('$backendBaseUrl/api/mobile/checkin_event', data: {'event_id': eventId, 'mssv': mssv});
      
      if (!mounted) return;
      Navigator.pop(context);

      if (response.data['status'] == 'success') {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('✅ ${response.data['message']}'), backgroundColor: Colors.green));
        await NotificationHelper.saveNotificationRecord(
          '✅ Điểm danh thành công', 
          'Bạn đã điểm danh thành công sự kiện! Điểm rèn luyện sẽ được hệ thống cập nhật sau.'
        );
        _loadUnreadCount();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('⚠️ ${response.data['message']}'), backgroundColor: Colors.orange));
      }
    } catch (e) {
      if (!mounted) return;
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('❌ Lỗi mạng: $e'), backgroundColor: Colors.red));
    }
  }

  Future<void> _cancelRegistration(String eventId) async {
    bool confirm = await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Xác nhận hủy'),
        content: const Text('Bạn có chắc chắn muốn hủy đăng ký tham gia sự kiện này không?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Không', style: TextStyle(color: Colors.grey))),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Hủy đăng ký', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold))),
        ],
      ),
    ) ?? false;

    if (!confirm) return;

    final mssv = await _getRealMSSV();
    if (!mounted) return;

    if (mssv == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('⚠️ Không tìm thấy thông tin đăng nhập!'), backgroundColor: Colors.red));
      return;
    }

    showDialog(context: context, barrierDismissible: false, builder: (context) => const Center(child: CircularProgressIndicator()));

    try {
      final response = await _dio.post('$backendBaseUrl/api/mobile/cancel_registration', data: {'event_id': eventId, 'mssv': mssv});
      
      if (!mounted) return;
      Navigator.pop(context); 

      if (response.data['status'] == 'success') {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('✅ ${response.data['message']}'), backgroundColor: Colors.green));
        await NotificationHelper.saveNotificationRecord('❌ Đã hủy đăng ký', 'Bạn đã hủy đăng ký sự kiện thành công.');
        
        int baseId = int.tryParse(eventId) ?? 0;
        NotificationHelper.cancelNotification(baseId * 10 + 1); 
        NotificationHelper.cancelNotification(baseId * 10 + 2); 
        await NotificationHelper.cancelFutureNotifications(eventId);

        _fetchEventsFromBackend();
        _loadUnreadCount();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('⚠️ ${response.data['message']}'), backgroundColor: Colors.orange));
        await NotificationHelper.saveNotificationRecord(
          '⚠️ Hủy đăng ký thất bại', 
          'Không thể hủy đăng ký: ${response.data['message']}'
        );
        _loadUnreadCount();
      }
    } catch (e) {
      if (!mounted) return;
      Navigator.pop(context); 
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('❌ Lỗi kết nối mạng: $e'), backgroundColor: Colors.red));
      await NotificationHelper.saveNotificationRecord('❌ Lỗi kết nối', 'Hủy đăng ký thất bại do sự cố mạng đường truyền.');
      _loadUnreadCount();
    }
  }

  @override
  Widget build(BuildContext context) {
    final filteredAvailableEvents = _availableEvents.where((e) {
      final String name = (e['name'] ?? '').toString().toLowerCase();
      final String category = (e['category'] ?? '').toString().toLowerCase();
      final String query = _searchQuery.toLowerCase();
      return name.contains(query) || category.contains(query); 
    }).toList();

    final filteredRegisteredEvents = _registeredEvents.where((e) {
      final String name = (e['name'] ?? '').toString().toLowerCase();
      final String category = (e['category'] ?? '').toString().toLowerCase();
      final String query = _searchQuery.toLowerCase();
      return name.contains(query) || category.contains(query);
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      body: Column(
        children: [
          Container(
            color: Colors.white, 
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10), 
            child: TextField(
              onChanged: (value) {
                setState(() {
                  _searchQuery = value;
                });
              },
              decoration: InputDecoration(
                hintText: 'Tìm kiếm hội thảo, hoạt động...', 
                hintStyle: const TextStyle(fontSize: 14, color: Colors.grey), 
                prefixIcon: const Icon(Icons.search, color: Colors.grey), 
                suffixIcon: _searchQuery.isNotEmpty 
                    ? IconButton(
                        icon: const Icon(Icons.clear, color: Colors.grey, size: 20),
                        onPressed: () {
                          setState(() {
                            _searchQuery = '';
                          });
                          FocusScope.of(context).unfocus(); 
                        },
                      )
                    : null,
                filled: true, fillColor: Colors.grey.shade100, 
                contentPadding: const EdgeInsets.symmetric(vertical: 0), 
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(30), borderSide: BorderSide.none)
              )
            )
          ),
          Container(
            color: Colors.white, 
            child: TabBar(
              controller: _tabController, 
              labelColor: const Color(0xFF0D235E), 
              unselectedLabelColor: Colors.grey, 
              indicatorColor: const Color(0xFF0D235E), 
              indicatorWeight: 3, 
              labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14), 
              tabs: const [Tab(text: 'Sắp diễn ra'), Tab(text: 'Đã đăng ký')]
            )
          ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _isLoading 
                  ? const Center(child: CircularProgressIndicator()) 
                  : filteredAvailableEvents.isEmpty 
                    ? Center(child: Text(_searchQuery.isEmpty ? 'Không có sự kiện nào sắp diễn ra.' : 'Không tìm thấy kết quả phù hợp.', style: const TextStyle(color: Colors.grey))) 
                    : ListView.builder(
                        padding: const EdgeInsets.all(16), 
                        itemCount: filteredAvailableEvents.length, 
                        itemBuilder: (context, index) {
                          final item = filteredAvailableEvents[index];
                          if (item == null || item is! Map) return const SizedBox.shrink();
                          return _buildEventCard(Map<String, dynamic>.from(item), isRegistered: false);
                        }
                      ),
                _isLoading 
                  ? const Center(child: CircularProgressIndicator()) 
                  : filteredRegisteredEvents.isEmpty 
                    ? Center(child: Text(_searchQuery.isEmpty ? 'Bạn chưa đăng ký sự kiện nào.' : 'Không tìm thấy kết quả phù hợp.', style: const TextStyle(color: Colors.grey))) 
                    : ListView.builder(
                        padding: const EdgeInsets.all(16), 
                        itemCount: filteredRegisteredEvents.length, 
                        itemBuilder: (context, index) {
                          final item = filteredRegisteredEvents[index];
                          if (item == null || item is! Map) return const SizedBox.shrink();
                          return _buildEventCard(Map<String, dynamic>.from(item), isRegistered: true);
                        }
                      ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEventCard(Map<String, dynamic> event, {required bool isRegistered}) {
    bool isOngoing = event['status'] == 'Đang diễn ra';

    if (!isOngoing && event['date'] != null) {
      try {
        DateTime startTime = DateTime.parse(event['date']);
        DateTime now = DateTime.now();
        DateTime endTime = event['end_date'] != null 
            ? DateTime.parse(event['end_date']) 
            : startTime.add(const Duration(hours: 4));

        if (now.isAfter(startTime) && now.isBefore(endTime)) {
          isOngoing = true;
        }
      } catch (e) {
        debugPrint("Lỗi parse ngày: $e");
      }
    }
    
    final String points = event['points']?.toString() ?? '0';
    final String category = event['category'] ?? 'Sự kiện';
    final String name = event['name'] ?? 'Chưa có tên';
    final String dateStr = event['date'] ?? 'Đang cập nhật';

    Widget buildPosterImage() {
      const String defaultAssetPath = 'assets/img/ctut-placeholder.jpg';
      final String? posterPath = event['poster_url']?.toString();

      if (posterPath == null || posterPath.isEmpty) {
        return SizedBox(
          height: 160,
          width: double.infinity,
          child: Image.asset(defaultAssetPath, fit: BoxFit.cover),
        );
      } else {
        final cleanPath = posterPath.startsWith("/") ? posterPath.substring(1) : posterPath;
        final fullUrl = '$backendBaseUrl/$cleanPath';
        
        return SizedBox(
          height: 160,
          width: double.infinity,
          child: Image.network(
            Uri.encodeFull(fullUrl), 
            fit: BoxFit.cover,       
            errorBuilder: (context, error, stackTrace) {
              return Image.asset(defaultAssetPath, fit: BoxFit.cover);
            }
          ),
        );
      }
    }

Widget buildActionButton() {
  int maxParticipants = int.tryParse(event['max_participants']?.toString() ?? '0') ?? 0;
  int currentParticipants = int.tryParse(event['current_participants']?.toString() ?? '0') ?? 0;
  bool isFull = maxParticipants > 0 && currentParticipants >= maxParticipants;

  // 1. Thêm bộ tính toán động hạn chót 30 phút
  bool canStillRegister = true;
  if (event['date'] != null) {
    try {
      DateTime startTime = DateTime.parse(event['date']);
      DateTime deadLineRegister = startTime.add(const Duration(minutes: 30));
      if (DateTime.now().isAfter(deadLineRegister)) {
        canStillRegister = false; 
      }
    } catch (_) {}
  }

  // 2. Cập nhật nút bấm tương tác thời gian thực
  if (isOngoing) {
    if (isRegistered) {
      return ElevatedButton(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => QRScanScreen(
                userData: widget.userData,
                expectedEventId: event['id'].toString(), 
                expectedEventName: event['name'] ?? 'Chưa có tên', 
                expectedCategory: event['category'],
              ),
            ),
          ).then((_) { _fetchEventsFromBackend(); });
        }, 
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.redAccent, 
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)), 
        ), 
        child: const Text('Điểm danh ngay', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
      );
    } else if (canStillRegister && !isFull) {
      // ✅ Nút đăng ký muộn nằm trong khung 30 phút
      return ElevatedButton(
        onPressed: () => _registerForEvent(event['id'].toString()), 
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF0D235E), 
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)), 
        ), 
        child: const Text('Đăng ký muộn', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
      );
    } else {
      // ❌ Khóa nút nếu sự kiện chạy quá 30 phút hoặc đã hết chỗ
      return ElevatedButton(
        onPressed: null, 
        style: ElevatedButton.styleFrom(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)), 
        ), 
        child: const Text('Đã đóng đăng ký', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
      );
    }
  } else if (isRegistered) {
    
  

        return ElevatedButton(
          onPressed: () => _cancelRegistration(event['id'].toString()), 
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.orange.shade800, 
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)), 
            elevation: 0
          ), 
          child: const Text('Hủy đăng ký', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
        );
      } else {
        if (isFull) {
          return ElevatedButton(
            onPressed: null, 
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.grey.shade400, 
              disabledBackgroundColor: Colors.grey.shade300,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)), 
              elevation: 0
            ), 
            child: const Text('Đã đủ số lượng', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
          );
        }

        return ElevatedButton(
          onPressed: () => _registerForEvent(event['id'].toString()), 
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF0D235E), 
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)), 
            elevation: 0
          ), 
          child: const Text('Đăng ký tham gia', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
        );
      }
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 20), 
      elevation: isOngoing ? 6 : 2, 
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: isOngoing ? const BorderSide(color: Colors.redAccent, width: 2) : BorderSide.none,
      ), 
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () async {
          final realMssv = await _getRealMSSV();
          if (!mounted) return;
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => EventDetailScreen(
                event: event,
                isRegistered: isRegistered,
                mssv: realMssv,
                onStateChanged: () {
                  _fetchEventsFromBackend();
                },
              ),
            ),
          );
        },
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                Hero(
                  tag: 'poster_${event['id']}', 
                  child: buildPosterImage(),
                ),
                Positioned(
                  top: 12, right: 12, 
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6), 
                    decoration: BoxDecoration(color: const Color(0xFF2ECA7F), borderRadius: BorderRadius.circular(20)), 
                    child: Row(
                      children: [
                        const Icon(Icons.stars, color: Colors.white, size: 16), 
                        const SizedBox(width: 4), 
                        Text('+$points Đ', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12))
                      ],
                    ),
                  ),
                ),
                if (isOngoing)
                  Positioned(
                    top: 12, left: 12, 
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6), 
                      decoration: BoxDecoration(color: Colors.redAccent, borderRadius: BorderRadius.circular(4)), 
                      child: const Row(
                        children: [
                          Icon(Icons.local_fire_department, color: Colors.white, size: 16), 
                          SizedBox(width: 4), 
                          Text('ĐANG DIỄN RA', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11))
                        ],
                      ),
                    ),
                  ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4), 
                    decoration: BoxDecoration(color: const Color(0xFFE8EAF6), borderRadius: BorderRadius.circular(4)), 
                    child: Text(category.toUpperCase(), style: const TextStyle(color: Color(0xFF0D235E), fontSize: 10, fontWeight: FontWeight.bold))
                  ),
                  const SizedBox(height: 8),
                  Text(name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87), maxLines: 2, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 12),
                  
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.calendar_today, size: 14, color: Colors.grey), 
                      const SizedBox(width: 6), 
                      Expanded(
                        child: Text(dateStr, style: const TextStyle(fontSize: 13, color: Colors.grey))
                      )
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.location_on_outlined, size: 16, color: Colors.grey), 
                      const SizedBox(width: 4), 
                      Expanded(
                        child: Text(
                          event['require_gps'] == 1 || event['require_gps'] == '1' ? 'Điểm danh Định vị GPS' : 'Hình thức Online / Check-in QR', 
                          style: const TextStyle(fontSize: 13, color: Colors.grey)
                        )
                      )
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.stars, size: 16, color: Colors.orange), 
                      const SizedBox(width: 4), 
                      Expanded(
                        child: Text(
                          'Điểm hoạt động: $points điểm', 
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.orange)
                        )
                      )
                    ],
                  ),
                  const SizedBox(height: 8),
                  
                  // =========================================================================
                  // KHỐI CARD THỐNG KÊ TEXT CHỈ TIÊU CHI TIẾT TỪNG NGÀNH CON
                  // =========================================================================
                  (() {
                    final int maxParticipants = int.tryParse(event['max_participants']?.toString() ?? '0') ?? 0;
                    final int currentParticipants = int.tryParse(event['current_participants']?.toString() ?? '0') ?? 0;
                    
                    Map<String, dynamic> limitsObj = {};
                    if (event['faculty_limits'] != null && event['faculty_limits'].toString().isNotEmpty) {
                      try {
                        limitsObj = jsonDecode(event['faculty_limits'].toString());
                      } catch (e) {
                        debugPrint("Lỗi giải mã faculty_limits: $e");
                      }
                    }

                    Map<String, dynamic> registeredCounts = {};
                    if (event['faculty_registered_counts'] != null && event['faculty_registered_counts'].toString().isNotEmpty) {
                      try {
                        registeredCounts = jsonDecode(event['faculty_registered_counts'].toString());
                      } catch (_) {}
                    }

                    List<Widget> facultyTextLines = [];
                    
                    limitsObj.forEach((nganhCode, limitVal) {
                      if (limitVal != null && limitVal.toString().trim().isNotEmpty) {
                        final int limit = int.tryParse(limitVal.toString()) ?? 0;
                        if (limit > 0) {
                          final int currentReg = int.tryParse(registeredCounts[nganhCode]?.toString() ?? '0') ?? 0;
                          
                          facultyTextLines.add(
                            Padding(
                              padding: const EdgeInsets.only(top: 4.0),
                              child: Row(
                                children: [
                                  const Icon(Icons.subdirectory_arrow_right, size: 14, color: Colors.purple),
                                  const SizedBox(width: 4),
                                  Text(
                                    '• Ngành $nganhCode: Đã đăng ký $currentReg / Tối đa $limit sinh viên',
                                    style: const TextStyle(fontSize: 12, color: Colors.purple, fontWeight: FontWeight.w600),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }
                      }
                    });

                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.people_alt_outlined, size: 16, color: Colors.blue), 
                            const SizedBox(width: 4), 
                            Expanded(
                              child: Text(
                                maxParticipants > 0 
                                    ? 'Giới hạn tổng: $currentParticipants / $maxParticipants sinh viên' 
                                    : 'Số lượng: Không giới hạn tổng', 
                                style: const TextStyle(fontSize: 13, color: Colors.blue, fontWeight: FontWeight.w600)
                              )
                            )
                          ],
                        ),
                        if (facultyTextLines.isNotEmpty) ...[
                          const SizedBox(height: 2),
                          ...facultyTextLines,
                        ] else ...[
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              const Icon(Icons.school_outlined, size: 14, color: Colors.grey),
                              const SizedBox(width: 4),
                              Text('Chỉ tiêu ngành: Tự do đăng ký (Không giới hạn riêng)', style: TextStyle(fontSize: 12, color: Colors.grey.shade600, fontStyle: FontStyle.italic)),
                            ],
                          )
                        ],
                      ],
                    );
                  })(),

                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity, height: 45, 
                    child: buildActionButton(), 
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
} // Dấu đóng đóng lớp _EventListScreenState cực kỳ chuẩn xác