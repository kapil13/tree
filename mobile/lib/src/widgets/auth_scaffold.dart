import 'package:flutter/material.dart';

import '../theme.dart';

/// Shared auth layout — calm forest branding for login/signup flows.
class AuthScaffold extends StatelessWidget {
  const AuthScaffold({
    super.key,
    required this.title,
    required this.subtitle,
    required this.child,
    this.leading,
    this.stepLabel,
    this.stepProgress,
  });

  final String title;
  final String subtitle;
  final Widget child;
  final Widget? leading;
  final String? stepLabel;
  final double? stepProgress;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (leading != null)
              Align(alignment: Alignment.centerLeft, child: leading!),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text('🌳', style: TextStyle(fontSize: 40)),
                    const SizedBox(height: 8),
                    Text(
                      title,
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      subtitle,
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                            color: AranyixColors.onSurfaceMuted,
                          ),
                    ),
                    if (stepLabel != null) ...[
                      const SizedBox(height: 20),
                      Row(
                        children: [
                          Expanded(
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: stepProgress,
                                minHeight: 4,
                                backgroundColor: AranyixColors.forestLight,
                                color: AranyixColors.forest,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Text(
                            stepLabel!,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AranyixColors.onSurfaceMuted,
                            ),
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 28),
                    child,
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
