import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers.dart';
import '../session.dart';

/// Starts offline bioacoustic sync when the user is authenticated.
class OfflineSyncBootstrap extends ConsumerStatefulWidget {
  const OfflineSyncBootstrap({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<OfflineSyncBootstrap> createState() => _OfflineSyncBootstrapState();
}

class _OfflineSyncBootstrapState extends ConsumerState<OfflineSyncBootstrap> {
  @override
  void initState() {
    super.initState();
    sessionController.addListener(_onSessionChanged);
    WidgetsBinding.instance.addPostFrameCallback((_) => _bootstrap());
  }

  @override
  void dispose() {
    sessionController.removeListener(_onSessionChanged);
    super.dispose();
  }

  void _onSessionChanged() {
    if (sessionController.authenticated) {
      _bootstrap();
    } else {
      ref.read(bioacousticSyncProvider).stopListening();
    }
  }

  Future<void> _bootstrap() async {
    if (!sessionController.authenticated) return;
    final queue = ref.read(bioacousticQueueProvider);
    await queue.init();
    final sync = ref.read(bioacousticSyncProvider);
    sync.startListening(() => ref.read(apiClientProvider.future));
    await sync.syncAll(() => ref.read(apiClientProvider.future));
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
