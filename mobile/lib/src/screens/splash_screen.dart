import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth_session.dart';
import '../providers.dart';
import '../session.dart';
import '../theme.dart';
import '../widgets/brand_mark.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});
  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _fade;
  late final Animation<double> _opacity;
  late final Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _fade = AnimationController(vsync: this, duration: const Duration(milliseconds: 800));
    _opacity = CurvedAnimation(parent: _fade, curve: Curves.easeOut);
    _scale = Tween<double>(begin: 0.94, end: 1).animate(
      CurvedAnimation(parent: _fade, curve: Curves.easeOutCubic),
    );
    _fade.forward();
    Future.microtask(_route);
  }

  @override
  void dispose() {
    _fade.dispose();
    super.dispose();
  }

  Future<void> _route() async {
    await Future.delayed(const Duration(milliseconds: 950));
    final api = await ref.read(apiClientProvider.future);
    if (!await api.hasStoredToken()) {
      sessionController.signOut();
      if (!mounted) return;
      context.go('/welcome');
      return;
    }
    try {
      final landing = await completeAuthSession(ref);
      if (!mounted) return;
      context.go(landing);
    } catch (_) {
      await api.logout();
      ref.invalidate(apiClientProvider);
      if (!mounted) return;
      context.go('/welcome');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AranyixColors.surface,
      body: SafeArea(
        child: FadeTransition(
          opacity: _opacity,
          child: ScaleTransition(
            scale: _scale,
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const AranyixBrandMark(size: 88, radius: 24, showGlow: true),
                  const SizedBox(height: 20),
                  Text(
                    'Aranyix',
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                          color: AranyixColors.forestDark,
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Plantation intelligence',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AranyixColors.onSurfaceMuted,
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                  const SizedBox(height: 36),
                  const SizedBox(
                    width: 26,
                    height: 26,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      color: AranyixColors.forest,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
