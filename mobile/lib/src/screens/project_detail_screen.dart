import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../api/api_errors.dart';
import '../field_ops_actions.dart';
import '../integrity_remediation.dart';
import '../project_setup_readiness.dart';
import '../providers.dart';
import '../widgets/project_scheme_context_card.dart';
import '../widgets/shell_scaffold.dart';
import '../widgets/stack_route_scaffold.dart';
import '../project/segment_labels.dart';

class ProjectDetailScreen extends ConsumerWidget {
  const ProjectDetailScreen({super.key, required this.projectId});

  final String projectId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final projectAsync = ref.watch(plantingProjectProvider(projectId));
    final workAreasAsync = ref.watch(workAreasProvider(projectId));
    final integrityAsync = ref.watch(integrityFusionProvider(projectId));
    final survivalAsync = ref.watch(survivalDueProvider(projectId));
    final violationsAsync = ref.watch(projectViolationsProvider(projectId));
    final schemeAsync = ref.watch(projectSchemeProvider(projectId));

    return stackRouteScaffold(
      location: '/projects/$projectId',
      appBar: ShellTopBar(title: AppLocalizations.of(context)!.projects, menuWithBack: true),
      floatingActionButton: projectAsync.maybeWhen(
        data: (project) {
          final workAreas = workAreasAsync.maybeWhen(data: (d) => d, orElse: () => <dynamic>[]);
          final scheme = schemeAsync.maybeWhen(data: (d) => d, orElse: () => null);
          final setup = evaluateProjectSetup(project, workAreas, scheme: scheme);
          return FloatingActionButton.extended(
            onPressed: setup.canRegisterTree
                ? () => context.push('/trees/new?project=$projectId')
                : () => _openSetup(context, ref),
            icon: Icon(setup.canRegisterTree ? Icons.add : Icons.settings_outlined),
            label: Text(setup.canRegisterTree ? l10n.registerTreeBtn : l10n.completeSetup),
          );
        },
        orElse: () => null,
      ),
      body: projectAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(apiErrorMessage(e))),
        data: (project) {
          final summary = project['summary'] as Map<String, dynamic>?;
          final segment = project['segment'] as String? ?? 'general';
          final workAreas = workAreasAsync.maybeWhen(data: (d) => d, orElse: () => <dynamic>[]);
          final scheme = schemeAsync.maybeWhen(data: (d) => d, orElse: () => null);
          final setup = evaluateProjectSetup(project, workAreas, scheme: scheme);

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(project['name'] as String, style: Theme.of(context).textTheme.headlineSmall),
              Text(
                '${project['code']} · ${segmentLabel(l10n, segment)}',
              ),
              const SizedBox(height: 8),
              Text(project['description'] as String? ?? ''),
              const SizedBox(height: 16),
              ProjectSchemeContextCard(scheme: scheme, project: project),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _chip(l10n.modeLabel, '${project['compliance_mode']}'),
                  _chip(l10n.treesCountLabel, '${summary?['tree_count'] ?? 0}'),
                  _chip(l10n.workAreas, '${summary?['work_area_count'] ?? 0}'),
                  if ((summary?['open_violations'] ?? 0) > 0)
                    _chip(l10n.violationsLabel, '${summary?['open_violations']}', warn: true),
                ],
              ),
              const SizedBox(height: 16),
              _SetupStatusCard(
                setup: setup,
                l10n: l10n,
                onOpenSetup: () => _openSetup(context, ref),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                children: [
                  OutlinedButton(
                    onPressed: () => context.push('/projects/$projectId/compliance'),
                    child: const Text('Compliance'),
                  ),
                  OutlinedButton(
                    onPressed: () => context.push('/projects/$projectId/audit'),
                    child: const Text('Estate Watch'),
                  ),
                  OutlinedButton(
                    onPressed: () => context.push('/satellite?project=$projectId'),
                    child: const Text('Satellite'),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              integrityAsync.when(
                loading: () => const LinearProgressIndicator(),
                error: (e, _) => Text(apiErrorMessage(e)),
                data: (integrity) => _IntegrityMonitoringCard(
                  integrity: integrity,
                  projectId: projectId,
                  l10n: l10n,
                ),
              ),
              const SizedBox(height: 16),
              survivalAsync.when(
                loading: () => const LinearProgressIndicator(),
                error: (e, _) => Text(apiErrorMessage(e)),
                data: (survival) => _SurvivalDueCard(
                  survival: survival,
                  l10n: l10n,
                  onTreeTap: (treeId) => context.push('/trees/$treeId/survival'),
                ),
              ),
              const SizedBox(height: 16),
              violationsAsync.when(
                loading: () => const SizedBox.shrink(),
                error: (_, __) => const SizedBox.shrink(),
                data: (violations) {
                  if (violations.isEmpty) return const SizedBox.shrink();
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(l10n.recentViolations, style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 8),
                      for (final raw in violations.take(5))
                        Card(
                          child: ListTile(
                            title: Text(
                              (raw as Map)['message'] as String? ??
                                  raw['violation_type'] as String? ??
                                  l10n.violationFallback,
                            ),
                            subtitle: Text('${raw['severity'] ?? ''}'),
                            trailing: TextButton(
                              onPressed: () => resolveComplianceViolation(
                                context,
                                ref,
                                Map<String, dynamic>.from({
                                  ...raw,
                                  'project_id': projectId,
                                }),
                              ),
                              child: Text(l10n.resolve),
                            ),
                          ),
                        ),
                      const SizedBox(height: 16),
                    ],
                  );
                },
              ),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => context.push('/credits/projects/$projectId'),
                      child: Text(l10n.projectCreditLedger),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => context.push('/evidence?project=$projectId'),
                      child: Text(l10n.evidenceTitle),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              Text(l10n.workAreas, style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              workAreasAsync.when(
                loading: () => const LinearProgressIndicator(),
                error: (e, _) => Text(apiErrorMessage(e)),
                data: (areas) {
                  if (areas.isEmpty) {
                    return Text(l10n.noWorkAreasYet);
                  }
                  return Column(
                    children: areas.map((wa) {
                      final m = wa as Map<String, dynamic>;
                      final id = m['id'] as String;
                      final density = _densityLabel(l10n, m, segment);
                      final lastScan = m['last_satellite_at'] as String?;
                      final scanLabel = _satelliteLabel(l10n, lastScan);
                      return Card(
                        child: ListTile(
                          title: Text(m['name'] as String? ?? l10n.workAreaFallback),
                          subtitle: Text(
                            '${m['geometry_type']} · ${m['tree_count'] ?? 0} ${l10n.treesCountSuffix}'
                            '${m['segment_code'] != null ? ' · ${l10n.workAreaBlock(m['segment_code'] as String)}' : ''}'
                            '${density.isNotEmpty ? ' · $density' : ''}'
                            '${scanLabel.isNotEmpty ? '\n$scanLabel' : ''}',
                          ),
                          trailing: Icon(
                            lastScan != null ? Icons.satellite_alt : Icons.satellite_alt_outlined,
                            color: _satelliteIconColor(lastScan),
                          ),
                          isThreeLine: scanLabel.isNotEmpty,
                          onTap: () => context.push(
                            '/trees/new?project=$projectId&work_area=$id',
                          ),
                        ),
                      );
                    }).toList(),
                  );
                },
              ),
            ],
          );
        },
      ),
    );
  }

  void _openSetup(BuildContext context, WidgetRef ref) {
    context.push('/projects/$projectId/setup');
  }

  String _densityLabel(AppLocalizations l10n, Map<String, dynamic> wa, String segment) {
    if (segment != 'industrial_greenbelt') return '';
    final area = (wa['area_ha'] as num?)?.toDouble();
    final trees = (wa['tree_count'] as num?)?.toInt() ?? 0;
    if (area == null || area <= 0) return '';
    return l10n.treesPerHa((trees / area).toStringAsFixed(0));
  }

  String _satelliteLabel(AppLocalizations l10n, String? lastScanIso) {
    if (lastScanIso == null) return l10n.satelliteNoScan;
    final parsed = DateTime.tryParse(lastScanIso);
    if (parsed == null) return l10n.satelliteScanned;
    final days = DateTime.now().toUtc().difference(parsed.toUtc()).inDays;
    if (days > 35) return l10n.satelliteStale(days);
    if (days == 0) return l10n.satelliteScannedToday;
    return l10n.satelliteDaysAgo(days);
  }

  Color? _satelliteIconColor(String? lastScanIso) {
    if (lastScanIso == null) return Colors.grey;
    final parsed = DateTime.tryParse(lastScanIso);
    if (parsed == null) return Colors.green;
    final days = DateTime.now().toUtc().difference(parsed.toUtc()).inDays;
    if (days > 35) return Colors.orange.shade800;
    return Colors.green.shade700;
  }

  Widget _chip(String label, String value, {bool warn = false}) {
    return Chip(
      label: Text('$label: $value'),
      backgroundColor: warn ? Colors.orange.shade100 : null,
    );
  }
}

class _SetupStatusCard extends StatelessWidget {
  const _SetupStatusCard({required this.setup, required this.l10n, required this.onOpenSetup});

  final ProjectSetupStatus setup;
  final AppLocalizations l10n;
  final VoidCallback onOpenSetup;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  setup.canRegisterTree ? Icons.check_circle : Icons.pending_outlined,
                  color: setup.canRegisterTree ? Colors.green.shade700 : Colors.orange.shade800,
                ),
                const SizedBox(width: 8),
                Text(l10n.projectSetupTitle, style: Theme.of(context).textTheme.titleMedium),
              ],
            ),
            if (setup.blockReason != null) ...[
              const SizedBox(height: 8),
              Text(setup.blockReason!, style: const TextStyle(fontSize: 13)),
            ],
            const SizedBox(height: 8),
            for (final step in setup.steps)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Row(
                  children: [
                    Icon(
                      step.complete ? Icons.check : Icons.radio_button_unchecked,
                      size: 16,
                      color: step.complete ? Colors.green : Colors.grey,
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        step.label,
                        style: TextStyle(
                          fontSize: 13,
                          color: step.complete ? null : Colors.orange.shade900,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            if (!setup.canRegisterTree) ...[
              const SizedBox(height: 8),
              TextButton(onPressed: onOpenSetup, child: Text(l10n.completeSetup)),
            ],
          ],
        ),
      ),
    );
  }
}

class _SurvivalDueCard extends StatelessWidget {
  const _SurvivalDueCard({required this.survival, required this.l10n, required this.onTreeTap});

  final Map<String, dynamic> survival;
  final AppLocalizations l10n;
  final void Function(String treeId) onTreeTap;

  @override
  Widget build(BuildContext context) {
    final due = (survival['trees_due'] as num?)?.toInt() ?? 0;
    final total = (survival['trees_total'] as num?)?.toInt() ?? 0;
    final interval = survival['survey_interval_days'];
    final dueIds = List<String>.from(survival['due_tree_ids'] ?? []);

    if (due == 0) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Icon(Icons.verified_user, color: Colors.green.shade700),
              const SizedBox(width: 8),
              Expanded(child: Text(l10n.survivalNoSurveysDue(total, interval?.toString() ?? '—'))),
            ],
          ),
        ),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              l10n.survivalSurveysDue,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            Text(l10n.survivalTreesNeedRegeotag(due, total, interval?.toString() ?? '—')),
            const SizedBox(height: 8),
            for (final id in dueIds.take(8))
              ListTile(
                contentPadding: EdgeInsets.zero,
                dense: true,
                title: Text(l10n.treeIdLabel(id), style: const TextStyle(fontSize: 13)),
                trailing: const Icon(Icons.chevron_right, size: 18),
                onTap: () => onTreeTap(id),
              ),
            if (dueIds.length > 8)
              Text(l10n.moreCount(dueIds.length - 8), style: const TextStyle(fontSize: 12, color: Colors.grey)),
          ],
        ),
      ),
    );
  }
}

class _IntegrityMonitoringCard extends StatelessWidget {
  const _IntegrityMonitoringCard({required this.integrity, required this.projectId, required this.l10n});

  final Map<String, dynamic> integrity;
  final String projectId;
  final AppLocalizations l10n;

  @override
  Widget build(BuildContext context) {
    final monitoringGate = integrity['monitoring_gate'] as Map<String, dynamic>?;
    final monitoringReady = integrity['monitoring_ready'] == true ||
        monitoringGate?['passed'] == true;
    final reasons = (monitoringGate?['reasons'] as List?)?.whereType<String>().toList() ?? [];
    final blocking = (integrity['blocking_trees'] as List?) ?? [];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  monitoringReady ? Icons.verified_user : Icons.warning_amber_rounded,
                  color: monitoringReady ? Colors.green.shade700 : Colors.orange.shade800,
                ),
                const SizedBox(width: 8),
                Text(
                  l10n.integrityMonitoringGate,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              monitoringReady ? l10n.integrityGatePassed : l10n.integrityGateBlocked,
            ),
            if (monitoringGate?['message'] != null) ...[
              const SizedBox(height: 6),
              Text(
                monitoringGate!['message'] as String,
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
            ],
            if (!monitoringReady && reasons.isNotEmpty) ...[
              const SizedBox(height: 8),
              for (final reason in reasons)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('• '),
                      Expanded(
                        child: Text(
                          resolveIntegrityRemediation(l10n, reason, projectId: projectId).label,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
            const SizedBox(height: 8),
            Text(
              l10n.integrityEligibleAudit(
                '${integrity['credit_eligible_count'] ?? 0}',
                '${integrity['tree_count'] ?? 0}',
                '${integrity['audit_ready_count'] ?? 0}',
              ),
              style: const TextStyle(fontSize: 12),
            ),
            if (blocking.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                l10n.treesWithBlockingIssues(blocking.length),
                style: TextStyle(fontSize: 12, color: Colors.orange.shade900),
              ),
              for (final raw in blocking.take(5))
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  dense: true,
                  title: Text(
                    (raw as Map)['public_code'] as String? ?? l10n.treeFallback,
                    style: const TextStyle(fontSize: 13),
                  ),
                  subtitle: Text(
                    ((raw['blockers'] as List?) ?? [])
                        .whereType<String>()
                        .map((code) => integrityBlockerLabel(l10n, code))
                        .join(', '),
                    style: const TextStyle(fontSize: 11),
                  ),
                  trailing: const Icon(Icons.chevron_right, size: 18),
                  onTap: () {
                    final treeId = raw['tree_id'] as String?;
                    if (treeId != null) context.push('/trees/$treeId');
                  },
                ),
            ],
          ],
        ),
      ),
    );
  }
}
