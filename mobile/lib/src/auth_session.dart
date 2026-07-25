import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api/api_client.dart';
import 'api/api_errors.dart';
import 'invite_landing.dart';
import 'pending_invite.dart';
import 'providers.dart';
import 'session.dart';

/// Load profile, accept pending invite if present, and return landing route.
Future<String> completeAuthSession(
  WidgetRef ref, {
  String? inviteToken,
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

  return '/home';
}

class InviteAcceptException implements Exception {
  InviteAcceptException(this.message);
  final String message;

  @override
  String toString() => message;
}
