import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../nav_access.dart';
import '../providers.dart';
import '../session.dart';
import '../widgets/offline_tree_queue_section.dart';
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
    final fencesAsync = ref.watch(plantationFencesProvider);
    final fences = fencesAsync.maybeWhen(data: (d) => d, orElse: () => <dynamic>[]);
    final projectLabel = fences.isNotEmpty
        ? (fences.first as Map)['name'] as String? ?? l10n.homeAllSites
        : user?['organization_name'] as String? ?? l10n.homeAllSites;

    return Scaffold(
      backgroundColor: PrototypeColors.bgApp,
      appBar: PrototypeCommandBar(
        title: l10n.navField,
        projectLabel: projectLabel,
        onMenu: () => openAppDrawer(context),
        onProject: fences.isNotEmpty ? () {} : null,
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
            onLink: () {},
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
    final alertsAsync = ref.watch(alertsProvider);
    final alerts = alertsAsync.maybeWhen(data: (d) => d, orElse: () => <dynamic>[]);

    return summaryAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text(apiErrorMessage(e))),
      data: (summary) {
        final violations = List<dynamic>.from(summary['recent_violations'] ?? []);
        final projects = List<dynamic>.from(summary['projects'] ?? []);
        final nextViolation = violations.isNotEmpty ? violations.first as Map : null;

        return RefreshIndicator(
          color: PrototypeColors.brandCanopy,
          onRefresh: () async => ref.invalidate(fieldOpsSummaryProvider),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            children: [
              const PendingSyncBanner(),
              PrototypeContextStrip(
                project: projectLabel,
                meta: '${summary['tree_count'] ?? 0} trees · ${summary['open_violations'] ?? 0} violations open',
              ),
              if (nextViolation != null)
                PrototypeNextUpHero(
                  fieldStyle: true,
                  label: 'Nearest action',
                  title: nextViolation['message'] as String? ?? nextViolation['violation_type'] as String? ?? 'Violation',
                  subtitle: nextViolation['project_name'] as String? ?? '',
                  action: 'Go →',
                  onTap: () => context.go('/map'),
                ),
              PrototypeSignalStrip(
                signals: [
                  PrototypeSignal(value: '${summary['project_count'] ?? 0}', label: l10n.projects),
                  PrototypeSignal(value: '${summary['tree_count'] ?? 0}', label: l10n.trees),
                  PrototypeSignal(value: '${summary['open_violations'] ?? 0}', label: 'Violations'),
                  PrototypeSignal(value: '${summary['survival_due'] ?? 0}', label: 'Survival'),
                ],
              ),
              PrototypeSectionHeader(title: "Today's queue", linkLabel: 'Sync'),
              for (final raw in violations.take(3))
                PrototypePriorityCard(
                  icon: '!',
                  title: (raw as Map)['message'] as String? ?? l10n.violationFallback,
                  subtitle: '${raw['project_name'] ?? ''} · ${raw['severity'] ?? ''}',
                  severity: 'high',
                  onTap: () {},
                ),
              for (final raw in alerts.take(2))
                PrototypePriorityCard(
                  icon: '!',
                  title: (raw as Map)['title'] as String? ?? 'Alert',
                  subtitle: (raw)['message'] as String? ?? '',
                  onTap: () => context.go('/notifications'),
                ),
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
