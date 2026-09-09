import 'package:byot_mobile/src/geo_utils.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('centroidFromFence averages polygon ring', () {
    final coords = centroidFromFence({
      'boundary': {
        'type': 'Polygon',
        'coordinates': [
          [
            [78.0, 17.0],
            [78.2, 17.0],
            [78.2, 17.2],
            [78.0, 17.2],
            [78.0, 17.0],
          ],
        ],
      },
    });
    expect(coords, isNotNull);
    expect(coords!.lat, closeTo(17.08, 0.01));
    expect(coords.lon, closeTo(78.08, 0.01));
  });

  test('coordsFromTree reads latitude and longitude', () {
    final coords = coordsFromTree({'latitude': 12.5, 'longitude': 77.1});
    expect(coords, isNotNull);
    expect(coords!.lat, 12.5);
    expect(coords.lon, 77.1);
  });
}
