import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../api/api_errors.dart';
import '../l10n/alert_labels.dart';
import '../providers.dart';
import '../widgets/prototype/prototype_ui.dart';
import '../widgets/stack_route_scaffold.dart';

class AlertDetailScreen extends ConsumerWidget {
  const AlertDetailScreen({super.key, required this.alertId});

  final String alertId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final lang = Localizations.localeOf(context).languageCode;
    final alertsAsync = ref.watch(alertsProvider);

    return stackRouteScaffold(
      location: '/alerts/$alertId',
      appBar: PrototypeBackBar(title: 'Alert'),
      body: alertsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: PrototypeColors.brandCanopy)),
        error: (e, _) => Center(child: Text(apiErrorMessage(e))),
        data: (items) {
          final alert = items.cast<Map<String, dynamic>?>().firstWhere(
                (a) => a?['id'] == alertId,
                orElse: () => null,
              );
          if (alert == null) {
            return PrototypeEmptyState(icon: '🔔', title: 'Alert not found');
          }

          final severity = alert['severity'] as String? ?? 'moderate';
          final title = alert['title'] as String? ?? 'Alert';
          final message = alert['message'] as String? ?? '';
          final time = alert['created_at'] as String? ?? '';
          final kind = alert['kind'] as String?;
          final payload = alert['payload'] as Map<String, dynamic>?;
          final treeId = alert['tree_id'] as String? ?? payload?['tree_id'] as String?;
          final fenceId = payload?['fence_id'] as String?;
          final projectId = payload?['project_id'] as String?;
          final actionLabel = kind != null ? alertKindLabel(kind, languageCode: lang) : 'View on map';

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 6,
                    height: 72,
                    decoration: BoxDecoration(
                      color: _severityColor(severity),
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        PrototypeStatusBadge(
                          label: severity,
                          variant: severity == 'critical' ? 'danger' : severity == 'high' ? 'warn' : 'info',
                        ),
                        const SizedBox(height: 8),
                        Text(title, style: GoogleFonts.dmSans(fontSize: 20, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 4),
                        Text(time, style: GoogleFonts.dmSans(fontSize: 13, color: PrototypeColors.textSecondary)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: PrototypeColors.bgSurface,
                  borderRadius: BorderRadius.circular(PrototypeRadii.lg),
                  border: Border.all(color: PrototypeColors.border),
                ),
                child: Text(message, style: GoogleFonts.dmSans(fontSize: 14, height: 1.6)),
              ),
              const SizedBox(height: 20),
              Text('Recommended action', style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: () {
                  if (fenceId != null) {
                    context.push('/monitoring?fence=$fenceId');
                  } else if (treeId != null) {
                    context.push('/trees/$treeId');
                  } else if (projectId != null) {
                    context.push('/projects/$projectId');
                  } else {
                    context.go('/map');
                  }
                },
                style: FilledButton.styleFrom(
                  backgroundColor: PrototypeColors.brandForest,
                  minimumSize: const Size.fromHeight(48),
                ),
                child: Text(actionLabel),
              ),
              const SizedBox(height: 8),
              OutlinedButton(
                onPressed: () async {
                  try {
                    final api = await ref.read(apiClientProvider.future);
                    await api.markAlertRead(alertId);
                    ref.invalidate(alertsProvider);
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(l10n.preferencesSaved)),
                      );
                      context.pop();
                    }
                  } catch (e) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(apiErrorMessage(e))),
                      );
                    }
                  }
                },
                style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                child: const Text('Mark reviewed'),
              ),
              if (treeId != null) ...[
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () => context.push('/trees/$treeId'),
                  child: const Text('View affected tree →'),
                ),
              ],
            ],
          );
        },
      ),
    );
  }

  Color _severityColor(String severity) {
    return switch (severity) {
      'critical' => PrototypeColors.statusDanger,
      'high' => const Color(0xFFEA580C),
      'moderate' => const Color(0xFFD97706),
      _ => PrototypeColors.brandCanopy,
    };
  }
}
