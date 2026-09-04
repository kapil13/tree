import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api/api_errors.dart';
import 'auth/onboarding_routing.dart';
import 'auth/post_auth_redirect.dart';
import 'invite_landing.dart';
import 'pending_invite.dart';
import 'providers.dart';
import 'session.dart';

/// Load profile, accept pending invite if present, and return landing route.
Future<String> completeAuthSession(
  WidgetRef ref, {
  String? inviteToken,
  bool afterSignup = false,
  String? postAuthNext,
}) async {
  final api = await ref.read(apiClientProvider.future);
  var user = await api.me();
  sessionController.setAuthenticated(true);
  sessionController.setUser(user);

  final token = inviteToken ?? await consumePendingInviteToken();
  if (token != null && token.isNotEmpty) {
    try {
      final member = await api.acceptOrgInvite(token);
      user = await api.me();
      sessionController.setUser(user);
      return inviteLandingRoute(
        member['org_role'] as String? ?? user['org_role'] as String?,
      );
    } catch (e) {
      throw InviteAcceptException(inviteErrorMessage(apiErrorMessage(e)));
    }
  }

  final onboarding = onboardingRedirectPath(user);
  if (onboarding != null) return onboarding;

  final defaultLanding = afterSignup ? postSignupLandingRoute(user) : '/home';
  return resolvePostAuthLanding(
    api: api,
    user: user,
    defaultLanding: defaultLanding,
    postAuthNext: postAuthNext,
  );
}

/// Keeps [sessionController.user] in sync when the app has tokens but profile was not loaded.
Future<void> ensureSessionUser(WidgetRef ref) async {
  if (!sessionController.authenticated || sessionController.user != null) return;
  try {
    final user = await ref.read(userProvider.future);
    sessionController.setUser(user);
  } catch (_) {}
}

class InviteAcceptException implements Exception {
  InviteAcceptException(this.message);
  final String message;

  @override
  String toString() => message;
}
