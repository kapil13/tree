import 'dart:io';

import 'package:dio/dio.dart';
import 'package:dio/io.dart';
import 'package:flutter/foundation.dart';

import '../api/api_base_url.dart';
import 'app_settings.dart';
import 'spki_pin.dart';

/// TLS host allowlist + SPKI public-key pinning for production API hosts.
class CertificatePinning {
  CertificatePinning._();

  /// SHA-256 SPKI pins for api.aranyix.tech (rotate when certificates renew).
  /// Generate: openssl s_client -servername api.aranyix.tech -connect api.aranyix.tech:443 \
  ///   | openssl x509 -pubkey -noout | openssl pkey -pubin -outform der \
  ///   | openssl dgst -sha256 -binary | openssl enc -base64
  static const productionPins = <String>{
    // Leaf — api.aranyix.tech (Mar 2026)
    '+w3nshcsLZg8wF9HanIqtlRHbMCpKRCITuzlQ3QUwoE=',
    // Let's Encrypt intermediate / backup chain pins
    's/tdAOmUzd8syaTuqfgGvFcn6DzA5Cmb+Vby1ST+U3Y=',
    'sCkq5UWXjg+7mKu9lMhhYF5bGLsy7VI/UNW3tccdR7w=',
    'diGVwiVYbubAI3RW4hB9xU8e/CH2GnkuvVFZE8zmgzI=',
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
        if (!kReleaseMode || !AppSettings.instance.certificatePinning) {
          return true;
        }
        return certificateMatchesAnyPin(cert, productionPins);
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
