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
    expect(routes, contains('/map'));
    expect(routes, isNot(contains('/bioacoustic')));
    expect(routes, contains('/profile'));
  });

  test('drawer includes bioacoustic for professional', () {
    final pro = {
      'role': 'corporate',
      'has_professional_program': true,
    };
    final groups = mobileNavGroupsFor(pro);
    final routes = groups.expand((g) => g.items.map((i) => i.route)).toList();
    expect(routes, contains('/bioacoustic'));
    expect(routes, contains('/monitoring'));
  });

  test('field fab routes include home and trees', () {
    expect(showFieldFabOnRoute('/home'), isTrue);
    expect(showFieldFabOnRoute('/trees'), isTrue);
    expect(showFieldFabOnRoute('/bioacoustic'), isFalse);
  });
}
