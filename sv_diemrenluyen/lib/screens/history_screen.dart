import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../core/app_config.dart';
import '../widgets/shared_app_bar.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
// Import màn hình nộp minh chứng để phục vụ tính năng nộp lại dữ liệu
import 'evidence_submit_screen.dart'; 

class HistoryScreen extends StatefulWidget {
  final Map<String, dynamic> userData;
  const HistoryScreen({Key? key, required this.userData}) : super(key: key);

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  bool _isLoading = true;
  List<dynamic> _historyList = [];

  @override
  void initState() {
    super.initState();
    _fetchHistory();
  }

  // Hàm helper chuyển đổi định dạng thời gian ISO thành định dạng hiển thị Việt Nam (HH:mm:ss dd/MM/yyyy)
  String _formatDateTime(String? isoString) {
    if (isoString == null || isoString.isEmpty) return 'Chưa cập nhật';
    try {
      DateTime dt = DateTime.parse(isoString).toLocal();
      String hour = dt.hour.toString().padLeft(2, '0');
      String minute = dt.minute.toString().padLeft(2, '0');
      String second = dt.second.toString().padLeft(2, '0');
      String day = dt.day.toString().padLeft(2, '0');
      String month = dt.month.toString().padLeft(2, '0');
      return '$hour:$minute:$second $day/$month/${dt.year}';
    } catch (e) {
      return isoString; // Trả về chuỗi gốc nếu lỗi định dạng parse
    }
  }

  Future<void> _fetchHistory() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final String? savedUserData = prefs.getString('user_data');
      String mssv = '';
      
      if (savedUserData != null) {
        final Map<String, dynamic> localData = jsonDecode(savedUserData);
        mssv = localData['mssv']?.toString() ?? '';
      }

      if (mssv.isEmpty) {
        setState(() => _isLoading = false);
        return;
      }

      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final response = await Dio().get('$backendBaseUrl/api/mobile/history?mssv=$mssv&_t=$timestamp');
      
      if (response.statusCode == 200 && response.data['status'] == 'success') {
        setState(() {
          _historyList = response.data['data'] ?? [];
          _isLoading = false;
        });
      } else {
        setState(() => _isLoading = false);
      }
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  // --- HÀM HIỂN THỊ CHI TIẾT SỰ KIỆN CHUẨN UI KHỐI THEO MẪU IMAGE_9F0101.PNG ---
  void _showDetailDialog(Map<String, dynamic> item) {
    // Chuẩn hóa trạng thái: đưa về dạng viết thường, loại bỏ khoảng trắng
    final String proofStatus = (item['proof_status'] ?? '').toString().trim().toLowerCase();
    
    // Ép logic kiểm tra rõ ràng, loại bỏ trường hợp nhận diện sai khi dữ liệu null/rỗng
    final bool isApproved = proofStatus == 'approved';
    final bool isRejected = proofStatus == 'rejected';
    // Nếu trạng thái là 'pending' HOẶC có check-in nhưng cột proof_status chưa có dữ liệu thì coi là Đang chờ duyệt
    final bool isPending = proofStatus == 'pending' || (proofStatus.isEmpty && item['checkin_time'] != null);

    // Định hình trạng thái Minh chứng hiển thị trực quan lên Badge
    String statusText = 'KHÔNG YÊU CẦU MINH CHỨNG';
    Color statusColor = Colors.grey;
    Color statusBgColor = Colors.grey.shade100;
    
    if (isApproved) {
      statusText = 'ĐÃ DUYỆT MINH CHỨNG';
      statusColor = const Color(0xFF2ECA7F);
      statusBgColor = const Color(0xFF2ECA7F).withOpacity(0.1);
    } else if (isRejected) {
      statusText = 'BỊ TỪ CHỐI';
      statusColor = Colors.red;
      statusBgColor = Colors.red.withOpacity(0.1);
    } else if (isPending) {
      statusText = 'ĐANG CHỜ DUYỆT';
      statusColor = Colors.orange;
      statusBgColor = Colors.orange.withOpacity(0.1);
    }

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        contentPadding: EdgeInsets.zero,
        content: SizedBox(
          width: MediaQuery.of(context).size.width * 0.9,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // --- HEADER: BANNER ĐẠI DIỆN TRƯỜNG CÓ NÚT BACK ---
              ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                child: Container(
                  height: 100,
                  width: double.infinity,
                  color: const Color(0xFF0D235E),
                  child: Stack(
                    children: [
                      Positioned.fill(
                        child: Opacity(
                          opacity: 0.15,
                          child: const Center(
                            child: Text(
                              'CTUT',
                              style: TextStyle(
                                color: Colors.white, 
                                fontSize: 70, 
                                fontWeight: FontWeight.w900, 
                                letterSpacing: 5
                              ),
                            ),
                          ),
                        ),
                      ),
                      Positioned(
                        top: 10,
                        left: 10,
                        child: CircleAvatar(
                          backgroundColor: Colors.black26, 
                          radius: 16,
                          child: IconButton(
                            padding: EdgeInsets.zero,
                            icon: const Icon(Icons.arrow_back, color: Colors.white, size: 18),
                            onPressed: () => Navigator.pop(ctx),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // --- NỘI DUNG SỰ KIỆN TRÍCH XUẤT ĐỘNG TỪ CSDL BÊN DƯỚI ---
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Khối 1: Các nhãn phân loại, trạng thái & Điểm thưởng (+ X ĐRL)
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(color: const Color(0xFFE8EFFF), borderRadius: BorderRadius.circular(4)),
                            child: Text(
                              item['category']?.toString() ?? 'Tham gia học tập',
                              style: const TextStyle(color: Color(0xFF0D235E), fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(color: statusBgColor, borderRadius: BorderRadius.circular(4)),
                            child: Text(
                              statusText.toUpperCase(),
                              style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ),
                          const Spacer(),
                          Text(
                            '+${item['points'] ?? 0} ĐRL',
                            style: const TextStyle(color: Color(0xFF2ECA7F), fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Khối 2: Thanh thông báo tổng quan điểm rèn luyện tích lũy
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFF7EB),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFFFE3B8)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.star, color: Colors.orange, size: 18),
                            const SizedBox(width: 8),
                            Text(
                              'Điểm rèn luyện/hoạt động: ${item['points'] ?? 0}',
                              style: const TextStyle(color: Color(0xFFB36B00), fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),

                      // Khối 3: Tên chiến dịch / Tên hoạt động thực tế lấy từ DB
                      Text(
                        item['name'] ?? 'Tên sự kiện',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87),
                      ),
                      const SizedBox(height: 14),

                      // Khối 4: Khung bo xám chứa thông tin Thời gian lấy dữ liệu động từ bảng events
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8F9FA),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.grey.shade200),
                        ),
                        child: Column(
                          children: [
                            _buildSampleRow(
                              Icons.play_circle_outline, 
                              'Bắt đầu:', 
                              _formatDateTime(item['event_date'] ?? item['date']),
                            ),
                            const SizedBox(height: 10),
                            _buildSampleRow(
                              Icons.stop_circle_outlined, 
                              'Kết thúc:', 
                              _formatDateTime(item['event_end_date'] ?? item['end_date']),
                            ),
                            const SizedBox(height: 10),
                            _buildSampleRow(
                              Icons.location_on_outlined, 
                              'Hình thức:', 
                              item['method'] ?? 'Quét mã QR hệ thống'
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Khối 5: Nội dung chi tiết thực tế của sự kiện lấy từ CSDL
                      const Text('Nội dung chi tiết', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0D235E))),
                      const SizedBox(height: 6),
                      Text(
                        (item['event_description'] != null && item['event_description'].toString().isNotEmpty)
                            ? item['event_description'].toString()
                            : (item['description'] != null && item['description'].toString().isNotEmpty)
                                ? item['description'].toString()
                                : 'Không có mô tả chi tiết cho hoạt động này.',
                        style: TextStyle(fontSize: 13, color: Colors.grey.shade700, height: 1.4),
                      ),
                      const SizedBox(height: 16),

                      // Khối 6: Danh sách tài liệu đính kèm
                      const Text('Tài liệu đính kèm', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0D235E))),
                      const SizedBox(height: 8),
                      
                      () {
                        List<String> attachedFiles = [];
                        try {
                          final rawAttached = item['attached_file'] ?? item['event_attached_file'];
                          if (rawAttached != null && rawAttached.toString().isNotEmpty) {
                            final decoded = jsonDecode(rawAttached.toString());
                            if (decoded is List) {
                              attachedFiles = decoded.map((f) => f.toString()).toList();
                            }
                          }
                        } catch (e) {
                          if (item['attached_file'] != null) {
                            attachedFiles.add(item['attached_file'].toString());
                          }
                        }

                        if (attachedFiles.isEmpty) {
                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4.0),
                            child: Text(
                              'Không có tài liệu đính kèm.',
                              style: TextStyle(fontSize: 12, color: Colors.grey.shade500, fontStyle: FontStyle.italic),
                            ),
                          );
                        }

                        return Column(
                          children: attachedFiles.map((filePath) {
                            final fileName = filePath.split('/').last;

                            return Container(
                              margin: const EdgeInsets.only(bottom: 8),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF8F9FA),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: Colors.grey.shade200),
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    fileName.endsWith('.pdf') ? Icons.picture_as_pdf : Icons.description, 
                                    color: fileName.endsWith('.pdf') ? Colors.red : Colors.blue, 
                                    size: 28
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          fileName,
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        const SizedBox(height: 2),
                                        Text('Bấm để xem/tải về', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                                      ],
                                    ),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.download, color: Color(0xFF0D235E), size: 20),
                                    onPressed: () {
                                      final downloadUrl = filePath.startsWith('http') ? filePath : '$backendBaseUrl$filePath';
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(content: Text('Đang tải tài liệu: $fileName...'))
                                      );
                                    },
                                  ),
                                ],
                              ),
                            );
                          }).toList(),
                        );
                      }(),
                    ],
                  ),
                ),
              ),

              // --- BOTTOM BAR: XỬ LÝ KHÓA NỘP LẠI KHI HẾT HẠN SỰ KIỆN ---
              Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  color: isApproved 
                      ? Colors.grey.shade300 
                      : () {
                          final now = DateTime.now();
                          final endData = item['event_end_date'] ?? item['end_date'];
                          if (endData != null) {
                            final endTime = DateTime.tryParse(endData.toString());
                            if (endTime != null && now.isAfter(endTime)) {
                              return Colors.red.shade700;
                            }
                          }
                          return const Color(0xFF0D235E);
                        }(),
                  borderRadius: const BorderRadius.vertical(bottom: Radius.circular(16)),
                ),
                child: isApproved
                    ? const Padding(
                        padding: EdgeInsets.all(14),
                        child: Center(
                          child: Text(
                            'Đã được phê duyệt hoàn tất',
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                        ),
                      )
                    : Builder(
                        builder: (context) {
                          bool isExpired = false;
                          final now = DateTime.now();
                          final endData = item['event_end_date'] ?? item['end_date'];
                          
                          if (endData != null) {
                            final endTime = DateTime.tryParse(endData.toString());
                            if (endTime != null && now.isAfter(endTime)) {
                              isExpired = true;
                            }
                          }

                          if (isExpired) {
                            return Padding(
                              padding: const EdgeInsets.all(14),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(Icons.lock_clock, color: Colors.white, size: 18),
                                  const SizedBox(width: 8),
                                  Text(
                                    'SỰ KIỆN ĐÃ HẾT HẠN - KHÔNG THỂ NỘP LẠI MINH CHỨNG',
                                    style: TextStyle(color: Colors.white.withOpacity(0.9), fontWeight: FontWeight.bold, fontSize: 13),
                                  ),
                                ],
                              ),
                            );
                          }

                          return InkWell(
                            onTap: () {
                              Navigator.pop(ctx);
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => EvidenceSubmitScreen(
                                    userData: widget.userData,
                                    initialEventId: item['event_id']?.toString(),
                                    initialEventName: item['name']?.toString(),
                                    initialCategory: item['category']?.toString(),
                                    requireProof: true,
                                  ),
                                ),
                              ).then((value) {
                                if (value == true) {
                                  _fetchHistory();
                                }
                              });
                            },
                            borderRadius: const BorderRadius.vertical(bottom: Radius.circular(16)),
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    isRejected ? Icons.replay_rounded : Icons.edit_document, 
                                    color: Colors.white, 
                                    size: 18
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    isRejected ? 'MINH CHỨNG BỊ TỪ CHỐI - BẤM ĐỂ NỘP LẠI' : 'ĐANG CHỜ DUYỆT - BẤM ĐỂ CẬP NHẬT LẠI',
                                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSampleRow(IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: const Color(0xFF0D235E)),
        const SizedBox(width: 8),
        Text(label, style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: Colors.black87),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: buildSharedAppBar('Lịch sử hoạt động', getUserAvatarUrl(widget.userData)),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _historyList.isEmpty
                ? const Center(child: Text('Bạn chưa tham gia hoạt động nào.', style: TextStyle(color: Colors.grey)))
                : ListView.builder(
                    itemCount: _historyList.length,
                    itemBuilder: (context, index) {
                      final item = _historyList[index];

                      String statusLabel = 'Đang chờ';
                      Color labelColor = Colors.orange;
                      IconData leadingIcon = Icons.pending;
                      
                      final String currentStatus = (item['proof_status'] ?? '').toString().trim().toLowerCase();

                      if (currentStatus == 'approved') {
                        statusLabel = 'Đã duyệt';
                        labelColor = const Color(0xFF2ECA7F);
                        leadingIcon = Icons.check_circle;
                      } else if (currentStatus == 'rejected') {
                        statusLabel = 'Bị từ chối';
                        labelColor = Colors.red;
                        leadingIcon = Icons.cancel;
                      }

                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(12),
                          onTap: () => _showDetailDialog(item),
                          child: ListTile(
                            contentPadding: const EdgeInsets.all(16),
                            leading: CircleAvatar(
                              backgroundColor: labelColor.withOpacity(0.2),
                              child: Icon(leadingIcon, color: labelColor),
                            ),
                            title: Text(
                              item['name'] ?? 'Tên sự kiện', 
                              style: const TextStyle(fontWeight: FontWeight.bold)
                            ),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const SizedBox(height: 8),
                                Text(
                                  'Thời gian check-in: ${_formatDateTime(item['checkin_time'])}', 
                                  style: const TextStyle(fontSize: 12)
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Trạng thái minh chứng: $statusLabel', 
                                  style: TextStyle(
                                    fontSize: 12, 
                                    color: labelColor,
                                    fontWeight: FontWeight.bold
                                  )
                                ),
                              ],
                            ),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  '+${item['points'] ?? 0} Đ', 
                                  style: const TextStyle(
                                    color: Color(0xFF0D235E), 
                                    fontWeight: FontWeight.bold, 
                                    fontSize: 16
                                  )
                                ),
                                const SizedBox(width: 4),
                                const Icon(Icons.chevron_right, color: Colors.grey),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  )
      ),
    );
  }
}