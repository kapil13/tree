import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../nav_access.dart';
import '../session.dart';
import '../theme.dart';

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
    final user = sessionController.user;
    final location = GoRouterState.of(context).matchedLocation;

    final destinations = navDestinationsFor(user);

    final selectedIndex = destinations.indexWhere((d) => location.startsWith(d.path));
    final currentIndex = selectedIndex < 0 ? 0 : selectedIndex;

    return Scaffold(
      backgroundColor: AranyixColors.surface,
      body: child,
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
                label: d.label,
              ),
          ],
        ),
      ),
    );
  }
}
