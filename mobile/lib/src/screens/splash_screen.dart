import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth_session.dart';
import '../providers.dart';
import '../session.dart';
import '../theme.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});
  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _fade;
  late final Animation<double> _opacity;

  @override
  void initState() {
    super.initState();
    _fade = AnimationController(vsync: this, duration: const Duration(milliseconds: 700));
    _opacity = CurvedAnimation(parent: _fade, curve: Curves.easeOut);
    _fade.forward();
    Future.microtask(_route);
  }

  @override
  void dispose() {
    _fade.dispose();
    super.dispose();
  }

  Future<void> _route() async {
    await Future.delayed(const Duration(milliseconds: 900));
    final api = await ref.read(apiClientProvider.future);
    if (!await api.hasStoredToken()) {
      sessionController.signOut();
      if (!mounted) return;
      context.go('/login');
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
      context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: FadeTransition(
          opacity: _opacity,
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Image.asset(
                  'assets/brand/aranyix-logo.png',
                  width: 260,
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => const Text(
                    'Aranyix',
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.w700,
                      color: AranyixColors.forestDark,
                    ),
                  ),
                ),
                const SizedBox(height: 36),
                const SizedBox(
                  width: 28,
                  height: 28,
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
    );
  }
}
