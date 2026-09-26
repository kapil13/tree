import 'package:byot_mobile/src/l10n/alert_filters.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('matches fire and flood alert kinds', () {
    expect(
      matchesAlertFilter({'kind': 'fire_alert', 'severity': 'warning'}, 'fire'),
      isTrue,
    );
    expect(
      matchesAlertFilter({'kind': 'flood_extent_alert', 'severity': 'high'}, 'flood'),
      isTrue,
    );
    expect(
      matchesAlertFilter({'kind': 'weather_heavy_rain', 'severity': 'warning'}, 'weather'),
      isTrue,
    );
    expect(
      matchesAlertFilter({'kind': 'locust_watch', 'severity': 'info'}, 'locust'),
      isTrue,
    );
  });

  test('isMapHazardAlert requires hazard kind and elevated severity', () {
    expect(
      isMapHazardAlert({'kind': 'fire_alert', 'severity': 'critical'}),
      isTrue,
    );
    expect(
      isMapHazardAlert({'kind': 'ndvi_degradation', 'severity': 'critical'}),
      isFalse,
    );
    expect(
      isMapHazardAlert({'kind': 'fire_alert', 'severity': 'info'}),
      isFalse,
    );
  });
}
