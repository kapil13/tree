import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../nav_access.dart';
import '../session.dart';

class AppShell extends ConsumerWidget {
  const AppShell({super.key, required this.child});

  final Widget child;

  static IconData _iconFor(String path, {required bool selected}) {
    switch (path) {
      case '/home':
        return selected ? Icons.home : Icons.home_outlined;
      case '/trees':
        return selected ? Icons.park : Icons.park_outlined;
      case '/map':
        return selected ? Icons.map : Icons.map_outlined;
      case '/notifications':
        return selected ? Icons.notifications : Icons.notifications_outlined;
      case '/monitoring':
        return selected ? Icons.monitor_heart : Icons.monitor_heart_outlined;
      case '/projects':
        return selected ? Icons.assignment : Icons.assignment_outlined;
      case '/profile':
        return selected ? Icons.person : Icons.person_outline;
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
      body: child,
      bottomNavigationBar: NavigationBar(
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
    );
  }
}
