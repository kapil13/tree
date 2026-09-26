import 'package:byot_mobile/src/widgets/create_project_sheet.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('projectCodeFromName slugifies and suffixes', () {
    final code = projectCodeFromName('NHAI Chainage 142');
    expect(code.startsWith('NHAI_CHAINAGE_142_'), isTrue);
    expect(code.length, greaterThan('NHAI_CHAINAGE_142_'.length));
  });

  test('projectCodeFromName handles empty input', () {
    final code = projectCodeFromName('   ');
    expect(code.startsWith('PROJECT_'), isTrue);
  });
}
