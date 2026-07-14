import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'api_errors.dart';
import '../providers.dart';
import '../session.dart';

/// Clears cached API state and sends the user back to login after auth failure.
void redirectToLogin(WidgetRef ref, BuildContext context) {
  ref.invalidate(apiClientProvider);
  ref.invalidate(dashboardProvider);
  ref.invalidate(treesProvider);
  ref.invalidate(alertsProvider);
  ref.invalidate(userProvider);
  sessionController.signOut();
  if (context.mounted) context.go('/login');
}

/// If [err] is a 401 / expired session, redirect to login instead of showing an error screen.
bool maybeRedirectUnauthorized(WidgetRef ref, BuildContext context, Object err) {
  if (!isUnauthorizedError(err)) return false;
  WidgetsBinding.instance.addPostFrameCallback((_) {
    if (context.mounted) redirectToLogin(ref, context);
  });
  return true;
}
