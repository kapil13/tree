import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../theme.dart';
import '../widgets/auth_scaffold.dart';

/// Shown when professional signup awaits admin approval.
class OnboardingPendingScreen extends StatelessWidget {
  const OnboardingPendingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      title: 'Application received',
      subtitle:
          'Your organization profile is under review. We will email you when your account is approved — usually within 1–2 business days.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AranyixColors.forestLight,
              borderRadius: BorderRadius.circular(AranyixRadii.card),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('What happens next', style: TextStyle(fontWeight: FontWeight.w600)),
                SizedBox(height: 8),
                Text('• Our team verifies your organization details'),
                Text('• You receive an approval email'),
                Text('• Open the app and sign in to access your dashboard'),
              ],
            ),
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: () => context.go('/home'),
            child: const Text('Explore BYOT features'),
          ),
          const SizedBox(height: 10),
          OutlinedButton(
            onPressed: () async {
              final uri = Uri.parse('https://aranyix.tech');
              if (await canLaunchUrl(uri)) {
                await launchUrl(uri, mode: LaunchMode.externalApplication);
              }
            },
            child: const Text('Visit aranyix.tech'),
          ),
        ],
      ),
    );
  }
}
