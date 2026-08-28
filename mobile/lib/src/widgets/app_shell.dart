import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../nav_access.dart';
import '../providers.dart';
import '../nav_groups.dart';
import '../auth_session.dart';
import '../session.dart';
import '../theme.dart';
import 'app_drawer.dart';
import 'shell_scaffold.dart';

String navDestinationLabel(AppLocalizations l10n, String labelKey) {
  return switch (labelKey) {
    'home' => l10n.home,
    'trees' => l10n.trees,
    'map' => l10n.map,
    'monitoring' => l10n.monitoring,
    'projects' => l10n.projects,
    'profile' => l10n.profile,
    'navAlerts' => l10n.navAlerts,
    _ => labelKey,
  };
}

class AppShell extends ConsumerWidget {
  const AppShell({super.key, required this.child});

  final Widget child;

  static IconData _iconFor(String path, {required bool selected}) {
    switch (path) {
      case '/home':
        return selected ? Icons.home_rounded : Icons.home_outlined;
      case '/trees':
        return selected ? Icons.park_rounded : Icons.park_outlined;
      case '/map':
        return selected ? Icons.map_rounded : Icons.map_outlined;
      case '/notifications':
        return selected ? Icons.notifications_rounded : Icons.notifications_outlined;
      case '/monitoring':
        return selected ? Icons.monitor_heart_rounded : Icons.monitor_heart_outlined;
      case '/projects':
        return selected ? Icons.assignment_rounded : Icons.assignment_outlined;
      case '/profile':
        return selected ? Icons.person_rounded : Icons.person_outline;
      default:
        return selected ? Icons.circle : Icons.circle_outlined;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userAsync = ref.watch(userProvider);
    final user = sessionController.user ?? userAsync.valueOrNull;
    if (sessionController.authenticated && user == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) => ensureSessionUser(ref));
    }
    final location = GoRouterState.of(context).matchedLocation;
    final l10n = AppLocalizations.of(context)!;

    final destinations = navDestinationsFor(user);
    final showFab = canAddTrees(user) && showFieldFabOnRoute(location);

    final selectedIndex = destinations.indexWhere((d) => location.startsWith(d.path));
    final currentIndex = selectedIndex < 0 ? 0 : selectedIndex;

    return Scaffold(
      backgroundColor: AranyixColors.surface,
      drawer: AppDrawer(currentLocation: location),
      body: child,
      floatingActionButton: showFab ? ShellRegisterFab(location: location) : null,
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: AranyixColors.surfaceElevated,
          border: Border(top: BorderSide(color: AranyixColors.border)),
        ),
        child: NavigationBar(
          selectedIndex: currentIndex.clamp(0, destinations.length - 1),
          onDestinationSelected: (index) {
            final dest = destinations[index];
            if (dest.path != location) context.go(dest.path);
          },
          destinations: [
            for (final d in destinations)
              NavigationDestination(
                icon: Icon(_iconFor(d.path, selected: false)),
                selectedIcon: Icon(_iconFor(d.path, selected: true)),
                label: navDestinationLabel(l10n, d.labelKey),
              ),
          ],
        ),
      ),
    );
  }
}
