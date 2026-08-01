import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Persists optional login convenience credentials for "Remember me".
///
/// Email lives in SharedPreferences; password only in secure storage when
/// the user explicitly opts in. Tokens remain the source of session auth.
class LoginRemember {
  LoginRemember._();

  static const _prefsRememberKey = 'aranyix_login_remember';
  static const _prefsEmailKey = 'aranyix_login_email';
  static const _securePasswordKey = 'aranyix_login_password';

  static const FlutterSecureStorage _secure = FlutterSecureStorage(
    // ignore: deprecated_member_use — match ApiClient Android options
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  static Future<({bool remember, String email, String password})> load() async {
    final prefs = await SharedPreferences.getInstance();
    final remember = prefs.getBool(_prefsRememberKey) ?? true;
    final email = prefs.getString(_prefsEmailKey) ?? '';
    final password = remember ? (await _secure.read(key: _securePasswordKey) ?? '') : '';
    return (remember: remember, email: email, password: password);
  }

  static Future<void> save({
    required bool remember,
    required String email,
    required String password,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_prefsRememberKey, remember);
    if (!remember) {
      await prefs.remove(_prefsEmailKey);
      await _secure.delete(key: _securePasswordKey);
      return;
    }
    await prefs.setString(_prefsEmailKey, email.trim());
    if (password.isEmpty) {
      await _secure.delete(key: _securePasswordKey);
    } else {
      await _secure.write(key: _securePasswordKey, value: password);
    }
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_prefsRememberKey);
    await prefs.remove(_prefsEmailKey);
    await _secure.delete(key: _securePasswordKey);
  }
}
