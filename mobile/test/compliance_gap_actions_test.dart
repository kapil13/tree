import 'package:flutter_test/flutter_test.dart';

import 'package:byot_mobile/src/compliance_gap_actions.dart';

void main() {
  test('resolveComplianceGapAction links scheme refs to setup step 3', () {
    final action = resolveComplianceGapAction(
      {'key': 'estate_metadata_complete'},
      projectId: 'proj-1',
    );
    expect(action?.route, '/projects/proj-1/setup?step=3');
  });

  test('resolveComplianceGapAction links satellite gaps', () {
    final action = resolveComplianceGapAction(
      {'key': 'satellite_coverage'},
      projectId: 'proj-1',
    );
    expect(action?.route, '/satellite?project=proj-1');
  });
}
