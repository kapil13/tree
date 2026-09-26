import 'package:flutter_test/flutter_test.dart';

import 'package:byot_mobile/src/audit_workspace.dart';

void main() {
  test('auditAttestationEnabled gates sign-off statuses', () {
    expect(auditAttestationEnabled('export_ready'), isTrue);
    expect(auditAttestationEnabled('under_review'), isTrue);
    expect(auditAttestationEnabled('attested'), isTrue);
    expect(auditAttestationEnabled('field_verified'), isFalse);
    expect(auditAttestationEnabled(null), isFalse);
  });

  test('auditNeedsFieldPlots covers sampling and field verification', () {
    expect(auditNeedsFieldPlots('sampling_planned'), isTrue);
    expect(auditNeedsFieldPlots('field_verified'), isTrue);
    expect(auditNeedsFieldPlots('export_ready'), isFalse);
  });

  test('auditNeedsAttestationAction detects pending work', () {
    expect(
      auditNeedsAttestationAction({
        'can_sign': false,
        'can_cosign': false,
        'review_queue': {'pending_review_count': 2},
      }),
      isTrue,
    );
    expect(
      auditNeedsAttestationAction({
        'can_sign': true,
        'review_queue': {'pending_review_count': 0},
      }),
      isTrue,
    );
    expect(
      auditNeedsAttestationAction({
        'can_sign': false,
        'can_cosign': false,
        'review_queue': {'pending_review_count': 0},
      }),
      isFalse,
    );
  });

  test('auditEngagementStatusLabel humanizes known statuses', () {
    expect(auditEngagementStatusLabel('under_review'), 'Under review');
    expect(auditEngagementStatusLabel('no_engagement'), 'No engagement');
  });
}
