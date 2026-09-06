import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../api/auth_redirect.dart';
import '../nav_access.dart';
import '../providers.dart';
import '../session.dart';
import '../theme.dart';
import '../widgets/offline_tree_queue_section.dart';
import '../widgets/primary_field_actions.dart';
import '../widgets/shell_scaffold.dart';

/// Field tab — capture, verify, queue, and nearby work (v4.2).
class FieldScreen extends ConsumerWidget {
  const FieldScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final user = sessionController.user;
    final showOps = canSeeFieldOps(user);

    return Scaffold(
      backgroundColor: AranyixColors.surface,
      appBar: ShellTopBar(
        title: l10n.navField,
        subtitle: user?['organization_name'] as String?,
      ),
      body: showOps
          ? _FieldOpsBody()
          : _FieldCaptureBody(user: user),
    );
  }
}

class _FieldCaptureBody extends ConsumerWidget {
  const _FieldCaptureBody({required this.user});

  final Map<String, dynamic>? user;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final projectsAsync = ref.watch(plantingProjectsProvider);
    final treesAsync = ref.watch(treesProvider);

    return RefreshIndicator(
      color: AranyixColors.forest,
      onRefresh: () async {
        ref.invalidate(plantingProjectsProvider);
        ref.invalidate(treesProvider);
      },
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: [
          const PendingSyncBanner(),
          Text(
            l10n.registerTreePrimarySub,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AranyixColors.onSurfaceMuted,
                ),
          ),
          const SizedBox(height: 16),
          PrimaryFieldActions(user: user),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(l10n.trees, style: Theme.of(context).textTheme.titleMedium),
              TextButton(
                onPressed: () => context.go('/trees'),
                child: Text(l10n.viewAll),
              ),
            ],
          ),
          const SizedBox(height: 8),
          treesAsync.when(
            loading: () => const LinearProgressIndicator(),
            error: (e, _) {
              if (maybeRedirectUnauthorized(ref, context, e)) {
                return const SizedBox.shrink();
              }
              return Text(apiErrorMessage(e));
            },
            data: (items) {
              if (items.isEmpty) {
                return Text(
                  l10n.noTreesYet,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AranyixColors.onSurfaceMuted,
                      ),
                );
              }
              return Column(
                children: [
                  for (final raw in items.take(6))
                    Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        leading: const Icon(Icons.park_outlined, color: AranyixColors.forest),
                        title: Text(
                          (raw as Map<String, dynamic>)['species_text'] as String? ?? l10n.treeFallback,
                        ),
                        subtitle: Text(raw['public_code'] as String? ?? ''),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () => context.push('/trees/${raw['id']}'),
                      ),
                    ),
                ],
              );
            },
          ),
          if (canSeeProjects(user)) ...[
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(l10n.projects, style: Theme.of(context).textTheme.titleMedium),
                TextButton(
                  onPressed: () => context.go('/projects'),
                  child: Text(l10n.viewAllProjects),
                ),
              ],
            ),
            const SizedBox(height: 8),
            projectsAsync.when(
              loading: () => const LinearProgressIndicator(),
              error: (e, _) {
                if (maybeRedirectUnauthorized(ref, context, e)) {
                  return const SizedBox.shrink();
                }
                return Text(apiErrorMessage(e));
              },
              data: (projects) {
                if (projects.isEmpty) {
                  return Text(
                    l10n.noProjectsAssigned,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AranyixColors.onSurfaceMuted,
                        ),
                  );
                }
                return Column(
                  children: [
                    for (final raw in projects.take(4))
                      Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          leading: const Icon(Icons.assignment_outlined, color: AranyixColors.forest),
                          title: Text((raw as Map<String, dynamic>)['name'] as String? ?? l10n.projectFallback),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () => context.push('/projects/${raw['id']}'),
                        ),
                      ),
                  ],
                );
              },
            ),
          ],
        ],
      ),
    );
  }
}

class _FieldOpsBody extends ConsumerWidget {
  const _FieldOpsBody();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final summaryAsync = ref.watch(fieldOpsSummaryProvider);
    final user = ref.watch(userProvider).valueOrNull;

    return summaryAsync.when(
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
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
            children: [
              const PendingSyncBanner(),
              PrimaryFieldActions(user: user),
              const SizedBox(height: 16),
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
              const SizedBox(height: 20),
              if (canAdd)
                FilledButton.icon(
                  onPressed: () => context.push('/trees/new'),
                  icon: const Icon(Icons.add_circle_outline),
                  label: Text(l10n.registerTreeInField),
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
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(AppLocalizations.of(context)!.violationResolved)),
        );
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
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AranyixColors.surfaceElevated,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AranyixColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AranyixColors.forestDark)),
          Text(label, style: const TextStyle(fontSize: 11, color: AranyixColors.onSurfaceMuted)),
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
    final l10n = AppLocalizations.of(context)!;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        title: Text(
          violation['message'] as String? ??
              violation['violation_type'] as String? ??
              l10n.violationFallback,
        ),
        subtitle: Text(
          '${violation['project_name'] ?? ''} · ${violation['severity'] ?? ''}',
        ),
        trailing: TextButton(onPressed: onResolve, child: Text(l10n.resolve)),
      ),
    );
  }
}
