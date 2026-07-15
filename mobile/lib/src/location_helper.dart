import 'package:geolocator/geolocator.dart';

/// User-friendly GPS capture for field use (trees, bioacoustic).
class LocationCaptureResult {
  const LocationCaptureResult({
    required this.latitude,
    required this.longitude,
    this.accuracyMeters,
    this.usedFallback = false,
    this.message,
  });

  final double latitude;
  final double longitude;
  final double? accuracyMeters;
  final bool usedFallback;
  final String? message;
}

class LocationCaptureException implements Exception {
  LocationCaptureException(this.message);
  final String message;
  @override
  String toString() => message;
}

/// Default: Hyderabad — used only when GPS is unavailable (offline forest).
const double kDefaultLatitude = 17.385;
const double kDefaultLongitude = 78.4867;

Future<LocationCaptureResult> captureLocation({
  bool allowFallback = true,
  Duration timeout = const Duration(seconds: 12),
}) async {
  final serviceOn = await Geolocator.isLocationServiceEnabled();
  if (!serviceOn) {
    throw LocationCaptureException(
      'Phone location is turned off. Open Settings → Location → turn ON, then try again.',
    );
  }

  var perm = await Geolocator.checkPermission();
  if (perm == LocationPermission.denied) {
    perm = await Geolocator.requestPermission();
  }
  if (perm == LocationPermission.denied) {
    throw LocationCaptureException(
      'Location permission denied. Allow location for BYOT in app settings.',
    );
  }
  if (perm == LocationPermission.deniedForever) {
    throw LocationCaptureException(
      'Location blocked for BYOT. Open Settings → Apps → BYOT → Permissions → Location → Allow.',
    );
  }

  try {
    final pos = await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.medium,
      timeLimit: timeout,
    );
    return LocationCaptureResult(
      latitude: pos.latitude,
      longitude: pos.longitude,
      accuracyMeters: pos.accuracy,
    );
  } catch (_) {
    final last = await Geolocator.getLastKnownPosition();
    if (last != null) {
      return LocationCaptureResult(
        latitude: last.latitude,
        longitude: last.longitude,
        accuracyMeters: last.accuracy,
        usedFallback: true,
        message: 'Using last known GPS fix (move outdoors for better accuracy).',
      );
    }
    if (allowFallback) {
      return const LocationCaptureResult(
        latitude: kDefaultLatitude,
        longitude: kDefaultLongitude,
        usedFallback: true,
        message: 'GPS unavailable — saved with approximate location. Stand outdoors and retry for exact GPS.',
      );
    }
    throw LocationCaptureException(
      'Could not get GPS. Go outdoors, wait a few seconds, and try again.',
    );
  }
}

String formatCoordinates(double lat, double lon, {double? accuracyMeters}) {
  final acc = accuracyMeters != null ? ' · accuracy ±${accuracyMeters.toStringAsFixed(0)} m' : '';
  return 'Latitude ${lat.toStringAsFixed(5)}, Longitude ${lon.toStringAsFixed(5)}$acc';
}
