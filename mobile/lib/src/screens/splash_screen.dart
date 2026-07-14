import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers.dart';
import '../session.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});
  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(_route);
  }

  Future<void> _route() async {
    final api = await ref.read(apiClientProvider.future);
    if (!await api.hasStoredToken()) {
      sessionController.signOut();
      if (!mounted) return;
      context.go('/login');
      return;
    }
    try {
      await api.me();
      sessionController.setAuthenticated(true);
      if (!mounted) return;
      context.go('/home');
    } catch (_) {
      await api.logout();
      if (!mounted) return;
      context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('🌳', style: TextStyle(fontSize: 64)),
            SizedBox(height: 12),
            Text('BYOT', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            SizedBox(height: 24),
            CircularProgressIndicator(),
          ],
        ),
      ),
    );
  }
}
