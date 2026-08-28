import 'package:flutter_test/flutter_test.dart';

import 'package:byot_mobile/src/l10n/alert_labels.dart';

void main() {
  test('alertKindLabel humanizes snake_case keys', () {
    expect(alertKindLabel('sar_flood_risk'), 'SAR waterlogging');
    expect(alertKindLabel('citizen_stewardship_due'), 'Citizen stewardship due');
    expect(alertKindLabel('locust_watch'), 'Locust watch');
  });

  test('alertKindLabel supports Hindi', () {
    expect(
      alertKindLabel('weather_thunderstorm', languageCode: 'hi'),
      'आंधी-तूफान चेतावनी',
    );
  });

  test('healthDistributionLabel supports Hindi', () {
    expect(healthDistributionLabel('healthy', languageCode: 'hi'), 'स्वस्थ');
    expect(healthDistributionLabel('moderate', languageCode: 'hi'), 'मध्यम');
  });
}
