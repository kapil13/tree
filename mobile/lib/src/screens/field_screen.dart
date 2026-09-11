import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../field_ops_actions.dart';
import '../nav_access.dart';
import '../project_context.dart';
import '../providers.dart';
import '../session.dart';
import '../widgets/offline_tree_queue_section.dart';
import '../widgets/project_picker_sheet.dart';
import '../widgets/prototype/prototype_ui.dart';
import '../widgets/shell_scaffold.dart';

/// Field tab — matches design/prototypes v4.2 renderField().
class FieldScreen extends ConsumerWidget {
  const FieldScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final user = sessionController.user;
    final showOps = canSeeFieldOps(user);
    final projectsAsync = ref.watch(plantingProjectsProvider);
    final selectedId = ref.watch(selectedProjectIdProvider);
    final projects = projectsAsync.maybeWhen(data: (d) => d, orElse: () => <dynamic>[]);
    final projectLabel = selectedProjectLabel(context, projects, selectedId);

    return Scaffold(
      backgroundColor: PrototypeColors.bgApp,
      appBar: PrototypeCommandBar(
        title: l10n.navField,
        projectLabel: projectLabel,
        onMenu: () => openAppDrawer(context),
        onProject: projects.isNotEmpty ? () => showProjectPickerSheet(context, ref) : null,
        actions: [
          IconButton(
            icon: const Icon(Icons.map_outlined),
            tooltip: l10n.map,
            onPressed: () => context.go('/map'),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: showOps ? _FieldOpsBody(projectLabel: projectLabel) : _FieldCaptureBody(user: user, projectLabel: projectLabel),
          ),
          if (canAddTrees(user))
            PrototypeFieldCaptureBar(
              label: 'Capture tree here',
              onPressed: () => context.push('/trees/new'),
            ),
        ],
      ),
    );
  }
}

class _FieldCaptureBody extends ConsumerWidget {
  const _FieldCaptureBody({required this.user, required this.projectLabel});

  final Map<String, dynamic>? user;
  final String projectLabel;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final treesAsync = ref.watch(treesProvider);
    final alertsAsync = ref.watch(alertsProvider);
    final alerts = alertsAsync.maybeWhen(data: (d) => d, orElse: () => <dynamic>[]);
    final nextAlert = alerts.cast<Map<String, dynamic>?>().firstWhere(
          (a) => a?['is_read'] != true,
          orElse: () => null,
        );

    return RefreshIndicator(
      color: PrototypeColors.brandCanopy,
      onRefresh: () async {
        ref.invalidate(treesProvider);
        ref.invalidate(alertsProvider);
      },
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          const PendingSyncBanner(),
          PrototypeContextStrip(project: projectLabel, meta: l10n.registerTreePrimarySub),
          PrototypeSectionHeader(
            title: 'Tree registry',
            linkLabel: l10n.viewAll,
            onLink: () => context.go('/trees'),
          ),
          if (nextAlert != null)
            PrototypeNextUpHero(
              fieldStyle: true,
              label: 'Nearest action',
              title: nextAlert['title'] as String? ?? 'Field task',
              subtitle: nextAlert['message'] as String? ?? 'Tap to inspect on map or resolve',
              action: 'Go →',
              onTap: () => context.go('/notifications'),
            )
          else
            PrototypeNextUpHero(
              fieldStyle: true,
              label: 'Ready to capture',
              title: l10n.registerTreeInField,
              subtitle: 'GPS · photos · species — synced when online',
              action: 'Start →',
              onTap: () => context.push('/trees/new'),
            ),
          PrototypeSectionHeader(
            title: "Today's queue",
            linkLabel: 'Sync',
            onLink: () => context.push('/sync-queue'),
          ),
          for (final raw in alerts.take(4))
            PrototypePriorityCard(
              icon: (raw as Map)['severity'] == 'critical' ? '!' : '📋',
              title: (raw)['title'] as String? ?? 'Task',
              subtitle: (raw)['message'] as String? ?? '',
              severity: (raw)['severity'] as String? ?? 'medium',
              onTap: () => context.go('/notifications'),
            ),
          PrototypeSectionHeader(
            title: 'Nearby trees',
            linkLabel: l10n.viewAll,
            onLink: () => context.go('/trees'),
          ),
          treesAsync.when(
            loading: () => const LinearProgressIndicator(),
            error: (e, _) => Text(apiErrorMessage(e)),
            data: (items) {
              if (items.isEmpty) {
                return Text(l10n.noTreesYet, style: const TextStyle(color: PrototypeColors.textSecondary));
              }
              return Column(
                children: [
                  for (final raw in items.take(5))
                    PrototypePriorityCard(
                      icon: '🌳',
                      title: (raw as Map)['species_text'] as String? ?? l10n.treeFallback,
                      subtitle: raw['public_code'] as String? ?? '',
                      onTap: () => context.push('/trees/${raw['id']}'),
                    ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

class _FieldOpsBody extends ConsumerWidget {
  const _FieldOpsBody({required this.projectLabel});

  final String projectLabel;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final summaryAsync = ref.watch(fieldOpsSummaryProvider);
    final auditPlotsAsync = ref.watch(auditFieldPlotQueueProvider);
    final alertsAsync = ref.watch(alertsProvider);
    final alerts = alertsAsync.maybeWhen(data: (d) => d, orElse: () => <dynamic>[]);

    return summaryAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text(apiErrorMessage(e))),
      data: (summary) {
        final violations = List<dynamic>.from(summary['recent_violations'] ?? []);
        final projects = List<dynamic>.from(summary['projects'] ?? []);
        final withSurvival = projects
            .where((p) => ((p as Map)['survival_due'] as num?)?.toInt() != null &&
                (p['survival_due'] as num).toInt() > 0)
            .toList();
        final auditPlots = auditPlotsAsync.maybeWhen(
          data: (queue) => List<dynamic>.from(queue['items'] ?? []),
          orElse: () => <dynamic>[],
        );
        final auditPlotsDue = (summary['audit_plots_due'] as num?)?.toInt() ??
            auditPlots.length;
        final nextViolation = violations.isNotEmpty ? violations.first as Map : null;

        return RefreshIndicator(
          color: PrototypeColors.brandCanopy,
          onRefresh: () async {
            ref.invalidate(fieldOpsSummaryProvider);
            ref.invalidate(auditFieldPlotQueueProvider);
          },
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            children: [
              const PendingSyncBanner(),
              PrototypeContextStrip(
                project: projectLabel,
                meta: '${summary['tree_count'] ?? 0} trees · ${summary['open_violations'] ?? 0} violations open',
              ),
              PrototypeSectionHeader(
                title: 'Tree registry',
                linkLabel: l10n.viewAll,
                onLink: () => context.go('/trees'),
              ),
              if (nextViolation != null)
                PrototypeNextUpHero(
                  fieldStyle: true,
                  label: 'Nearest action',
                  title: nextViolation['message'] as String? ?? nextViolation['violation_type'] as String? ?? 'Violation',
                  subtitle: nextViolation['project_name'] as String? ?? '',
                  action: 'Resolve →',
                  onTap: () => resolveComplianceViolation(
                    context,
                    ref,
                    Map<String, dynamic>.from(nextViolation),
                  ),
                ),
              PrototypeSignalStrip(
                signals: [
                  PrototypeSignal(value: '${summary['project_count'] ?? 0}', label: l10n.projects),
                  PrototypeSignal(value: '${summary['tree_count'] ?? 0}', label: l10n.trees),
                  PrototypeSignal(value: '${summary['open_violations'] ?? 0}', label: 'Violations'),
                  PrototypeSignal(value: '${summary['survival_due'] ?? 0}', label: 'Survival'),
                  if (auditPlotsDue > 0)
                    PrototypeSignal(value: '$auditPlotsDue', label: 'Audit plots'),
                ],
              ),
              PrototypeSectionHeader(
                title: "Today's queue",
                linkLabel: 'Sync',
                onLink: () => context.push('/sync-queue'),
              ),
              for (final raw in violations.take(3))
                PrototypePriorityCard(
                  icon: '!',
                  title: (raw as Map)['message'] as String? ?? l10n.violationFallback,
                  subtitle: '${raw['project_name'] ?? ''} · ${raw['severity'] ?? ''}',
                  severity: 'high',
                  action: l10n.resolve,
                  onTap: () => resolveComplianceViolation(
                    context,
                    ref,
                    Map<String, dynamic>.from(raw),
                  ),
                ),
              for (final raw in alerts.take(2))
                PrototypePriorityCard(
                  icon: '!',
                  title: (raw as Map)['title'] as String? ?? 'Alert',
                  subtitle: (raw)['message'] as String? ?? '',
                  onTap: () => context.go('/notifications'),
                ),
              PrototypeSectionHeader(
                title: l10n.auditWorkspaceTitle,
                linkLabel: l10n.viewAll,
                onLink: () => context.push('/audit'),
              ),
              PrototypePriorityCard(
                icon: '🛡',
                title: l10n.auditWorkspaceTitle,
                subtitle: auditPlotsDue > 0
                    ? l10n.auditPlotsDueTitle(auditPlotsDue)
                    : l10n.auditPlotsAllVisited,
                onTap: () => context.push('/audit'),
              ),
              if (auditPlots.isNotEmpty) ...[
                PrototypeSectionHeader(
                  title: l10n.auditPlotVisits,
                  linkLabel: l10n.viewAll,
                  onLink: () => context.push('/audit-plots'),
                ),
                for (final raw in auditPlots.take(4))
                  PrototypePriorityCard(
                    icon: '📍',
                    title: (raw as Map)['plot_code'] as String? ?? 'Audit plot',
                    subtitle:
                        '${raw['project_name'] ?? ''} · ${raw['risk_level'] ?? ''} risk',
                    onTap: () => context.push('/audit-plots'),
                  ),
              ],
              if (withSurvival.isNotEmpty) ...[
                PrototypeSectionHeader(title: l10n.survivalDueByProject),
                for (final raw in withSurvival.take(5))
                  PrototypeConnectedProject(
                    name: (raw as Map)['name'] as String? ?? l10n.projectFallback,
                    meta: '${raw['survival_due']} trees due · ${raw['segment'] ?? ''}',
                    badge: '${raw['survival_due']} due',
                    badgeOk: false,
                    onTap: () => context.push('/projects/${raw['id']}'),
                  ),
              ],
              PrototypeSectionHeader(title: 'Projects', linkLabel: l10n.viewAllProjects, onLink: () => context.go('/projects')),
              for (final raw in projects.take(3))
                PrototypeConnectedProject(
                  name: (raw as Map)['name'] as String? ?? l10n.projectFallback,
                  meta: '${raw['survival_due'] ?? 0} survival due',
                  badge: '${raw['survival_due'] ?? 0} due',
                  badgeOk: ((raw['survival_due'] as num?)?.toInt() ?? 0) == 0,
                  onTap: () => context.push('/projects/${raw['id']}'),
                ),
            ],
          ),
        );
      },
    );
  }
}
