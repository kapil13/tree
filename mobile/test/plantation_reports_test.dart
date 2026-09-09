import 'package:flutter_test/flutter_test.dart';

import 'package:byot_mobile/src/plantation_reports.dart';

void main() {
  test('mobile plantation MIS subset has 8 reports', () {
    expect(mobilePlantationMisReports.length, 8);
  });

  test('plantationMisReportById resolves known ids', () {
    expect(plantationMisReportById('survival-mortality')?.label, contains('Survival'));
    expect(plantationMisReportById('missing'), isNull);
  });
}
