import 'package:byot_mobile/src/invite_landing.dart';
import 'package:byot_mobile/src/nav_access.dart';
import 'package:byot_mobile/src/route_access.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('field worker sees projects but not bioacoustic', () {
    final worker = {
      'role': 'field_worker',
      'org_role': 'worker',
      'has_professional_program': false,
    };
    expect(isFieldWorkerHome(worker), isTrue);
    expect(canSeeProjects(worker), isTrue);
    expect(canSeeBioacoustic(worker), isFalse);
    expect(canSeeFieldOps(worker), isTrue);
    expect(canSeeMap(worker), isTrue);
    expect(canAccessPath(worker, '/projects'), isTrue);
    expect(canAccessPath(worker, '/bioacoustic'), isFalse);
    expect(canAccessPath(worker, '/field-ops'), isTrue);
    expect(
      navDestinationsFor(worker).map((d) => d.path).toList(),
      ['/home', '/trees', '/map', '/notifications', kMoreNavPath],
    );
  });

  test('viewer cannot add trees', () {
    final viewer = {
      'role': 'government',
      'org_role': 'viewer',
      'has_professional_program': true,
    };
    expect(canAddTrees(viewer), isFalse);
    expect(canSeeFieldOps(viewer), isFalse);
    expect(canAccessPath(viewer, '/trees/new'), isFalse);
    expect(canAccessPath(viewer, '/trees/abc/survival'), isFalse);
  });

  test('exec shell includes bioacoustic footer and more tab', () {
    final exec = {
      'role': 'corporate',
      'has_professional_program': true,
    };
    expect(canSeeMonitoring(exec), isTrue);
    expect(canSeePortfolioHealth(exec), isTrue);
    expect(
      navDestinationsFor(exec).map((d) => d.path).toList(),
      ['/home', '/bioacoustic', '/map', '/notifications', kMoreNavPath],
    );
    expect(isMoreTabRoute('/portfolio-health'), isTrue);
    expect(isMoreTabRoute('/monitoring'), isTrue);
    expect(footerSelectedIndex('/portfolio-health', exec), 4);
  });

  test('citizen sees stewardship in drawer not footer', () {
    final citizen = {'role': 'citizen', 'has_professional_program': false};
    expect(canSeeStewardship(citizen), isTrue);
    expect(canAccessPath(citizen, '/stewardship'), isTrue);
    final sections = drawerSectionsFor(citizen);
    expect(sections.any((s) => s.items.any((i) => i.path == '/stewardship')), isTrue);
    expect(navDestinationsFor(citizen).any((d) => d.path == '/stewardship'), isFalse);
  });

  test('invite landing routes by org role', () {
    expect(inviteLandingRoute('worker'), '/projects');
    expect(inviteLandingRoute('viewer'), '/trees');
  });
}
