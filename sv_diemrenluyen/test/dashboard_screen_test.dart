import 'package:flutter_test/flutter_test.dart';
import 'package:sv_diemrenluyen/models/dashboard_model.dart';
import 'package:sv_diemrenluyen/screens/dashboard_screen.dart';

void main() {
  test('returns the newest activities sorted by date and capped at three', () {
    final activities = [
      ActivityModel(
          id: '1',
          name: 'Hoạt động cũ',
          category: 'Học tập',
          date: DateTime(2024, 1, 1),
          status: 'done'),
      ActivityModel(
          id: '2',
          name: 'Hoạt động mới nhất',
          category: 'Ngoại khóa',
          date: DateTime(2024, 3, 10),
          status: 'done'),
      ActivityModel(
          id: '3',
          name: 'Hoạt động giữa kỳ',
          category: 'Tình nguyện',
          date: DateTime(2024, 2, 15),
          status: 'done'),
      ActivityModel(
          id: '4',
          name: 'Hoạt động mới hơn',
          category: 'Hội thảo',
          date: DateTime(2024, 4, 5),
          status: 'done'),
    ];

    final result = getLatestActivities(activities);

    expect(result.map((activity) => activity.id).toList(), ['4', '2', '3']);
    expect(result.length, 3);
  });
}
