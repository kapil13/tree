import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'src/app.dart';
import 'src/offline/offline_sync_bootstrap.dart';

void main() {
  runApp(
    const ProviderScope(
      child: OfflineSyncBootstrap(
        child: ByotApp(),
      ),
    ),
  );
}
