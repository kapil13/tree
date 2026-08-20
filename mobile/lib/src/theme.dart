import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

/// Aranyix design system — calm forest product UI.
/// Inspired by patterns from top field/fintech/productivity apps:
/// clear hierarchy, soft surfaces, 48px+ targets, brand-first auth.
abstract final class AranyixColors {
  static const forest = Color(0xFF0F6B3E);
  static const forestDark = Color(0xFF0B3D2E);
  static const forestMid = Color(0xFF15803D);
  static const forestLight = Color(0xFFE8F5EC);
  static const forestMuted = Color(0xFF6FCF97);
  static const leaf = Color(0xFF8FDB6E);
  static const surface = Color(0xFFF4F7F4);
  static const surfaceElevated = Color(0xFFFFFFFF);
  static const surfaceContainer = Color(0xFFFFFFFF);
  static const surfaceTint = Color(0xFFEEF5F0);
  static const onSurface = Color(0xFF122018);
  static const onSurfaceMuted = Color(0xFF5B6B61);
  static const border = Color(0xFFD7E3DA);
  static const borderStrong = Color(0xFFB8CDBF);
  static const heroGradientStart = Color(0xFF0B3D2E);
  static const heroGradientEnd = Color(0xFF1B8A4C);
  static const warningContainer = Color(0xFFFFF4E8);
  static const warningOnContainer = Color(0xFF9A3412);
  static const warningBorder = Color(0xFFF0C38A);
  static const danger = Color(0xFFB91C1C);
  static const dangerContainer = Color(0xFFFEF2F2);
}

abstract final class AranyixRadii {
  static const card = 22.0;
  static const button = 16.0;
  static const chip = 14.0;
  static const input = 16.0;
  static const sheet = 28.0;
}

abstract final class AranyixShadows {
  static List<BoxShadow> get soft => [
        BoxShadow(
          color: AranyixColors.forestDark.withValues(alpha: 0.06),
          blurRadius: 24,
          offset: const Offset(0, 10),
        ),
      ];

  static List<BoxShadow> get card => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.04),
          blurRadius: 16,
          offset: const Offset(0, 6),
        ),
      ];
}

ThemeData get byotLightTheme {
  final textTheme = _buildTextTheme();
  final scheme = ColorScheme.fromSeed(
    seedColor: AranyixColors.forest,
    brightness: Brightness.light,
    surface: AranyixColors.surface,
  ).copyWith(
    primary: AranyixColors.forest,
    onPrimary: Colors.white,
    primaryContainer: AranyixColors.forestLight,
    onPrimaryContainer: AranyixColors.forestDark,
    surface: AranyixColors.surface,
    onSurface: AranyixColors.onSurface,
    onSurfaceVariant: AranyixColors.onSurfaceMuted,
    outline: AranyixColors.border,
    error: AranyixColors.danger,
    errorContainer: AranyixColors.dangerContainer,
    onErrorContainer: AranyixColors.danger,
  );

  return ThemeData(
    colorScheme: scheme,
    useMaterial3: true,
    scaffoldBackgroundColor: AranyixColors.surface,
    textTheme: textTheme,
    primaryTextTheme: textTheme,
    dividerColor: AranyixColors.border,
    splashFactory: InkSparkle.splashFactory,
    appBarTheme: AppBarTheme(
      backgroundColor: AranyixColors.surface,
      foregroundColor: AranyixColors.forestDark,
      elevation: 0,
      scrolledUnderElevation: 0.5,
      centerTitle: false,
      systemOverlayStyle: SystemUiOverlayStyle.dark,
      titleTextStyle: textTheme.titleLarge?.copyWith(
        fontSize: 20,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.3,
        color: AranyixColors.forestDark,
      ),
    ),
    cardTheme: CardThemeData(
      color: AranyixColors.surfaceElevated,
      elevation: 0,
      shadowColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AranyixRadii.card),
        side: const BorderSide(color: AranyixColors.border),
      ),
      margin: EdgeInsets.zero,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: AranyixColors.forest,
        foregroundColor: Colors.white,
        disabledBackgroundColor: AranyixColors.forest.withValues(alpha: 0.35),
        elevation: 0,
        minimumSize: const Size.fromHeight(54),
        padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AranyixRadii.button),
        ),
        textStyle: textTheme.labelLarge?.copyWith(
          fontWeight: FontWeight.w700,
          fontSize: 16,
          letterSpacing: -0.1,
          color: Colors.white,
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: AranyixColors.forestDark,
        backgroundColor: AranyixColors.surfaceElevated,
        side: const BorderSide(color: AranyixColors.borderStrong),
        minimumSize: const Size.fromHeight(54),
        padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AranyixRadii.button),
        ),
        textStyle: textTheme.labelLarge?.copyWith(
          fontWeight: FontWeight.w700,
          fontSize: 16,
          letterSpacing: -0.1,
        ),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: AranyixColors.forest,
        textStyle: textTheme.labelLarge?.copyWith(
          fontWeight: FontWeight.w700,
          fontSize: 14,
        ),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: AranyixColors.surfaceElevated,
      elevation: 0,
      height: 70,
      indicatorColor: AranyixColors.forestLight,
      labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return TextStyle(
          fontSize: 11.5,
          fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
          letterSpacing: -0.1,
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
      fillColor: AranyixColors.surfaceElevated,
      hoverColor: AranyixColors.surfaceElevated,
      labelStyle: const TextStyle(
        color: AranyixColors.onSurfaceMuted,
        fontWeight: FontWeight.w500,
      ),
      floatingLabelStyle: const TextStyle(
        color: AranyixColors.forest,
        fontWeight: FontWeight.w600,
      ),
      hintStyle: const TextStyle(color: AranyixColors.onSurfaceMuted, fontSize: 15),
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AranyixRadii.input),
        borderSide: const BorderSide(color: AranyixColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AranyixRadii.input),
        borderSide: const BorderSide(color: AranyixColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AranyixRadii.input),
        borderSide: const BorderSide(color: AranyixColors.forest, width: 1.6),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AranyixRadii.input),
        borderSide: const BorderSide(color: AranyixColors.danger),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AranyixRadii.input),
        borderSide: const BorderSide(color: AranyixColors.danger, width: 1.6),
      ),
    ),
    checkboxTheme: CheckboxThemeData(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
      fillColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) return AranyixColors.forest;
        return Colors.transparent;
      }),
    ),
    progressIndicatorTheme: const ProgressIndicatorThemeData(
      color: AranyixColors.forest,
      linearTrackColor: AranyixColors.forestLight,
    ),
  );
}

TextTheme _buildTextTheme() {
  final base = GoogleFonts.plusJakartaSansTextTheme();
  return base.copyWith(
    headlineLarge: GoogleFonts.plusJakartaSans(
      fontSize: 40,
      fontWeight: FontWeight.w700,
      letterSpacing: -1.2,
      height: 1.05,
      color: AranyixColors.onSurface,
    ),
    headlineMedium: GoogleFonts.plusJakartaSans(
      fontSize: 28,
      fontWeight: FontWeight.w700,
      letterSpacing: -0.6,
      height: 1.15,
      color: AranyixColors.onSurface,
    ),
    headlineSmall: GoogleFonts.plusJakartaSans(
      fontSize: 22,
      fontWeight: FontWeight.w700,
      letterSpacing: -0.4,
      color: AranyixColors.onSurface,
    ),
    titleLarge: GoogleFonts.plusJakartaSans(
      fontSize: 18,
      fontWeight: FontWeight.w700,
      letterSpacing: -0.2,
      color: AranyixColors.onSurface,
    ),
    titleMedium: GoogleFonts.plusJakartaSans(
      fontSize: 15,
      fontWeight: FontWeight.w700,
      letterSpacing: -0.1,
      color: AranyixColors.onSurface,
    ),
    bodyLarge: GoogleFonts.plusJakartaSans(
      fontSize: 16,
      fontWeight: FontWeight.w400,
      height: 1.5,
      color: const Color(0xFF334155),
    ),
    bodyMedium: GoogleFonts.plusJakartaSans(
      fontSize: 14,
      fontWeight: FontWeight.w400,
      height: 1.45,
      color: AranyixColors.onSurfaceMuted,
    ),
    bodySmall: GoogleFonts.plusJakartaSans(
      fontSize: 12,
      fontWeight: FontWeight.w500,
      height: 1.35,
      color: AranyixColors.onSurfaceMuted,
    ),
    labelLarge: GoogleFonts.plusJakartaSans(
      fontSize: 13,
      fontWeight: FontWeight.w700,
      letterSpacing: 0.1,
      color: AranyixColors.onSurfaceMuted,
    ),
  );
}

/// Product uses a refined light theme for field readability.
ThemeData get byotDarkTheme => byotLightTheme;
