import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:byot_mobile/src/widgets/responsive_content.dart';

void main() {
  testWidgets('ResponsiveContent constrains child width on wide screens', (tester) async {
    await tester.binding.setSurfaceSize(const Size(1200, 800));
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: ResponsiveContent(
            child: SizedBox(width: double.infinity, height: 100),
          ),
        ),
      ),
    );

    final box = tester.getSize(find.byType(SizedBox).first);
    expect(box.width, 720);
  });
}
