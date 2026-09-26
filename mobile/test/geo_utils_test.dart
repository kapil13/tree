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

  test('sortTreesByDistance orders trees closest first', () {
    final sorted = sortTreesByDistance(
      [
        {'id': 'far', 'latitude': 17.5, 'longitude': 78.6},
        {'id': 'near', 'latitude': 17.39, 'longitude': 78.49},
      ],
      latitude: 17.385,
      longitude: 78.4867,
    );

    expect(sorted.first['id'], 'near');
    expect(sorted.last['id'], 'far');
  });
}
