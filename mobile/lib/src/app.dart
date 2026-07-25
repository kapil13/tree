import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'route_access.dart';
import 'session.dart';
import 'theme.dart';
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
import 'screens/projects_list_screen.dart';
import 'screens/project_detail_screen.dart';
import 'screens/profile_screen.dart';
import 'widgets/app_shell.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

final _routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/',
    refreshListenable: sessionController,
    redirect: (context, state) {
      final loc = state.matchedLocation;
      final public = loc == '/' || loc == '/login' || loc == '/auth';

      if (!sessionController.authenticated && !public) {
        final invite = state.uri.queryParameters['invite'];
        if (invite != null) return '/login?invite=$invite';
        return '/login';
      }

      if (sessionController.authenticated && loc == '/login') {
        return '/home';
      }

      if (loc == '/auth') {
        final invite = state.uri.queryParameters['invite'];
        if (invite != null) return '/login?invite=$invite';
        return '/login';
      }

      final user = sessionController.user;
      if (sessionController.authenticated && user != null && !canAccessPath(user, loc)) {
        return '/home';
      }

      return null;
    },
    routes: [
      GoRoute(path: '/', builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(
        path: '/auth',
        redirect: (_, state) {
          final invite = state.uri.queryParameters['invite'];
          if (invite != null) return '/login?invite=$invite';
          return '/login';
        },
      ),
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (_, __, child) => AppShell(child: child),
        routes: [
          GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
          GoRoute(path: '/trees', builder: (_, __) => const TreeListScreen()),
          GoRoute(path: '/projects', builder: (_, __) => const ProjectsListScreen()),
          GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
        ],
      ),
      GoRoute(
        path: '/trees/new',
        builder: (_, state) => AddTreeScreen(
          projectId: state.uri.queryParameters['project'],
          workAreaId: state.uri.queryParameters['work_area'],
        ),
      ),
      GoRoute(
        path: '/projects/:id',
        builder: (_, s) => ProjectDetailScreen(projectId: s.pathParameters['id']!),
      ),
      GoRoute(
        path: '/trees/:id',
        builder: (_, s) => TreeDetailScreen(id: s.pathParameters['id']!),
      ),
      GoRoute(path: '/map', builder: (_, __) => const MapScreen()),
      GoRoute(path: '/assistant', builder: (_, __) => const AssistantScreen()),
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
