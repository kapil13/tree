import 'package:flutter/material.dart';

/// Aranyix calm forest palette — Material Design 3.
abstract final class AranyixColors {
  static const forest = Color(0xFF166534);
  static const forestDark = Color(0xFF14532D);
  static const forestLight = Color(0xFFDCFCE7);
  static const forestMuted = Color(0xFF86EFAC);
  static const surface = Color(0xFFF8FAF8);
  static const surfaceContainer = Color(0xFFFFFFFF);
  static const onSurfaceMuted = Color(0xFF64748B);
  static const heroGradientStart = Color(0xFF166534);
  static const heroGradientEnd = Color(0xFF22C55E);
  static const warningContainer = Color(0xFFFFF7ED);
  static const warningOnContainer = Color(0xFF9A3412);
  static const warningBorder = Color(0xFFFDBA74);
}

abstract final class AranyixRadii {
  static const card = 20.0;
  static const button = 14.0;
  static const chip = 12.0;
}

ThemeData get byotLightTheme {
  final base = ColorScheme.fromSeed(
    seedColor: AranyixColors.forest,
    brightness: Brightness.light,
    surface: AranyixColors.surface,
  );

  return ThemeData(
    colorScheme: base.copyWith(
      primary: AranyixColors.forest,
      onPrimary: Colors.white,
      primaryContainer: AranyixColors.forestLight,
      onPrimaryContainer: AranyixColors.forestDark,
      surface: AranyixColors.surface,
      onSurface: const Color(0xFF0F172A),
      onSurfaceVariant: AranyixColors.onSurfaceMuted,
      errorContainer: AranyixColors.warningContainer,
      onErrorContainer: AranyixColors.warningOnContainer,
    ),
    useMaterial3: true,
    scaffoldBackgroundColor: AranyixColors.surface,
    textTheme: _textTheme,
    appBarTheme: const AppBarTheme(
      backgroundColor: AranyixColors.surface,
      foregroundColor: AranyixColors.forestDark,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        fontSize: 20,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.3,
        color: AranyixColors.forestDark,
      ),
    ),
    cardTheme: CardThemeData(
      color: AranyixColors.surfaceContainer,
      elevation: 0,
      shadowColor: Colors.black.withValues(alpha: 0.06),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AranyixRadii.card),
        side: BorderSide(color: Colors.black.withValues(alpha: 0.04)),
      ),
      margin: EdgeInsets.zero,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: AranyixColors.forest,
        foregroundColor: Colors.white,
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AranyixRadii.button),
        ),
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: AranyixColors.forest,
        side: BorderSide(color: AranyixColors.forest.withValues(alpha: 0.35)),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AranyixRadii.button),
        ),
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: AranyixColors.surfaceContainer,
      elevation: 0,
      height: 72,
      indicatorColor: AranyixColors.forestLight,
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return TextStyle(
          fontSize: 12,
          fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
          color: selected ? AranyixColors.forest : AranyixColors.onSurfaceMuted,
        );
      }),
      iconTheme: WidgetStateProperty.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return IconThemeData(
          color: selected ? AranyixColors.forest : AranyixColors.onSurfaceMuted,
          size: 24,
        );
      }),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0xFFF1F5F1),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AranyixRadii.card),
        borderSide: BorderSide.none,
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      hintStyle: const TextStyle(color: AranyixColors.onSurfaceMuted, fontSize: 15),
    ),
  );
}

const _textTheme = TextTheme(
  headlineLarge: TextStyle(
    fontSize: 48,
    fontWeight: FontWeight.w300,
    letterSpacing: -1.5,
    height: 1.05,
    color: Color(0xFF0F172A),
  ),
  headlineMedium: TextStyle(
    fontSize: 28,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.5,
    color: Color(0xFF0F172A),
  ),
  titleLarge: TextStyle(
    fontSize: 18,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.2,
    color: Color(0xFF0F172A),
  ),
  titleMedium: TextStyle(
    fontSize: 15,
    fontWeight: FontWeight.w600,
    color: Color(0xFF0F172A),
  ),
  bodyLarge: TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w400,
    height: 1.5,
    color: Color(0xFF334155),
  ),
  bodyMedium: TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    height: 1.45,
    color: Color(0xFF475569),
  ),
  labelLarge: TextStyle(
    fontSize: 13,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.2,
    color: Color(0xFF64748B),
  ),
);

ThemeData get byotDarkTheme => ThemeData(
      colorScheme: ColorScheme.fromSeed(
        seedColor: AranyixColors.forest,
        brightness: Brightness.dark,
      ),
      useMaterial3: true,
    );
