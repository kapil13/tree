import 'package:flutter_test/flutter_test.dart';

import 'package:byot_mobile/src/audit_phases.dart';

void main() {
  test('defaultAuditPhase follows engagement status', () {
    expect(defaultAuditPhase('draft'), 'intake');
    expect(defaultAuditPhase('sampling_planned'), 'sampling');
    expect(defaultAuditPhase('export_ready'), 'attestation');
  });

  test('isAuditPhaseUnlocked gates reconciliation after sampling', () {
    expect(isAuditPhaseUnlocked('reconciliation', 'risk_assessed'), isFalse);
    expect(isAuditPhaseUnlocked('reconciliation', 'sampling_planned'), isTrue);
  });
}
