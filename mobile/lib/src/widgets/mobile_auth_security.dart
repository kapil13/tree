import 'package:flutter/material.dart';

import '../theme.dart';

/// Compact replacement for the web Turnstile block on native auth screens.
class MobileAuthSecurityNote extends StatelessWidget {
  const MobileAuthSecurityNote({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AranyixColors.forestLight,
        borderRadius: BorderRadius.circular(AranyixRadii.chip),
        border: Border.all(color: AranyixColors.forestMuted.withValues(alpha: 0.25)),
      ),
      child: Row(
        children: [
          Icon(Icons.verified_user_outlined, size: 18, color: AranyixColors.forest.withValues(alpha: 0.9)),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Secured by the Aranyix app — no web captcha needed on mobile.',
              style: TextStyle(
                fontSize: 12,
                height: 1.35,
                fontWeight: FontWeight.w600,
                color: AranyixColors.forestDark.withValues(alpha: 0.92),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
