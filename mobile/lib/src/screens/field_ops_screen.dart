import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../nav_access.dart';
import '../providers.dart';
import '../theme.dart';
import '../widgets/shell_scaffold.dart';
import '../widgets/stack_route_scaffold.dart';

class FieldOpsScreen extends ConsumerWidget {
  const FieldOpsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final summaryAsync = ref.watch(fieldOpsSummaryProvider);

    return stackRouteScaffold(
      location: '/field-ops',
      appBar: ShellTopBar(title: AppLocalizations.of(context)!.fieldOps),
      body: summaryAsync.when(
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
                  onPressed: () => ref.invalidate(fieldOpsSummaryProvider),
                  child: Text(l10n.retry),
                ),
              ],
            ),
          ),
        ),
        data: (summary) {
          final l10n = AppLocalizations.of(context)!;
          final user = ref.watch(userProvider).valueOrNull;
          final canAdd = canAddTrees(user);
          final projects = List<dynamic>.from(summary['projects'] ?? []);
          final violations = List<dynamic>.from(summary['recent_violations'] ?? []);
          final withSurvival = projects
              .where((p) => ((p as Map)['survival_due'] as num?)?.toInt() != null &&
                  (p['survival_due'] as num).toInt() > 0)
              .toList();

          return RefreshIndicator(
            color: AranyixColors.forest,
            onRefresh: () async => ref.invalidate(fieldOpsSummaryProvider),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text(l10n.fieldOpsQuickActions, style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    if (canAdd)
                      ActionChip(
                        avatar: const Icon(Icons.add, size: 18),
                        label: Text(l10n.registerTreeInField),
                        onPressed: () => context.push('/trees/new'),
                      ),
                    ActionChip(
                      avatar: const Icon(Icons.assignment_outlined, size: 18),
                      label: Text(l10n.viewAllProjects),
                      onPressed: () => context.go('/projects'),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    _KpiChip(label: l10n.projects, value: '${summary['project_count'] ?? 0}'),
                    _KpiChip(label: l10n.trees, value: '${summary['tree_count'] ?? 0}'),
                    _KpiChip(label: l10n.recentViolations, value: '${summary['open_violations'] ?? 0}'),
                    _KpiChip(label: l10n.survivalDueByProject, value: '${summary['survival_due'] ?? 0}'),
                  ],
                ),
                const SizedBox(height: 24),
                Text(l10n.recentViolations, style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                if (violations.isEmpty)
                  Text(l10n.noOpenViolations, style: const TextStyle(color: AranyixColors.onSurfaceMuted))
                else
                  for (final raw in violations)
                    _ViolationTile(
                      violation: Map<String, dynamic>.from(raw as Map),
                      onResolve: () => _resolve(context, ref, Map<String, dynamic>.from(raw)),
                    ),
                const SizedBox(height: 24),
                Text(l10n.survivalDueByProject, style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                if (withSurvival.isEmpty)
                  Text(l10n.noSurvivalDue, style: const TextStyle(color: AranyixColors.onSurfaceMuted))
                else
                  for (final raw in withSurvival)
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text((raw as Map)['name'] as String? ?? l10n.projectFallback),
                      subtitle: Text('${raw['survival_due']} trees due · ${raw['segment'] ?? ''}'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => context.push('/projects/${raw['id']}'),
                    ),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<void> _resolve(BuildContext context, WidgetRef ref, Map<String, dynamic> v) async {
    final projectId = v['project_id'] as String?;
    final id = v['id'] as String?;
    if (projectId == null || id == null) return;
    try {
      final api = await ref.read(apiClientProvider.future);
      await api.resolveViolation(projectId, id);
      ref.invalidate(fieldOpsSummaryProvider);
      ref.invalidate(monitoringSummaryProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(AppLocalizations.of(context)!.violationResolved)));
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
      }
    }
  }
}

class _KpiChip extends StatelessWidget {
  const _KpiChip({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 150,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AranyixColors.surfaceContainer,
        borderRadius: BorderRadius.circular(AranyixRadii.card),
        border: Border.all(color: Colors.black.withValues(alpha: 0.04)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text(label, style: const TextStyle(fontSize: 12, color: AranyixColors.onSurfaceMuted)),
        ],
      ),
    );
  }
}

class _ViolationTile extends StatelessWidget {
  const _ViolationTile({required this.violation, required this.onResolve});

  final Map<String, dynamic> violation;
  final VoidCallback onResolve;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        title: Text(violation['message'] as String? ?? violation['violation_type'] as String? ?? AppLocalizations.of(context)!.violationFallback),
        subtitle: Text(
          '${violation['project_name'] ?? ''} · ${violation['severity'] ?? ''}',
        ),
        trailing: TextButton(onPressed: onResolve, child: Text(AppLocalizations.of(context)!.resolve)),
      ),
    );
  }
}
