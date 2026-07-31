import 'package:flutter/foundation.dart';

/// Production API hosts allowed when custom bases are disabled.
const kProductionApiHosts = {'api.aranyix.tech'};

/// API base URL without trailing slash, e.g. https://api.aranyix.tech
const String kByotApiBase = String.fromEnvironment(
  'BYOT_API',
  defaultValue: 'https://api.aranyix.tech',
);

/// Whether the app may use a non-production / prefs-overridden API base.
bool get allowCustomApiBase =>
    const bool.fromEnvironment('BYOT_ALLOW_CUSTOM_API', defaultValue: false) ||
    kDebugMode;

String normalizeApiBaseUrl(String url) {
  return url.trim().replaceAll(RegExp(r'/+$'), '');
}

bool _isLocalhostHost(String host) {
  return host == 'localhost' ||
      host == '127.0.0.1' ||
      host == '10.0.2.2' ||
      host.endsWith('.local');
}

/// Throws [FormatException] if release and host not allowlisted
/// (https only for non-localhost).
void assertAllowedApiBaseUrl(String url) {
  final normalized = normalizeApiBaseUrl(url);
  final uri = Uri.tryParse(normalized);
  if (uri == null || !uri.hasScheme || uri.host.isEmpty) {
    throw FormatException('Invalid API base URL: $url');
  }

  final localhost = _isLocalhostHost(uri.host);
  if (!localhost && uri.scheme != 'https') {
    throw FormatException(
      'API base URL must use https (got ${uri.scheme}:// for ${uri.host})',
    );
  }
  if (localhost && uri.scheme != 'http' && uri.scheme != 'https') {
    throw FormatException('Unsupported API URL scheme: ${uri.scheme}');
  }

  if (!allowCustomApiBase && !kProductionApiHosts.contains(uri.host)) {
    throw FormatException('API host not allowlisted: ${uri.host}');
  }
}
