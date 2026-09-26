import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Persists optional login email for "Remember me".
///
/// Passwords are never stored — tokens remain the source of session auth.
class LoginRemember {
  LoginRemember._();

  static const _prefsRememberKey = 'aranyix_login_remember';
  static const _prefsEmailKey = 'aranyix_login_email';
  static const _legacySecurePasswordKey = 'aranyix_login_password';

  static const FlutterSecureStorage _secure = FlutterSecureStorage(
    // ignore: deprecated_member_use — match ApiClient Android options
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  static Future<({bool remember, String email})> load() async {
    final prefs = await SharedPreferences.getInstance();
    final remember = prefs.getBool(_prefsRememberKey) ?? true;
    final email = prefs.getString(_prefsEmailKey) ?? '';
    return (remember: remember, email: email);
  }

  static Future<void> save({
    required bool remember,
    required String email,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_prefsRememberKey, remember);
    await _secure.delete(key: _legacySecurePasswordKey);
    if (!remember) {
      await prefs.remove(_prefsEmailKey);
      return;
    }
    await prefs.setString(_prefsEmailKey, email.trim());
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_prefsRememberKey);
    await prefs.remove(_prefsEmailKey);
    await _secure.delete(key: _legacySecurePasswordKey);
  }
}
