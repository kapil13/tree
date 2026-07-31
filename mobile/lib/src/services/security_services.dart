import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:local_auth/local_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/api_client.dart';
import 'app_settings.dart';

/// Registers the device for push and refreshes token on login.
/// Uses install-scoped token until FCM is wired (see docs/MOBILE_ANDROID_PHASES.md).
class PushRegistrationService {
  PushRegistrationService._();

  static final PushRegistrationService instance = PushRegistrationService._();
  static const _tokenKey = 'byot_push_install_token';

  final LocalAuthentication _localAuth = LocalAuthentication();

  Future<String> _installToken() async {
    final prefs = await SharedPreferences.getInstance();
    var token = prefs.getString(_tokenKey);
    if (token == null || token.isEmpty) {
      token = 'install:${DateTime.now().microsecondsSinceEpoch}';
      await prefs.setString(_tokenKey, token);
    }
    return token;
  }

  Future<void> registerIfEnabled(Future<ApiClient> Function() apiFactory) async {
    if (!AppSettings.instance.pushEnabled) return;
    try {
      final api = await apiFactory();
      final token = await _installToken();
      await api.registerDevice(
        pushToken: token,
        platform: Platform.isIOS ? 'ios' : 'android',
      );
    } catch (e) {
      if (kDebugMode) debugPrint('Push registration skipped: $e');
    }
  }

  Future<void> unregister(Future<ApiClient> Function() apiFactory) async {
    try {
      final api = await apiFactory();
      final token = await _installToken();
      await api.unregisterDevice(pushToken: token);
    } catch (_) {}
  }

  Future<bool> canUseBiometrics() async {
    try {
      return await _localAuth.canCheckBiometrics || await _localAuth.isDeviceSupported();
    } catch (_) {
      return false;
    }
  }

  Future<bool> authenticateBiometric({String reason = 'Unlock Aranyix'}) async {
    if (!AppSettings.instance.biometricUnlock) return true;
    try {
      return await _localAuth.authenticate(
        localizedReason: reason,
        options: const AuthenticationOptions(biometricOnly: false, stickyAuth: true),
      );
    } catch (_) {
      return false;
    }
  }
}

/// Optional screenshot guard via Android FLAG_SECURE.
class ScreenshotGuard {
  ScreenshotGuard._();

  static const _channel = MethodChannel('earth.byot.byot_mobile/security');

  static Future<void> apply(bool enabled) async {
    if (!Platform.isAndroid) return;
    try {
      await _channel.invokeMethod<void>('setScreenshotBlocked', enabled);
    } catch (e) {
      if (kDebugMode) debugPrint('Screenshot guard unavailable: $e');
    }
  }
}
