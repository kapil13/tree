import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

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
import 'screens/profile_screen.dart';

final _routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(path: '/', builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
      GoRoute(path: '/trees', builder: (_, __) => const TreeListScreen()),
      GoRoute(path: '/trees/new', builder: (_, __) => const AddTreeScreen()),
      GoRoute(
        path: '/trees/:id',
        builder: (_, s) => TreeDetailScreen(id: s.pathParameters['id']!),
      ),
      GoRoute(path: '/map', builder: (_, __) => const MapScreen()),
      GoRoute(path: '/assistant', builder: (_, __) => const AssistantScreen()),
      GoRoute(path: '/notifications', builder: (_, __) => const NotificationsScreen()),
      GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
    ],
  );
});

class ByotApp extends ConsumerWidget {
  const ByotApp({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(_routerProvider);
    return MaterialApp.router(
      title: 'BYOT',
      debugShowCheckedModeBanner: false,
      theme: byotLightTheme,
      darkTheme: byotDarkTheme,
      routerConfig: router,
    );
  }
}
