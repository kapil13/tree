import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

/// FCM push token provider. Enabled via `--dart-define=BYOT_FCM_ENABLED=true`
/// with `android/app/google-services.json` present at build time.
class FirebasePushService {
  FirebasePushService._();

  static bool _initialized = false;

  static const bool fcmEnabled = bool.fromEnvironment(
    'BYOT_FCM_ENABLED',
    defaultValue: false,
  );

  static bool get isConfigured => fcmEnabled && _initialized;

  static Future<void> initialize() async {
    if (!fcmEnabled || _initialized) return;
    try {
      await Firebase.initializeApp();
      _initialized = true;
      if (kDebugMode) {
        debugPrint('FirebasePushService: initialized');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('FirebasePushService: init skipped ($e)');
      }
    }
  }

  static Future<String?> getToken() async {
    if (!isConfigured) return null;
    try {
      final messaging = FirebaseMessaging.instance;
      await messaging.requestPermission();
      return await messaging.getToken();
    } catch (e) {
      if (kDebugMode) {
        debugPrint('FirebasePushService: token unavailable ($e)');
      }
      return null;
    }
  }

  /// Background handler must be a top-level function when registered.
  @pragma('vm:entry-point')
  static Future<void> onBackgroundMessage(RemoteMessage message) async {
    if (kDebugMode) {
      debugPrint('FirebasePushService: background message ${message.messageId}');
    }
  }

  static Future<void> registerBackgroundHandler() async {
    if (!fcmEnabled) return;
    FirebaseMessaging.onBackgroundMessage(onBackgroundMessage);
  }
}
