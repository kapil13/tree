import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'src/app.dart';
import 'src/offline/offline_sync_bootstrap.dart';
import 'src/services/firebase_push_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await FirebasePushService.registerBackgroundHandler();
  await FirebasePushService.initialize();
  runApp(
    const ProviderScope(
      child: OfflineSyncBootstrap(
        child: ByotApp(),
      ),
    ),
  );
}
