import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// User preferences for locale, security, and feature toggles.
class AppSettings extends ChangeNotifier {
  AppSettings._();

  static const _localeKey = 'byot_locale';
  static const _biometricKey = 'byot_biometric_unlock';
  static const _screenshotGuardKey = 'byot_screenshot_guard';
  static const _certPinningKey = 'byot_cert_pinning';
  static const _analyticsKey = 'byot_analytics_enabled';
  static const _pushKey = 'byot_push_enabled';

  static final AppSettings instance = AppSettings._();

  Locale? _locale;
  bool _biometricUnlock = false;
  bool _screenshotGuard = false;
  bool _certificatePinning = true;
  bool _analyticsEnabled = true;
  bool _pushEnabled = true;
  bool _loaded = false;

  Locale? get locale => _locale;
  bool get biometricUnlock => _biometricUnlock;
  bool get screenshotGuard => _screenshotGuard;
  bool get certificatePinning => _certificatePinning;
  bool get analyticsEnabled => _analyticsEnabled;
  bool get pushEnabled => _pushEnabled;
  bool get loaded => _loaded;

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final code = prefs.getString(_localeKey);
    _locale = code == null ? null : Locale(code);
    _biometricUnlock = prefs.getBool(_biometricKey) ?? false;
    _screenshotGuard = prefs.getBool(_screenshotGuardKey) ?? false;
    _certificatePinning = prefs.getBool(_certPinningKey) ?? true;
    _analyticsEnabled = prefs.getBool(_analyticsKey) ?? true;
    _pushEnabled = prefs.getBool(_pushKey) ?? true;
    _loaded = true;
    notifyListeners();
  }

  Future<void> setLocale(Locale? locale) async {
    _locale = locale;
    final prefs = await SharedPreferences.getInstance();
    if (locale == null) {
      await prefs.remove(_localeKey);
    } else {
      await prefs.setString(_localeKey, locale.languageCode);
    }
    notifyListeners();
  }

  Future<void> setBiometricUnlock(bool value) async {
    _biometricUnlock = value;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_biometricKey, value);
    notifyListeners();
  }

  Future<void> setScreenshotGuard(bool value) async {
    _screenshotGuard = value;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_screenshotGuardKey, value);
    notifyListeners();
  }

  Future<void> setCertificatePinning(bool value) async {
    _certificatePinning = value;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_certPinningKey, value);
    notifyListeners();
  }

  Future<void> setAnalyticsEnabled(bool value) async {
    _analyticsEnabled = value;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_analyticsKey, value);
    notifyListeners();
  }

  Future<void> setPushEnabled(bool value) async {
    _pushEnabled = value;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_pushKey, value);
    notifyListeners();
  }
}
