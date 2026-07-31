import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth_session.dart';
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
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('🌳', style: TextStyle(fontSize: 64)),
            SizedBox(height: 12),
            Text('Aranyix', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            SizedBox(height: 24),
            CircularProgressIndicator(),
          ],
        ),
      ),
    );
  }
}
