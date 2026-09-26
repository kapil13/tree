import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../nav_access.dart';
import '../session.dart';
import 'field_worker_home_screen.dart';
import 'home_screen.dart';

/// Routes field workers to a simplified home; others get the command center.
class HomeRouteScreen extends ConsumerWidget {
  const HomeRouteScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (isFieldWorkerHome(sessionController.user)) {
      return const FieldWorkerHomeScreen();
    }
    return const HomeScreen();
  }
}
