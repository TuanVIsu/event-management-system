import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../widgets/shared_app_bar.dart';
import '../models/dashboard_model.dart';
import '../core/app_config.dart';
import 'event_detail_screen.dart'; // Import trang chi tiết sự kiện

class DashboardScreen extends StatefulWidget {
  final Map<String, dynamic> userData;
  final VoidCallback? onViewAllActivities;
  
  const DashboardScreen({Key? key, required this.userData, this.onViewAllActivities}) : super(key: key);

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool _isLoading = true;
  int _maxTotalPoints = 100;
  String _fullName = '';
  String _mssv = '';
  String _chiDoan = '';
  int _pointWallet = 0;

  List<CriteriaModel> _criteriaList = [];
  // --- ĐÃ SỬA: Chuyển đổi mảng từ ActivityModel sang mảng động Map JSON gốc để fix lỗi getter ---
  List<dynamic> _recentActivities = []; 

  @override
  void initState() {
    super.initState();
    _fullName = widget.userData['full_name'] ?? widget.userData['name'] ?? 'Đang tải...';
    _mssv = widget.userData['mssv'] ?? '';
    _chiDoan = widget.userData['chi_doan'] ?? 'Đang tải...';
    
    _fetchDashboardData();
  }

  Future<void> _fetchDashboardData() async {
    try {
      final String currentMssv = widget.userData['mssv'] ?? '';
      if (currentMssv.isEmpty) return;
      
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      // Gọi trực tiếp đến API di động của Server NodeJS
      final response = await Dio().get('$backendBaseUrl/api/mobile/dashboard?mssv=$currentMssv&t=$timestamp');
      
      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        if (mounted) {
          setState(() {
            if (data['user_info'] != null) {
              _fullName = data['user_info']['full_name'] ?? _fullName;
              _mssv = data['user_info']['mssv'] ?? _mssv;
              _chiDoan = data['user_info']['chi_doan'] ?? _chiDoan;
            }

            final List<dynamic> criteriaData = data['criteria'] ?? [];
            _criteriaList = criteriaData.map((json) => CriteriaModel.fromJson(json)).toList();

            int calculatedTotalPoints = 0;
            int calculatedMaxPoints = 0;

            for (var criteria in _criteriaList) {
              calculatedTotalPoints += criteria.currentPoints;
              calculatedMaxPoints += criteria.maxPoints;
            }

            _pointWallet = calculatedTotalPoints;
            _maxTotalPoints = calculatedMaxPoints > 0 ? calculatedMaxPoints : 100;

            // --- XỬ LÝ SẮP XẾP VÀ TRÍCH XUẤT 5 HOẠT ĐỘNG GẦN NHẤT TỪ MAP ---
            final List<dynamic> activitiesData = data['recent_activities'] ?? [];
            
            activitiesData.sort((a, b) {
              final dateA = DateTime.tryParse(a['date']?.toString() ?? '') ?? DateTime.now();
              final dateB = DateTime.tryParse(b['date']?.toString() ?? '') ?? DateTime.now();
              return dateB.compareTo(dateA); // Ngày mới nhất lên đầu
            });

            _recentActivities = activitiesData.take(5).toList();
            _isLoading = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Không thể kết nối máy chủ NodeJS!'), backgroundColor: Colors.red),
        );
      }
    }
  }

  // Hàm phụ trợ định dạng ngày tháng hiển thị dạng ngắn gọn (dd Thg MM, yyyy)
  String _formatActivityDate(String? isoString) {
    if (isoString == null || isoString.isEmpty) return 'Chưa rõ ngày';
    try {
      DateTime dt = DateTime.parse(isoString).toLocal();
      String day = dt.day.toString().padLeft(2, '0');
      String month = dt.month.toString().padLeft(2, '0');
      return '$day Thg $month, ${dt.year}';
    } catch (e) {
      return isoString;
    }
  }

  @override
  Widget build(BuildContext context) {
    final String pointStatus = _pointWallet >= 80 ? 'Xuất sắc' : _pointWallet >= 65 ? 'Khá' : 'Trung bình';
    final String currentAvatarUrl = getUserAvatarUrl(widget.userData);
    
    return Scaffold(
      backgroundColor: const Color(0xFFF4F6F9),
      appBar: buildSharedAppBar('Quản lý Điểm', currentAvatarUrl),
      body: SafeArea(
        child: _isLoading 
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _fetchDashboardData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Column(
                  children: [
                    // --- 1. THẺ THÔNG TIN SINH VIÊN ---
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200)),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(_fullName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0D235E))),
                                const SizedBox(height: 6),
                                Row(
                                  children: [
                                    const Icon(Icons.badge_outlined, size: 14, color: Colors.grey),
                                    const SizedBox(width: 4),
                                    Text('MSSV: $_mssv', style: const TextStyle(color: Colors.grey, fontSize: 12, fontWeight: FontWeight.w500)),
                                    const SizedBox(width: 16),
                                    const Icon(Icons.school_outlined, size: 14, color: Colors.grey),
                                    const SizedBox(width: 4),
                                    Text('LỚP: $_chiDoan', style: const TextStyle(color: Colors.grey, fontSize: 12, fontWeight: FontWeight.w500)),
                                  ],
                                )
                              ],
                            ),
                          )
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // --- 2. VÍ ĐIỂM TIẾN TRÌNH ---
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 24),
                      width: double.infinity,
                      decoration: BoxDecoration(color: const Color(0xFF1E3A8A), borderRadius: BorderRadius.circular(16)),
                      child: Column(
                        children: [
                          const Text('Ví Điểm Rèn Luyện', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 20),
                          Stack(
                            alignment: Alignment.center,
                            children: [
                              SizedBox(
                                  width: 130, height: 130,
                                  child: CircularProgressIndicator(value: _pointWallet / _maxTotalPoints, strokeWidth: 10, color: const Color(0xFF34D399), backgroundColor: Colors.white.withOpacity(0.1), strokeCap: StrokeCap.round)),
                              Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text('$_pointWallet', style: const TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.bold)),
                                  Text('/ $_maxTotalPoints Đ', style: const TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w500)),
                                ],
                              )
                            ],
                          ),
                          const SizedBox(height: 24),
                          Container(
                              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                              decoration: BoxDecoration(color: Colors.white.withOpacity(0.15), borderRadius: BorderRadius.circular(8)),
                              child: Text('Trạng thái: $pointStatus', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)))
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // --- 3. TIÊU CHÍ CHI TIẾT ---
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200)),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Chi tiết các tiêu chí', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0D235E))),
                          const SizedBox(height: 24),
                          if (_criteriaList.isEmpty) const Center(child: Text('Chưa có dữ liệu tiêu chí', style: TextStyle(color: Colors.grey)))
                          else ..._criteriaList.map((criteria) => _buildProgressRow(criteria)).toList(),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // --- 4. HOẠT ĐỘNG MỚI NHẤT ---
                    _buildRecentActivitySection(),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),
      ),
    );
  }

  Widget _buildProgressRow(CriteriaModel criteria) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(children: [
                Icon(criteria.icon, size: 20, color: const Color(0xFF1E3A8A)),
                const SizedBox(width: 8),
                Text(criteria.title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF1E3A8A)))
              ]),
              Text('${criteria.currentPoints}/${criteria.maxPoints}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF1E3A8A))),
            ],
          ),
          const SizedBox(height: 8),
          LinearProgressIndicator(value: criteria.maxPoints > 0 ? criteria.currentPoints / criteria.maxPoints : 0, backgroundColor: Colors.grey.shade200, color: const Color(0xFF1E3A8A), minHeight: 8, borderRadius: BorderRadius.circular(10))
        ],
      ),
    );
  }

  Widget _buildRecentActivitySection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Hoạt động mới nhất', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0D235E))),
              GestureDetector(
                onTap: widget.onViewAllActivities,
                child: const Text('Xem tất cả >', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF1E3A8A))),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (_recentActivities.isEmpty)
            const Padding(padding: EdgeInsets.symmetric(vertical: 20), child: Center(child: Text('Chưa có hoạt động nào', style: TextStyle(color: Colors.grey))))
          else
            ..._recentActivities.map((activity) => _buildActivityItem(activity)).toList(),
        ],
      ),
    );
  }

  Widget _buildActivityItem(dynamic activity) {
    // Đọc dữ liệu an toàn dưới dạng các cặp khóa Map tĩnh từ CSDL
    String name = activity['name']?.toString() ?? 'Chưa có tên';
    String categoryText = activity['category']?.toString() ?? 'Sự kiện khác';
    String dateStr = _formatActivityDate(activity['date']?.toString());

    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: InkWell(
// Tìm đến block Navigator.push trong widget _buildActivityItem
onTap: () {
  Navigator.push(
    context,
    MaterialPageRoute(
      builder: (context) => EventDetailScreen(
        event: {
          'id': activity['id'],
          'name': name,
          'category': categoryText,
          'date': activity['date']?.toString(),
          'end_date': activity['end_date']?.toString() ?? 
                      (activity['date'] != null 
                       ? DateTime.parse(activity['date'].toString()).add(const Duration(hours: 4)).toIso8601String() 
                       : null),
          'points': activity['points'] ?? 0,
          'description': activity['description'],
          'attached_file': activity['attached_file'],
          'require_gps': activity['require_gps'],
          'status': activity['status'] ?? 'Sắp diễn ra',
          'poster_url': activity['poster_url'],
          'max_participants': activity['max_participants'] ?? 0,
          'current_participants': activity['current_participants'] ?? 0,
          'faculty_limits': activity['faculty_limits'],
          'faculty_registered_counts': activity['faculty_registered_counts'],
          
          // --- BỔ SUNG DÒNG NÀY ĐỂ ĐỒNG BỘ CƠ CHẾ TỪ TRANG CHỦ ---
          'score_type': activity['score_type'], 
        },
        isRegistered: activity['is_registered'] == 1 || activity['is_registered'] == true,
        mssv: _mssv,
        onStateChanged: () {
          _fetchDashboardData();
        },
      ),
    ),
  ).then((_) {
    _fetchDashboardData();
  });
},
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: Colors.blue.shade100, width: 1.2),
            boxShadow: [BoxShadow(color: Colors.blue.withOpacity(0.05), blurRadius: 8, offset: const Offset(0, 4))],
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: [Colors.blue.shade400, const Color(0xFF0D235E)], begin: Alignment.topLeft, end: Alignment.bottomRight),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.event_available_rounded, color: Colors.white, size: 24),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0D235E)), maxLines: 2, overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(color: const Color(0xFF2ECA7F).withOpacity(0.15), borderRadius: BorderRadius.circular(20)),
                      child: Text(categoryText, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF1E8A54))),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.end,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(dateStr, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.grey.shade600)),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(color: Colors.grey.shade100, shape: BoxShape.circle),
                    child: const Icon(Icons.arrow_forward_ios_rounded, size: 12, color: Color(0xFF0D235E)),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}