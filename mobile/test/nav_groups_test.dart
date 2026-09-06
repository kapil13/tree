import 'package:byot_mobile/src/nav_groups.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('drawer groups filter by role for field worker', () {
    final worker = {
      'role': 'field_worker',
      'org_role': 'worker',
      'has_professional_program': false,
    };
    final groups = mobileNavGroupsFor(worker);
    final routes = groups.expand((g) => g.items.map((i) => i.route)).toList();
    expect(routes, contains('/projects'));
    expect(routes, contains('/trees'));
    expect(routes, contains('/field'));
    expect(routes, isNot(contains('/bioacoustic')));
    expect(routes, isNot(contains('/map')));
    expect(routes, contains('/notifications'));
    expect(routes, contains('/profile'));
  });

  test('drawer excludes bottom-tab routes for professional', () {
    final pro = {
      'role': 'corporate',
      'has_professional_program': true,
    };
    final groups = mobileNavGroupsFor(pro);
    final routes = groups.expand((g) => g.items.map((i) => i.route)).toList();
    expect(routes, isNot(contains('/bioacoustic')));
    expect(routes, isNot(contains('/monitoring')));
    expect(routes, contains('/reports'));
    expect(routes, contains('/carbon'));
  });

  test('field fab routes include home and field tab', () {
    expect(showFieldFabOnRoute('/home'), isTrue);
    expect(showFieldFabOnRoute('/field'), isTrue);
    expect(showFieldFabOnRoute('/trees'), isTrue);
    expect(showFieldFabOnRoute('/bioacoustic'), isFalse);
  });
}
