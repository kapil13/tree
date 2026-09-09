import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api/api_errors.dart';
import 'providers.dart';

Future<void> resolveComplianceViolation(
  BuildContext context,
  WidgetRef ref,
  Map<String, dynamic> violation,
) async {
  final projectId = violation['project_id'] as String?;
  final id = violation['id'] as String?;
  if (projectId == null || id == null) return;

  final l10n = AppLocalizations.of(context)!;
  final confirmed = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(l10n.resolve),
      content: Text(
        violation['message'] as String? ??
            violation['violation_type'] as String? ??
            l10n.violationFallback,
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(l10n.cancel)),
        FilledButton(onPressed: () => Navigator.pop(ctx, true), child: Text(l10n.resolve)),
      ],
    ),
  );
  if (confirmed != true) return;

  try {
    final api = await ref.read(apiClientProvider.future);
    await api.resolveViolation(projectId, id);
    ref.invalidate(fieldOpsSummaryProvider);
    ref.invalidate(monitoringSummaryProvider);
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.violationResolved)),
      );
    }
  } catch (e) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(apiErrorMessage(e))),
      );
    }
  }
}
