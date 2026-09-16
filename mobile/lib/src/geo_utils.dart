import 'package:geolocator/geolocator.dart';

/// Lightweight geo helpers for mobile screens.

List<Map<String, dynamic>> sortTreesByDistance(
  List<dynamic> trees, {
  required double latitude,
  required double longitude,
}) {
  final scored = <({double distance, Map<String, dynamic> tree})>[];
  for (final raw in trees) {
    final tree = Map<String, dynamic>.from(raw as Map);
    final coords = coordsFromTree(tree);
    if (coords == null) continue;
    scored.add((
      distance: Geolocator.distanceBetween(
        latitude,
        longitude,
        coords.lat,
        coords.lon,
      ),
      tree: tree,
    ));
  }
  scored.sort((a, b) => a.distance.compareTo(b.distance));
  return scored.map((entry) => entry.tree).toList();
}

({double lat, double lon})? centroidFromFence(Map<String, dynamic> fence) {
  final boundary = fence['boundary'] as Map<String, dynamic>?;
  final coordinates = boundary?['coordinates'] as List<dynamic>?;
  if (coordinates == null || coordinates.isEmpty) return null;
  final ring = coordinates.first as List<dynamic>?;
  if (ring == null || ring.isEmpty) return null;

  var sumLat = 0.0;
  var sumLon = 0.0;
  var count = 0;
  for (final point in ring) {
    if (point is! List || point.length < 2) continue;
    sumLon += (point[0] as num).toDouble();
    sumLat += (point[1] as num).toDouble();
    count++;
  }
  if (count == 0) return null;
  return (lat: sumLat / count, lon: sumLon / count);
}

({double lat, double lon})? coordsFromTree(Map<String, dynamic> tree) {
  final lat = (tree['latitude'] as num?)?.toDouble();
  final lon = (tree['longitude'] as num?)?.toDouble();
  if (lat == null || lon == null) return null;
  return (lat: lat, lon: lon);
}
