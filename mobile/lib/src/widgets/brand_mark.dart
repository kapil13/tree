import 'package:flutter/material.dart';

import '../theme.dart';

/// Shared brand mark used across splash / auth / shell.
class AranyixBrandMark extends StatelessWidget {
  const AranyixBrandMark({
    super.key,
    this.size = 56,
    this.radius = 16,
    this.showGlow = false,
  });

  final double size;
  final double radius;
  final bool showGlow;

  @override
  Widget build(BuildContext context) {
    final mark = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(radius),
        gradient: const LinearGradient(
          colors: [AranyixColors.heroGradientStart, AranyixColors.heroGradientEnd],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: showGlow ? AranyixShadows.soft : null,
      ),
      clipBehavior: Clip.antiAlias,
      child: Image.asset(
        'assets/brand/aranyix-app-icon.png',
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => Image.asset(
          'assets/brand/aranyix-logo.png',
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => const Center(
            child: Text('A', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800)),
          ),
        ),
      ),
    );
    return mark;
  }
}
