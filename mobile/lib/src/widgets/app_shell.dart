import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../nav_access.dart';
import '../session.dart';
import '../theme.dart';

class AppShell extends ConsumerWidget {
  const AppShell({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = sessionController.user;
    final location = GoRouterState.of(context).matchedLocation;

    final destinations = <_NavDestination>[
      const _NavDestination('/home', Icons.home_outlined, Icons.home, 'Home'),
      if (canSeeProjects(user))
        const _NavDestination('/projects', Icons.assignment_outlined, Icons.assignment, 'Projects'),
      const _NavDestination('/trees', Icons.park_outlined, Icons.park, 'Trees'),
      const _NavDestination('/profile', Icons.person_outline, Icons.person, 'Profile'),
    ];

    final selectedIndex = destinations.indexWhere((d) => location.startsWith(d.path));
    final currentIndex = selectedIndex < 0 ? 0 : selectedIndex;

    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: currentIndex,
        onDestinationSelected: (index) {
          final dest = destinations[index];
          if (dest.path != location) context.go(dest.path);
        },
        destinations: [
          for (final d in destinations)
            NavigationDestination(
              icon: Icon(d.icon),
              selectedIcon: Icon(d.selectedIcon),
              label: d.label,
            ),
        ],
      ),
    );
  }
}

class _NavDestination {
  const _NavDestination(this.path, this.icon, this.selectedIcon, this.label);

  final String path;
  final IconData icon;
  final IconData selectedIcon;
  final String label;
}
