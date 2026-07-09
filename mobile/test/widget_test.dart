import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:byot_mobile/src/app.dart';

void main() {
  testWidgets('BYOT app loads splash route', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: ByotApp()));
    await tester.pump();
    expect(find.text('BYOT'), findsWidgets);
  });
}
