import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:byot_mobile/src/project_context.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('selectedProjectLabel shows project name when selected', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Builder(
          builder: (context) {
            final label = selectedProjectLabel(
              context,
              [
                {'id': 'p1', 'name': 'Highway Corridor'},
                {'id': 'p2', 'name': 'Mine Greenbelt'},
              ],
              'p1',
            );
            return Text(label);
          },
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Highway Corridor'), findsOneWidget);
  });
}
