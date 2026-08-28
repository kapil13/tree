import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../nav_access.dart';
import '../theme.dart';

/// Prominent home-screen tiles for register tree and bioacoustic.
class PrimaryFieldActions extends StatelessWidget {
  const PrimaryFieldActions({super.key, required this.user});

  final Map<String, dynamic>? user;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final canTree = canAddTrees(user);
    final canBio = canSeeBioacoustic(user);
    final canProjects = canSeeFieldProjectsCard(user);

    if (!canTree && !canBio && !canProjects) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (canTree)
          _PrimaryCard(
            icon: Icons.add_circle_rounded,
            iconColor: Colors.white,
            gradient: const LinearGradient(
              colors: [AranyixColors.heroGradientStart, AranyixColors.heroGradientEnd],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            title: l10n.registerTreePrimary,
            subtitle: l10n.registerTreePrimarySub,
            onTap: () => context.push('/trees/new'),
          ),
        if (canTree && (canBio || canProjects)) const SizedBox(height: 12),
        if (canBio || canProjects)
          Row(
            children: [
              if (canBio)
                Expanded(
                  child: _SecondaryTile(
                    icon: Icons.graphic_eq_rounded,
                    color: const Color(0xFF0E7490),
                    title: l10n.navBioacoustic,
                    subtitle: l10n.bioacousticTileSub,
                    onTap: () => context.push('/bioacoustic'),
                  ),
                ),
              if (canBio && canProjects) const SizedBox(width: 12),
              if (canProjects)
                Expanded(
                  child: _SecondaryTile(
                    icon: Icons.assignment_outlined,
                    color: AranyixColors.forest,
                    title: l10n.projects,
                    subtitle: l10n.projectsTileSub,
                    onTap: () => context.go('/projects'),
                  ),
                ),
            ],
          ),
      ],
    );
  }
}

class _PrimaryCard extends StatelessWidget {
  const _PrimaryCard({
    required this.icon,
    required this.iconColor,
    required this.gradient,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final Color iconColor;
  final Gradient gradient;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      borderRadius: BorderRadius.circular(AranyixRadii.card),
      elevation: 0,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AranyixRadii.card),
        child: Ink(
          decoration: BoxDecoration(
            gradient: gradient,
            borderRadius: BorderRadius.circular(AranyixRadii.card),
            boxShadow: AranyixShadows.soft,
          ),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.16),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(icon, color: iconColor, size: 30),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.3,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        subtitle,
                        style: TextStyle(color: Colors.white.withValues(alpha: 0.88), fontSize: 13.5, height: 1.35),
                      ),
                    ],
                  ),
                ),
                Icon(Icons.arrow_forward_rounded, color: Colors.white.withValues(alpha: 0.9)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SecondaryTile extends StatelessWidget {
  const _SecondaryTile({
    required this.icon,
    required this.color,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AranyixColors.surfaceContainer,
      borderRadius: BorderRadius.circular(AranyixRadii.card),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AranyixRadii.card),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AranyixRadii.card),
            border: Border.all(color: AranyixColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 22),
              ),
              const SizedBox(height: 12),
              Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
              const SizedBox(height: 2),
              Text(
                subtitle,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: AranyixColors.onSurfaceMuted, fontSize: 12, height: 1.3),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
