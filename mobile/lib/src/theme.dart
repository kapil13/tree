import 'package:flutter/material.dart';

const _forest = Color(0xFF15803D);
const _forestLight = Color(0xFFDCFCE7);

ThemeData get byotLightTheme => ThemeData(
      colorScheme: ColorScheme.fromSeed(seedColor: _forest, brightness: Brightness.light),
      useMaterial3: true,
      scaffoldBackgroundColor: const Color(0xFFFAFAF9),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        foregroundColor: Color(0xFF15803D),
        elevation: 0.5,
      ),
      cardTheme: CardThemeData(
        color: Colors.white,
        elevation: 0.5,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: _forest,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      ),
    );

ThemeData get byotDarkTheme => ThemeData(
      colorScheme: ColorScheme.fromSeed(seedColor: _forest, brightness: Brightness.dark),
      useMaterial3: true,
    );
