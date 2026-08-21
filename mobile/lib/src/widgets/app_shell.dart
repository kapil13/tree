import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../nav_access.dart';
import '../session.dart';
import '../theme.dart';
import 'app_drawer.dart';
import 'app_shell_scope.dart';

class AppShell extends ConsumerStatefulWidget {
  const AppShell({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<AppShell> createState() => _AppShellState();
}

class _AppShellState extends ConsumerState<AppShell> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();

  void _openDrawer() => _scaffoldKey.currentState?.openDrawer();

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
      case '/bioacoustic':
        return selected ? Icons.graphic_eq_rounded : Icons.graphic_eq_outlined;
      case kMoreNavPath:
        return selected ? Icons.apps_rounded : Icons.apps_outlined;
      default:
        return selected ? Icons.circle : Icons.circle_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = sessionController.user;
    final location = GoRouterState.of(context).matchedLocation;
    final destinations = navDestinationsFor(user);
    final currentIndex = footerSelectedIndex(location, user);

    return AppShellScope(
      openDrawer: _openDrawer,
      child: Scaffold(
        key: _scaffoldKey,
        backgroundColor: AranyixColors.surface,
        drawer: AppDrawer(onNavigate: () => Navigator.of(context).pop()),
        body: widget.child,
        bottomNavigationBar: Container(
          decoration: const BoxDecoration(
            color: AranyixColors.surfaceElevated,
            border: Border(top: BorderSide(color: AranyixColors.border)),
          ),
          child: NavigationBar(
            selectedIndex: currentIndex.clamp(0, destinations.length - 1),
            onDestinationSelected: (index) {
              final dest = destinations[index];
              if (dest.path == kMoreNavPath) {
                _openDrawer();
                return;
              }
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
      ),
    );
  }
}
