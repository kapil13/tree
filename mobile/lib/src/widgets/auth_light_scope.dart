import 'package:flutter/material.dart';

import '../theme.dart';

/// Auth/marketing screens are designed for the light forest palette.
/// Wraps children so system dark mode does not produce low-contrast text on cards.
class AuthLightScope extends StatelessWidget {
  const AuthLightScope({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: byotLightTheme,
      child: ColoredBox(
        color: AranyixColors.surface,
        child: child,
      ),
    );
  }
}
