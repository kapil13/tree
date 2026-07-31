import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'route_access.dart';
import 'session.dart';
import 'theme.dart';
import 'screens/splash_screen.dart';
import 'screens/welcome_screen.dart';
import 'screens/login_screen.dart';
import 'screens/signup_screen.dart';
import 'screens/auth_flow_screens.dart';
import 'screens/onboarding_screens.dart';
import 'screens/org_profile_wizard_screen.dart';
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
import 'screens/field_ops_screen.dart';
import 'screens/monitoring_screen.dart';
import 'screens/carbon_screen.dart';
import 'screens/reports_screen.dart';
import 'screens/credits_screen.dart';
import 'screens/survival_survey_screen.dart';
import 'widgets/app_shell.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

bool _isPublicRoute(String loc) {
  return loc == '/' ||
      loc == '/welcome' ||
      loc == '/login' ||
      loc == '/signup' ||
      loc == '/forgot-password' ||
      loc == '/auth' ||
      loc.startsWith('/auth/') ||
      loc == '/onboarding/pending';
}

final _routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/',
    refreshListenable: sessionController,
    redirect: (context, state) {
      final loc = state.matchedLocation;

      if (loc == '/onboarding/org-profile' && !sessionController.authenticated) {
        return '/login';
      }

      if (!sessionController.authenticated && !_isPublicRoute(loc)) {
        final invite = state.uri.queryParameters['invite'];
        if (invite != null) return '/login?invite=$invite';
        return '/welcome';
      }

      if (sessionController.authenticated &&
          (loc == '/login' || loc == '/signup' || loc == '/welcome' || loc == '/forgot-password')) {
        return '/home';
      }

      if (loc == '/auth') {
        final invite = state.uri.queryParameters['invite'];
        if (invite != null) return '/login?invite=$invite';
        return '/welcome';
      }

      final user = sessionController.user;
      if (sessionController.authenticated && user != null && !canAccessPath(user, loc)) {
        return '/home';
      }

      return null;
    },
    routes: [
      GoRoute(path: '/', builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/welcome', builder: (_, __) => const WelcomeScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/signup', builder: (_, __) => const SignupScreen()),
      GoRoute(path: '/forgot-password', builder: (_, __) => const ForgotPasswordScreen()),
      GoRoute(
        path: '/auth/callback',
        builder: (_, state) => AuthCallbackScreen(uri: state.uri),
      ),
      GoRoute(
        path: '/auth',
        redirect: (_, state) {
          final invite = state.uri.queryParameters['invite'];
          if (invite != null) return '/login?invite=$invite';
          return '/welcome';
        },
      ),
      GoRoute(path: '/onboarding/pending', builder: (_, __) => const OnboardingPendingScreen()),
      GoRoute(path: '/onboarding/org-profile', builder: (_, __) => const OrgProfileWizardScreen()),
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (_, __, child) => AppShell(child: child),
        routes: [
          // All tab destinations for every role so context.go() works.
          GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
          GoRoute(path: '/trees', builder: (_, __) => const TreeListScreen()),
          GoRoute(path: '/projects', builder: (_, __) => const ProjectsListScreen()),
          GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
          GoRoute(path: '/map', builder: (_, __) => const MapScreen()),
          GoRoute(path: '/notifications', builder: (_, __) => const NotificationsScreen()),
          GoRoute(path: '/monitoring', builder: (_, __) => const MonitoringScreen()),
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
        path: '/trees/:id/survival',
        builder: (_, s) => SurvivalSurveyScreen(treeId: s.pathParameters['id']!),
      ),
      GoRoute(
        path: '/trees/:id',
        builder: (_, s) => TreeDetailScreen(id: s.pathParameters['id']!),
      ),
      GoRoute(path: '/field-ops', builder: (_, __) => const FieldOpsScreen()),
      GoRoute(path: '/carbon', builder: (_, __) => const CarbonScreen()),
      GoRoute(path: '/reports', builder: (_, __) => const ReportsScreen()),
      GoRoute(path: '/credits', builder: (_, __) => const CreditsScreen()),
      GoRoute(path: '/assistant', builder: (_, __) => const AssistantScreen()),
      GoRoute(path: '/bioacoustic', builder: (_, __) => const BioacousticScreen()),
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
