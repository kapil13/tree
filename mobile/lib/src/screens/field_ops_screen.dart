import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../providers.dart';
import '../theme.dart';

class FieldOpsScreen extends ConsumerWidget {
  const FieldOpsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summaryAsync = ref.watch(fieldOpsSummaryProvider);

    return Scaffold(
      backgroundColor: AranyixColors.surface,
      appBar: AppBar(title: const Text('Field ops')),
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
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
        data: (summary) {
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
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    _KpiChip(label: 'Projects', value: '${summary['project_count'] ?? 0}'),
                    _KpiChip(label: 'Trees', value: '${summary['tree_count'] ?? 0}'),
                    _KpiChip(label: 'Open violations', value: '${summary['open_violations'] ?? 0}'),
                    _KpiChip(label: 'Survival due', value: '${summary['survival_due'] ?? 0}'),
                  ],
                ),
                const SizedBox(height: 24),
                Text('Recent violations', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                if (violations.isEmpty)
                  const Text('No open violations.', style: TextStyle(color: AranyixColors.onSurfaceMuted))
                else
                  for (final raw in violations)
                    _ViolationTile(
                      violation: Map<String, dynamic>.from(raw as Map),
                      onResolve: () => _resolve(context, ref, Map<String, dynamic>.from(raw)),
                    ),
                const SizedBox(height: 24),
                Text('Survival due by project', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                if (withSurvival.isEmpty)
                  const Text('No survival surveys due.', style: TextStyle(color: AranyixColors.onSurfaceMuted))
                else
                  for (final raw in withSurvival)
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text((raw as Map)['name'] as String? ?? 'Project'),
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
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Violation resolved')));
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
        title: Text(violation['message'] as String? ?? violation['violation_type'] as String? ?? 'Violation'),
        subtitle: Text(
          '${violation['project_name'] ?? ''} · ${violation['severity'] ?? ''}',
        ),
        trailing: TextButton(onPressed: onResolve, child: const Text('Resolve')),
      ),
    );
  }
}
