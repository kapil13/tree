import 'package:byot_mobile/l10n/app_localizations_en.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('report kind labels include ESG', () {
    final l10n = AppLocalizationsEn();
    expect(l10n.reportTypeEsg, 'ESG disclosure');
    expect(l10n.offlineServerUnreachable, contains('Server unreachable'));
  });
}
