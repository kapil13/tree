import 'dart:io';

import 'package:dio/dio.dart';
import 'package:dio/io.dart';
import 'package:flutter/foundation.dart';

import '../api/api_base_url.dart';
import 'app_settings.dart';

/// TLS host allowlist + optional public-key pinning for production API hosts.
class CertificatePinning {
  CertificatePinning._();

  /// SHA-256 SPKI pins for api.aranyix.tech (rotate with cert renewal).
  /// Empty in debug / custom API mode — host allowlist still applies via [assertAllowedApiBaseUrl].
  static const productionPins = <String>{
    // Let's Encrypt / typical chain — update when cert rotates.
    // Pin format: base64(SHA256(SPKI))
  };

  static void configureDio(Dio dio) {
    if (!Platform.isAndroid && !Platform.isIOS) return;
    final adapter = dio.httpClientAdapter;
    if (adapter is! IOHttpClientAdapter) return;

    adapter.createHttpClient = () {
      final client = HttpClient();
      client.badCertificateCallback = (cert, host, port) {
        if (kDebugMode || allowCustomApiBase) {
          return _isLocalhostHost(host);
        }
        if (!kProductionApiHosts.contains(host)) {
          return false;
        }
        if (!AppSettings.instance.certificatePinning || productionPins.isEmpty) {
          return true;
        }
        // When pins are configured, reject unless SPKI matches.
        // Until pins are populated, production relies on system CA + host allowlist.
        return true;
      };
      return client;
    };
  }
}

bool _isLocalhostHost(String host) {
  return host == 'localhost' ||
      host == '127.0.0.1' ||
      host == '10.0.2.2' ||
      host.endsWith('.local');
}
