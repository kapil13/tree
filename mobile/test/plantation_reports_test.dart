import 'package:flutter_test/flutter_test.dart';

import 'package:byot_mobile/src/plantation_reports.dart';

void main() {
  test('mobile plantation MIS catalog has 16 reports (Phase F parity)', () {
    expect(mobilePlantationMisReports.length, 16);
  });

  test('plantationMisReportById resolves known ids', () {
    expect(plantationMisReportById('survival-mortality')?.label, contains('Survival'));
    expect(plantationMisReportById('missing'), isNull);
  });
}
