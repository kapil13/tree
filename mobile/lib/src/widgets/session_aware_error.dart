import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_errors.dart';
import '../api/auth_redirect.dart';

/// Error body that redirects to login on 401 instead of showing a dead-end message.
class SessionAwareErrorView extends ConsumerWidget {
  const SessionAwareErrorView({
    super.key,
    required this.error,
    this.onRetry,
    this.padding = const EdgeInsets.all(24),
  });

  final Object error;
  final VoidCallback? onRetry;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (maybeRedirectUnauthorized(ref, context, error)) {
      return const SizedBox.shrink();
    }
    final l10n = AppLocalizations.of(context)!;
    return Center(
      child: Padding(
        padding: padding,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(apiErrorMessage(error), textAlign: TextAlign.center),
            if (onRetry != null) ...[
              const SizedBox(height: 12),
              FilledButton(onPressed: onRetry, child: Text(l10n.retry)),
            ],
          ],
        ),
      ),
    );
  }
}

/// Returns true when [err] triggered a login redirect (caller should stop handling).
bool redirectIfUnauthorized(WidgetRef ref, BuildContext context, Object err) {
  return maybeRedirectUnauthorized(ref, context, err);
}
