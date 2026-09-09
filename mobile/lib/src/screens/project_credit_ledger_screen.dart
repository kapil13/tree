import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../providers.dart';
import '../theme.dart';
import '../widgets/stack_route_scaffold.dart';
import '../widgets/shell_scaffold.dart';

class ProjectCreditLedgerScreen extends ConsumerWidget {
  const ProjectCreditLedgerScreen({super.key, required this.projectId});

  final String projectId;

  String _num(dynamic v) {
    if (v is num) return v.toStringAsFixed(3);
    return v?.toString() ?? '0';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final projectAsync = ref.watch(plantingProjectProvider(projectId));
    final ledgerAsync = ref.watch(projectCreditLedgerProvider(projectId));

    return stackRouteScaffold(
      location: '/credits/projects/$projectId',
      appBar: ShellTopBar(title: l10n.navCredits, menuWithBack: true),
      body: projectAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(apiErrorMessage(e))),
        data: (project) => ledgerAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(apiErrorMessage(e), textAlign: TextAlign.center),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: () => ref.invalidate(projectCreditLedgerProvider(projectId)),
                    child: Text(l10n.retry),
                  ),
                ],
              ),
            ),
          ),
          data: (ledger) {
            final events = List<dynamic>.from(ledger['events'] ?? []);
            final serials = List<dynamic>.from(ledger['serials'] ?? []);
            final fusion = ledger['integrity_fusion'] as Map<String, dynamic>?;

            return RefreshIndicator(
              color: AranyixColors.forest,
              onRefresh: () async {
                ref.invalidate(projectCreditLedgerProvider(projectId));
                ref.invalidate(plantingProjectProvider(projectId));
              },
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Text(
                    project['name'] as String? ?? l10n.projectFallback,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  Text(
                    '${project['code']} · ${ledger['status'] ?? '—'}',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AranyixColors.onSurfaceMuted,
                        ),
                  ),
                  const SizedBox(height: 16),
                  _row(l10n.treesCountLabel, '${ledger['tree_count'] ?? 0}'),
                  _row(l10n.grossCredits, _num(ledger['gross_credits_tco2e'])),
                  _row(l10n.bufferWithheld, _num(ledger['buffer_withheld_tco2e'])),
                  _row(l10n.netCredits, _num(ledger['net_credits_tco2e'])),
                  _row(l10n.issuedCredits, _num(ledger['issued_credits_tco2e'])),
                  if (ledger['methodology'] != null)
                    _row('Methodology', '${ledger['methodology']}'),
                  if (fusion != null) ...[
                    const SizedBox(height: 20),
                    Text('Integrity fusion', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 8),
                    _row(
                      'Audit ready',
                      '${fusion['audit_ready_count'] ?? 0}/${fusion['tree_count'] ?? 0}',
                    ),
                    _row(
                      'Credit eligible',
                      '${fusion['credit_eligible_count'] ?? 0}/${fusion['tree_count'] ?? 0}',
                    ),
                  ],
                  if (events.isNotEmpty) ...[
                    const SizedBox(height: 20),
                    Text('Status history', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 8),
                    for (final raw in events)
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(
                          '${(raw as Map)['from_status'] ?? '—'} → ${raw['to_status'] ?? '—'}',
                        ),
                        subtitle: Text(
                          '${raw['notes'] ?? ''}\n${raw['created_at'] ?? ''}'.trim(),
                        ),
                        isThreeLine: true,
                      ),
                  ],
                  if (serials.isNotEmpty) ...[
                    const SizedBox(height: 20),
                    Text('Credit serials', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 8),
                    for (final raw in serials)
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text((raw as Map)['serial_number'] as String? ?? 'Serial'),
                        subtitle: Text(
                          '${raw['status'] ?? ''} · ${_num(raw['quantity_tco2e'])} tCO₂e',
                        ),
                      ),
                  ],
                  const SizedBox(height: 12),
                  OutlinedButton(
                    onPressed: () => context.push('/projects/$projectId'),
                    child: const Text('View project'),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Expanded(child: Text(label, style: const TextStyle(color: AranyixColors.onSurfaceMuted))),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
        ],
      ),
    );
  }
}
