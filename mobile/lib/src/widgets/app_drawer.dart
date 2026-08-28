import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth_session.dart';
import '../nav_access.dart';
import '../nav_groups.dart';
import '../providers.dart';
import '../session.dart';
import '../theme.dart';

class AppDrawer extends ConsumerWidget {
  const AppDrawer({super.key, required this.currentLocation});

  final String currentLocation;

  String _label(AppLocalizations l10n, String key) {
    return switch (key) {
      'navDashboard' => l10n.navDashboard,
      'navSectionPlantation' => l10n.navSectionPlantation,
      'navSectionPlantationDesc' => l10n.navSectionPlantationDesc,
      'navSectionIntelligence' => l10n.navSectionIntelligence,
      'navSectionIntelligenceDesc' => l10n.navSectionIntelligenceDesc,
      'navSectionReports' => l10n.navSectionReports,
      'navSectionReportsDesc' => l10n.navSectionReportsDesc,
      'navSectionAccount' => l10n.navSectionAccount,
      'navBioacoustic' => l10n.navBioacoustic,
      'navAlerts' => l10n.navAlerts,
      'navReports' => l10n.navReports,
      'navAssistant' => l10n.navAssistant,
      'navCarbon' => l10n.navCarbon,
      'navCredits' => l10n.navCredits,
      'projects' => l10n.projects,
      'trees' => l10n.trees,
      'map' => l10n.map,
      'fieldOps' => l10n.fieldOps,
      'monitoring' => l10n.monitoring,
      'profile' => l10n.profile,
      _ => key,
    };
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (sessionController.authenticated && sessionController.user == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) => ensureSessionUser(ref));
    }
    final l10n = AppLocalizations.of(context)!;
    final userAsync = ref.watch(userProvider);
    final sessionUser = sessionController.user;
    final user = sessionUser ?? userAsync.valueOrNull;
    final groups = mobileNavGroupsFor(user);
    final name = user?['full_name'] as String? ?? l10n.appTitle;
    final email = user?['email'] as String? ?? '';
    final role = user?['role'] as String?;

    return Drawer(
      backgroundColor: AranyixColors.surfaceElevated,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [AranyixColors.heroGradientStart, AranyixColors.heroGradientEnd],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: Image.asset(
                          'assets/brand/aranyix-app-icon.png',
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => const Icon(Icons.forest, color: Colors.white),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          l10n.appTitle,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.4,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    name,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 16,
                    ),
                  ),
                  if (email.isNotEmpty)
                    Text(
                      email,
                      style: TextStyle(color: Colors.white.withValues(alpha: 0.82), fontSize: 13),
                    ),
                  if (role != null) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.14),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        role,
                        style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            Expanded(
              child: user == null && sessionController.authenticated
                  ? userAsync.when(
                      loading: () => const Center(child: CircularProgressIndicator()),
                      error: (_, __) => _DrawerEmptyState(
                          message: l10n.drawerLoadError,
                          onRetry: () => ref.invalidate(userProvider)),
                      data: (_) => const Center(child: CircularProgressIndicator()),
                    )
                  : groups.isEmpty
                      ? _DrawerEmptyState(
                          message: user == null ? l10n.drawerSignInRequired : l10n.drawerNoNavItems,
                          onRetry: user == null ? null : () => ref.invalidate(userProvider),
                        )
                      : ListView(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          children: [
                            for (final group in groups) ...[
                              if (!group.hideHeader && group.labelKey != null)
                                Padding(
                                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 6),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        _label(l10n, group.labelKey!),
                                        style: const TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                          color: AranyixColors.forestDark,
                                          letterSpacing: 0.2,
                                        ),
                                      ),
                                      if (group.descKey != null)
                                        Padding(
                                          padding: const EdgeInsets.only(top: 2),
                                          child: Text(
                                            _label(l10n, group.descKey!),
                                            style: const TextStyle(
                                              fontSize: 11,
                                              color: AranyixColors.onSurfaceMuted,
                                              height: 1.3,
                                            ),
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                              for (final item in group.items)
                                _DrawerTile(
                                  icon: item.icon,
                                  label: _label(l10n, item.labelKey),
                                  selected: mobileNavItemActive(currentLocation, item),
                                  highlight: item.route == '/bioacoustic' || item.route == '/trees',
                                  onTap: () {
                                    Navigator.pop(context);
                                    if (item.route == currentLocation) return;
                                    if (item.route == '/home' ||
                                        item.route == '/trees' ||
                                        item.route == '/map' ||
                                        item.route == '/notifications' ||
                                        item.route == '/monitoring' ||
                                        item.route == '/projects' ||
                                        item.route == '/profile') {
                                      context.go(item.route);
                                    } else {
                                      context.push(item.route);
                                    }
                                  },
                                ),
                            ],
                          ],
                        ),
            ),
            if (canAddTrees(user))
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                child: FilledButton.icon(
                  onPressed: () {
                    Navigator.pop(context);
                    context.push('/trees/new');
                  },
                  icon: const Icon(Icons.add_circle_outline),
                  label: Text(l10n.registerTreePrimary),
                ),
              ),
            if (canSeeBioacoustic(user))
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                child: OutlinedButton.icon(
                  onPressed: () {
                    Navigator.pop(context);
                    context.push('/bioacoustic');
                  },
                  icon: const Icon(Icons.graphic_eq),
                  label: Text(l10n.navBioacoustic),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _DrawerEmptyState extends StatelessWidget {
  const _DrawerEmptyState({required this.message, this.onRetry});

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(message, textAlign: TextAlign.center, style: const TextStyle(color: AranyixColors.onSurfaceMuted)),
            if (onRetry != null) ...[
              const SizedBox(height: 12),
              OutlinedButton(onPressed: onRetry, child: Text(AppLocalizations.of(context)!.retry)),
            ],
          ],
        ),
      ),
    );
  }
}

class _DrawerTile extends StatelessWidget {
  const _DrawerTile({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
    this.highlight = false,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    final bg = selected
        ? AranyixColors.forestLight
        : highlight
            ? AranyixColors.surfaceTint
            : Colors.transparent;
    final fg = selected ? AranyixColors.forestDark : AranyixColors.onSurface;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 1),
      child: Material(
        color: bg,
        borderRadius: BorderRadius.circular(12),
        child: ListTile(
          dense: true,
          leading: Icon(icon, color: selected ? AranyixColors.forest : AranyixColors.onSurfaceMuted, size: 22),
          title: Text(
            label,
            style: TextStyle(
              fontWeight: selected ? FontWeight.w700 : FontWeight.w600,
              fontSize: 14,
              color: fg,
            ),
          ),
          trailing: highlight && !selected
              ? Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(color: AranyixColors.forest, shape: BoxShape.circle),
                )
              : null,
          onTap: onTap,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
    );
  }
}
