import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../nav_access.dart';
import '../theme.dart';

/// Bottom sheet hub for primary field actions (register tree, bioacoustic).
Future<void> showAddActionSheet(BuildContext context, {Map<String, dynamic>? user}) {
  final l10n = AppLocalizations.of(context)!;
  final canTree = canAddTrees(user);
  final canBio = canSeeBioacoustic(user);

  return showModalBottomSheet<void>(
    context: context,
    backgroundColor: AranyixColors.surfaceContainer,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(AranyixRadii.sheet)),
    ),
    builder: (ctx) {
      return SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AranyixColors.border,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                l10n.addActionSheetTitle,
                style: Theme.of(ctx).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 4),
              Text(
                l10n.addActionSheetSubtitle,
                style: Theme.of(ctx).textTheme.bodyMedium?.copyWith(color: AranyixColors.onSurfaceMuted),
              ),
              const SizedBox(height: 20),
              if (canTree)
                _ActionTile(
                  icon: Icons.park_rounded,
                  color: AranyixColors.forest,
                  title: l10n.registerTreePrimary,
                  subtitle: l10n.registerTreePrimarySub,
                  onTap: () {
                    Navigator.pop(ctx);
                    context.push('/trees/new');
                  },
                ),
              if (canBio) ...[
                if (canTree) const SizedBox(height: 10),
                _ActionTile(
                  icon: Icons.graphic_eq_rounded,
                  color: const Color(0xFF0E7490),
                  title: l10n.navBioacoustic,
                  subtitle: l10n.bioacousticActionSub,
                  onTap: () {
                    Navigator.pop(ctx);
                    context.push('/bioacoustic');
                  },
                ),
              ],
              if (!canTree && !canBio)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Text(
                    l10n.addActionSheetEmpty,
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: AranyixColors.onSurfaceMuted),
                  ),
                ),
            ],
          ),
        ),
      );
    },
  );
}

class _ActionTile extends StatelessWidget {
  const _ActionTile({
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
      color: AranyixColors.surfaceTint,
      borderRadius: BorderRadius.circular(AranyixRadii.card),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AranyixRadii.card),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(icon, color: color, size: 26),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                    const SizedBox(height: 2),
                    Text(subtitle, style: const TextStyle(color: AranyixColors.onSurfaceMuted, fontSize: 13)),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: AranyixColors.onSurfaceMuted),
            ],
          ),
        ),
      ),
    );
  }
}
