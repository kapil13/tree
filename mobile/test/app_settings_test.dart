import 'package:byot_mobile/src/services/app_settings.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('theme mode persists across load', () async {
    final settings = AppSettings.instance;
    await settings.setThemeMode(ThemeMode.dark);
    await settings.load();
    expect(settings.themeMode, ThemeMode.dark);

    await settings.setThemeMode(ThemeMode.system);
    await settings.load();
    expect(settings.themeMode, ThemeMode.system);
  });
}
