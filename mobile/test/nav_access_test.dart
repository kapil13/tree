import 'package:byot_mobile/src/invite_landing.dart';
import 'package:byot_mobile/src/nav_access.dart';
import 'package:byot_mobile/src/route_access.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('field worker sees projects but not bioacoustic', () {
    final worker = {
      'role': 'field_worker',
      'org_role': 'worker',
      'has_professional_program': true,
    };
    expect(isFieldWorkerHome(worker), isTrue);
    expect(canSeeProjects(worker), isTrue);
    expect(canSeeBioacoustic(worker), isFalse);
    expect(canAccessPath(worker, '/projects'), isTrue);
    expect(canAccessPath(worker, '/bioacoustic'), isFalse);
  });

  test('viewer cannot add trees', () {
    final viewer = {
      'role': 'government',
      'org_role': 'viewer',
      'has_professional_program': true,
    };
    expect(canAddTrees(viewer), isFalse);
    expect(canAccessPath(viewer, '/trees/new'), isFalse);
  });

  test('invite landing routes by org role', () {
    expect(inviteLandingRoute('worker'), '/projects');
    expect(inviteLandingRoute('viewer'), '/trees');
  });
}
