import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:package_info_plus/package_info_plus.dart';

import 'api/api_errors.dart';
import 'providers.dart';
import 'services/analytics_service.dart';
import 'services/app_settings.dart';
import 'services/deep_link_service.dart';
import 'services/security_services.dart';
import 'session.dart';

/// Initializes settings, deep links, push registration, and security toggles.
class AppBootstrap extends ConsumerStatefulWidget {
  const AppBootstrap({super.key, required this.child, required this.router});

  final Widget child;
  final GoRouter router;

  @override
  ConsumerState<AppBootstrap> createState() => _AppBootstrapState();
}

class _AppBootstrapState extends ConsumerState<AppBootstrap> with WidgetsBindingObserver {
  bool _biometricGateOpen = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _init());
    sessionController.addListener(_onSessionChanged);
  }

  @override
  void dispose() {
    sessionController.removeListener(_onSessionChanged);
    WidgetsBinding.instance.removeObserver(this);
    DeepLinkService.instance.dispose();
    super.dispose();
  }

  Future<void> _init() async {
    await AppSettings.instance.load();
    await ScreenshotGuard.apply(AppSettings.instance.screenshotGuard);
    await DeepLinkService.instance.init(_handleDeepLink);
    if (sessionController.authenticated) {
      await PushRegistrationService.instance.registerIfEnabled(() => ref.read(apiClientProvider.future));
    }
    await AnalyticsService.instance.track('app_open');
  }

  void _onSessionChanged() {
    if (sessionController.authenticated) {
      PushRegistrationService.instance.registerIfEnabled(() => ref.read(apiClientProvider.future));
      AnalyticsService.instance.track('session_start');
    } else {
      PushRegistrationService.instance.unregister(() => ref.read(apiClientProvider.future));
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed &&
        sessionController.authenticated &&
        AppSettings.instance.biometricUnlock) {
      setState(() => _biometricGateOpen = false);
      _promptBiometric();
    }
  }

  Future<void> _promptBiometric() async {
    final ok = await PushRegistrationService.instance.authenticateBiometric(
      reason: 'Unlock Aranyix',
    );
    if (!mounted) return;
    setState(() => _biometricGateOpen = ok);
    if (!ok) {
      final api = await ref.read(apiClientProvider.future);
      await api.logout();
      if (mounted) widget.router.go('/login');
    }
  }

  Future<void> _handleDeepLink(Uri uri) async {
    final invite = DeepLinkService.inviteTokenFromUri(uri);
    if (invite != null) {
      widget.router.go('/login?invite=$invite');
      return;
    }

    if (uri.path.startsWith('/auth/callback')) {
      final target = '${uri.path}${uri.query.isNotEmpty ? '?${uri.query}' : ''}';
      widget.router.go(target);
      return;
    }

    final code = DeepLinkService.treePublicCodeFromUri(uri);
    if (code == null) return;

    if (!sessionController.authenticated) {
      widget.router.go('/login?next=/p/$code');
      return;
    }

    try {
      final api = await ref.read(apiClientProvider.future);
      final tree = await api.getTreeByPublicCode(code);
      final id = tree['id'] as String;
      if (!mounted) return;
      widget.router.go('/trees/$id');
      await AnalyticsService.instance.track('deep_link_tree', properties: {'public_code': code});
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(apiErrorMessage(e))),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_biometricGateOpen && AppSettings.instance.biometricUnlock) {
      return const Material(
        child: Center(child: CircularProgressIndicator()),
      );
    }
    return widget.child;
  }
}

Future<String> appVersionLabel() async {
  final info = await PackageInfo.fromPlatform();
  return '${info.version}+${info.buildNumber}';
}
