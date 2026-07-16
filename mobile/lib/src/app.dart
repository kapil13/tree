import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'theme.dart';
import 'session.dart';
import 'screens/splash_screen.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'screens/tree_list_screen.dart';
import 'screens/add_tree_screen.dart';
import 'screens/tree_detail_screen.dart';
import 'screens/map_screen.dart';
import 'screens/assistant_screen.dart';
import 'screens/notifications_screen.dart';
import 'screens/bioacoustic_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/reports_screen.dart';
import 'screens/scaffold_with_nav_bar.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();

final _routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/',
    refreshListenable: sessionController,
    redirect: (context, state) {
      final loc = state.matchedLocation;
      final public = loc == '/' || loc == '/login';
      if (!sessionController.authenticated && !public) return '/login';
      if (sessionController.authenticated && loc == '/login') return '/home';
      return null;
    },
    routes: [
      GoRoute(path: '/', builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return ScaffoldWithNavBar(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(path: '/map', builder: (_, __) => const MapScreen()),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(path: '/assistant', builder: (_, __) => const AssistantScreen()),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(path: '/reports', builder: (_, __) => const ReportsScreen()),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
            ],
          ),
        ],
      ),
      GoRoute(path: '/trees', builder: (_, __) => const TreeListScreen()),
      GoRoute(path: '/trees/new', builder: (_, __) => const AddTreeScreen()),
      GoRoute(
        path: '/trees/:id',
        builder: (_, s) => TreeDetailScreen(id: s.pathParameters['id']!),
      ),
      GoRoute(path: '/bioacoustic', builder: (_, __) => const BioacousticScreen()),
      GoRoute(path: '/notifications', builder: (_, __) => const NotificationsScreen()),
    ],
  );
});

class ByotApp extends ConsumerWidget {
  const ByotApp({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(_routerProvider);
    return MaterialApp.router(
      title: 'Aranyix',
      debugShowCheckedModeBanner: false,
      theme: byotLightTheme,
      darkTheme: byotDarkTheme,
      routerConfig: router,
    );
  }
}
