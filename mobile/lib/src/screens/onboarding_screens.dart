import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../theme.dart';
import '../widgets/auth_scaffold.dart';
import '../l10n/l10n_ext.dart';

/// Shown when professional signup awaits admin approval.
class OnboardingPendingScreen extends StatelessWidget {
  const OnboardingPendingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return AuthScaffold(
      title: l10n.applicationReceivedTitle,
      subtitle: l10n.onboardingPendingSubtitle,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AranyixColors.forestLight,
              borderRadius: BorderRadius.circular(AranyixRadii.card),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(l10n.whatHappensNext, style: const TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                Text(l10n.onboardingVerifyOrg),
                Text(l10n.onboardingApprovalEmail),
                Text(l10n.onboardingSignInDashboard),
              ],
            ),
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: () => context.go('/home'),
            child: Text(l10n.exploreByot),
          ),
          const SizedBox(height: 10),
          OutlinedButton(
            onPressed: () async {
              final uri = Uri.parse('https://aranyix.tech');
              if (await canLaunchUrl(uri)) {
                await launchUrl(uri, mode: LaunchMode.externalApplication);
              }
            },
            child: Text(l10n.visitWebsite),
          ),
        ],
      ),
    );
  }
}
