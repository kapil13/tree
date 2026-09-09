import 'package:byot_mobile/src/invite_landing.dart';
import 'package:byot_mobile/src/nav_access.dart';
import 'package:byot_mobile/src/route_access.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('field worker sees field tab and map but not bioacoustic', () {
    final worker = {
      'role': 'field_worker',
      'org_role': 'worker',
      'has_professional_program': false,
    };
    expect(isFieldWorkerHome(worker), isTrue);
    expect(canSeeProjects(worker), isTrue);
    expect(canSeeBioacoustic(worker), isFalse);
    expect(canSeeFieldOps(worker), isTrue);
    expect(canSeeFieldTab(worker), isTrue);
    expect(canSeeMap(worker), isTrue);
    expect(canAccessPath(worker, '/projects'), isTrue);
    expect(canAccessPath(worker, '/bioacoustic'), isFalse);
    expect(canAccessPath(worker, '/field'), isTrue);
    expect(canAccessPath(worker, '/field-ops'), isTrue);
    expect(
      navDestinationsFor(worker).map((d) => d.path).toList(),
      ['/home', '/map', '/field'],
    );
  });

  test('viewer cannot add trees or access field tab', () {
    final viewer = {
      'role': 'government',
      'org_role': 'viewer',
      'has_professional_program': true,
    };
    expect(canAddTrees(viewer), isFalse);
    expect(canSeeFieldOps(viewer), isFalse);
    expect(canSeeFieldTab(viewer), isFalse);
    expect(canAccessPath(viewer, '/trees/new'), isFalse);
    expect(canAccessPath(viewer, '/trees/abc/survival'), isFalse);
    expect(canAccessPath(viewer, '/field'), isFalse);
  });

  test('exec shell includes monitoring and bio tabs', () {
    final exec = {
      'role': 'corporate',
      'has_professional_program': true,
    };
    expect(canSeeMonitoring(exec), isTrue);
    expect(canSeeBioacoustic(exec), isTrue);
    expect(
      navDestinationsFor(exec).map((d) => d.path).toList(),
      ['/home', '/map', '/field', '/monitoring', '/bioacoustic'],
    );
  });

  test('citizen BYOT gets home map field only', () {
    final citizen = {
      'role': 'citizen',
      'has_professional_program': false,
    };
    expect(
      navDestinationsFor(citizen).map((d) => d.path).toList(),
      ['/home', '/map', '/field'],
    );
    expect(canAccessPath(citizen, '/field'), isTrue);
  });

  test('invite landing routes by org role', () {
    expect(inviteLandingRoute('worker'), '/projects');
    expect(inviteLandingRoute('viewer'), '/trees');
  });

  test('evidence and biodiversity routes are role-gated', () {
    final supervisor = {
      'role': 'government',
      'org_role': 'supervisor',
      'has_professional_program': true,
    };
    final worker = {
      'role': 'field_worker',
      'org_role': 'worker',
      'has_professional_program': false,
    };
    expect(canAccessPath(supervisor, '/evidence'), isTrue);
    expect(canAccessPath(supervisor, '/biodiversity'), isTrue);
    expect(canAccessPath(worker, '/evidence'), isFalse);
    expect(canAccessPath(worker, '/biodiversity'), isFalse);
  });
}
