import 'package:flutter_test/flutter_test.dart';

import 'package:byot_mobile/src/integrity_remediation.dart';

void main() {
  test('integrityBlockerLabel maps known codes', () {
    expect(integrityBlockerLabel('insufficient_photos'), 'Need at least 2 photos');
    expect(integrityBlockerLabel('unknown_code'), 'unknown code');
  });

  test('resolveIntegrityRemediation returns survival route for regeotag', () {
    final action = resolveIntegrityRemediation('regeotag_mismatch', treeId: 'tree-1');
    expect(action.route, '/trees/tree-1/survival');
    expect(action.label, contains('Re-geotag'));
  });

  test('resolveIntegrityRemediation returns project route for SAR issues', () {
    final action = resolveIntegrityRemediation('sar_integrity_below_minimum', projectId: 'proj-1');
    expect(action.route, '/projects/proj-1');
  });
}
