import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';

import '../api/api_client.dart';

/// Device-level connectivity plus optional API reachability checks.
class NetworkStatus {
  NetworkStatus._();

  static Future<bool> hasDeviceNetwork() async {
    final results = await Connectivity().checkConnectivity();
    return results.any((r) => r != ConnectivityResult.none);
  }

  /// Lightweight ping to `{apiBase}/health` (no auth required).
  static Future<bool> isApiReachable() async {
    if (!await hasDeviceNetwork()) return false;
    try {
      final base = await ApiClient.loadBaseUrl();
      final dio = Dio(BaseOptions(
        baseUrl: base,
        connectTimeout: const Duration(seconds: 5),
        receiveTimeout: const Duration(seconds: 5),
      ));
      final response = await dio.get<Map<String, dynamic>>('/health');
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// True when the device has network and the API health endpoint responds.
  static Future<bool> isOnlineForSync() async {
    if (!await hasDeviceNetwork()) return false;
    return await isApiReachable();
  }
}
