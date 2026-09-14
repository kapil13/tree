import 'package:byot_mobile/src/dashboard/dashboard_brief.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('buildHomeQueueItems merges violations, survival, and alerts', () {
    final items = buildHomeQueueItems(
      alerts: [
        {'title': 'Wind alert', 'message': 'High wind', 'is_read': false, 'severity': 'high'},
      ],
      fieldSummary: {
        'recent_violations': [
          {'message': 'Missing photo', 'project_name': 'NHAI-1'},
        ],
        'projects': [
          {'id': 'p1', 'name': 'Mine belt', 'survival_due': 4},
        ],
      },
      includeFieldOps: true,
      limit: 3,
    );

    expect(items.length, 3);
    expect(items.first.kind, 'violation');
    expect(items[1].kind, 'survival');
    expect(items.last.kind, 'alert');
  });

  test('homeContextMeta appends weather when available', () {
    final meta = homeContextMeta(
      trees: 12,
      treesRegisteredLabel: '12 trees registered',
      emptyTreesLabel: 'Register your first tree',
      weather: {
        'days': [
          {'temp_max_c': 32, 'description': 'partly cloudy'},
        ],
      },
    );

    expect(meta, contains('12 trees registered'));
    expect(meta, contains('32°C'));
    expect(meta, contains('partly cloudy'));
  });
}
