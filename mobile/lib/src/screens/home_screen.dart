import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../api/auth_redirect.dart';
import '../dashboard/dashboard_brief.dart';
import '../field_ops_actions.dart';
import '../nav_access.dart';
import '../project_context.dart';
import '../providers.dart';
import '../session.dart';
import '../widgets/offline_connectivity_banner.dart';
import '../widgets/offline_tree_queue_section.dart';
import '../widgets/project_picker_sheet.dart';
import '../widgets/prototype/prototype_ui.dart';
import '../widgets/shell_scaffold.dart';

/// Command center home — matches design/prototypes v4.2 renderHome().
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashAsync = ref.watch(dashboardProvider);
    final alertsAsync = ref.watch(alertsProvider);
    final fieldOpsAsync = ref.watch(fieldOpsSummaryProvider);
    final weatherAsync = ref.watch(weatherProvider);
    final fencesAsync = ref.watch(plantationFencesProvider);
    final projectsAsync = ref.watch(plantingProjectsProvider);
    final selectedProjectId = ref.watch(selectedProjectIdProvider);
    final userAsync = ref.watch(userProvider);
    final user = sessionController.user ?? userAsync.valueOrNull;
    final l10n = AppLocalizations.of(context)!;
    final projects = projectsAsync.maybeWhen(data: (d) => d, orElse: () => <dynamic>[]);
    final projectLabel = selectedProjectLabel(context, projects, selectedProjectId);

    return Scaffold(
      backgroundColor: PrototypeColors.bgApp,
      appBar: dashAsync.maybeWhen(
        data: (dashboard) {
          final alerts = alertsAsync.maybeWhen(data: (d) => d, orElse: () => <dynamic>[]);
          final unread = alerts.where((a) => (a as Map)['is_read'] != true).length;
          return PrototypeCommandBar(
            title: 'Command center',
            projectLabel: projectLabel,
            onMenu: () => openAppDrawer(context),
            onProject: projects.isNotEmpty ? () => showProjectPickerSheet(context, ref) : null,
            alertCount: unread,
            onAlerts: () => context.go('/notifications'),
          );
        },
        orElse: () => PrototypeCommandBar(
          title: 'Command center',
          onMenu: () => openAppDrawer(context),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: RefreshIndicator(
        color: PrototypeColors.brandCanopy,
        onRefresh: () async {
          ref.invalidate(dashboardProvider);
          ref.invalidate(alertsProvider);
          ref.invalidate(weatherProvider);
          ref.invalidate(fieldOpsSummaryProvider);
          ref.invalidate(plantationFencesProvider);
          ref.invalidate(treesProvider);
        },
        child: dashAsync.when(
          loading: () => const Padding(
            padding: EdgeInsets.all(16),
            child: PrototypeLoadingSkeleton(lines: 6),
          ),
          error: (e, _) {
            if (maybeRedirectUnauthorized(ref, context, e)) {
              return const Center(child: CircularProgressIndicator());
            }
            return ListView(
              children: [
                SizedBox(
                  height: MediaQuery.of(context).size.height * 0.4,
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(apiErrorMessage(e), textAlign: TextAlign.center),
                        const SizedBox(height: 12),
                        FilledButton(
                          onPressed: () => ref.invalidate(dashboardProvider),
                          child: Text(l10n.retry),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            );
          },
          data: (dashboard) {
            final alerts = alertsAsync.maybeWhen(data: (d) => d, orElse: () => <dynamic>[]);
            final weather = weatherAsync.maybeWhen(data: (d) => d, orElse: () => null);
            final fences = fencesAsync.maybeWhen(data: (d) => d, orElse: () => <dynamic>[]);
            final health = computeForestHealth(dashboard, l10n: l10n);
            final briefLines = buildAiBriefLines(dashboard: dashboard, l10n: l10n, alerts: alerts, weather: weather);
            final priority = pickPriorityAlert(alerts, l10n: l10n);
            final kpi = dashboard['kpi'] as Map<String, dynamic>? ?? {};
            final bio = dashboard['bioacoustic'] as Map<String, dynamic>? ?? {};
            final trees = (kpi['total_trees'] as num?)?.toInt() ?? 0;
            final unreadAlerts = alerts.where((a) => (a as Map)['is_read'] != true).length;
            final attentionCount = alerts
                .where((a) {
                  final sev = (a as Map)['severity'] as String? ?? '';
                  return sev == 'critical' || sev == 'high' || sev == 'moderate';
                })
                .length;
            final species = (bio['total_species_detected'] as num?)?.toInt() ?? 0;
            final statusLevel = health.score >= 75
                ? PrototypeStatusLevel.healthy
                : health.score >= 50
                    ? PrototypeStatusLevel.attention
                    : PrototypeStatusLevel.critical;
            final statusLabel = health.score >= 75 ? 'Portfolio healthy' : health.score >= 50 ? 'Needs attention' : 'Critical signals';
            final projectName = projectLabel;
            final fieldSummary = fieldOpsAsync.maybeWhen(data: (d) => d, orElse: () => null);
            final queueItems = buildHomeQueueItems(
              alerts: alerts,
              l10n: l10n,
              fieldSummary: fieldSummary,
              includeFieldOps: canSeeFieldOps(user),
            );

            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              children: [
                const OfflineConnectivityBanner(),
                const PendingSyncBanner(),
                PrototypeContextStrip(
                  project: projectName,
                  meta: homeContextMeta(
                    trees: trees,
                    treesRegisteredLabel: l10n.dashboardTreesRegistered(trees),
                    emptyTreesLabel: l10n.registerTreePrimarySub,
                    weather: weather,
                  ),
                ),
                PrototypeStatusBanner(
                  title: statusLabel,
                  detail: briefLines.isNotEmpty ? briefLines.first : health.label,
                  score: health.score,
                  level: statusLevel,
                  onTap: () => context.go('/monitoring'),
                ),
                if (priority != null)
                  PrototypeNextUpHero(
                    label: 'Next up',
                    title: priority.title,
                    subtitle: priority.zone,
                    action: 'View →',
                    onTap: () => context.go('/notifications'),
                  ),
                PrototypeSignalStrip(
                  signals: [
                    PrototypeSignal(
                      value: '$unreadAlerts',
                      label: 'Alerts',
                      onTap: () => context.go('/notifications'),
                    ),
                    PrototypeSignal(
                      value: '$attentionCount',
                      label: 'Attention',
                      onTap: () => context.go('/trees'),
                    ),
                    PrototypeSignal(
                      value: '$trees',
                      label: 'Trees',
                      onTap: () => context.go('/trees'),
                    ),
                    if (canSeeBioacoustic(user))
                      PrototypeSignal(
                        value: '$species',
                        label: 'Species',
                        onTap: () => context.go('/bioacoustic'),
                      )
                    else
                      PrototypeSignal(
                        value: '${(kpi['pct_healthy'] as num?)?.round() ?? 0}%',
                        label: 'Healthy',
                        onTap: () => context.go('/trees'),
                      ),
                  ],
                ),
                PrototypeSectionHeader(
                  title: l10n.dashboardAlertsSection,
                  linkLabel: l10n.navField,
                  onLink: () => context.go('/field'),
                ),
                if (queueItems.isEmpty)
                  PrototypePriorityCard(
                    icon: '✓',
                    title: l10n.dashboardNoUrgentAlerts,
                    subtitle: l10n.dashboardAlertsClear,
                    action: l10n.navField,
                    onTap: () => context.go('/field'),
                  )
                else
                  for (final item in queueItems)
                    PrototypePriorityCard(
                      icon: item.kind == 'violation' ? '!' : item.kind == 'survival' ? '🌳' : '!',
                      title: item.title,
                      subtitle: item.subtitle,
                      severity: item.severity,
                      action: item.kind == 'survival' ? l10n.viewAll : 'Open',
                      onTap: () {
                        switch (item.kind) {
                          case 'violation':
                            if (item.violation != null) {
                              resolveComplianceViolation(context, ref, item.violation!);
                            } else {
                              context.go('/field');
                            }
                          case 'survival':
                            if (item.projectId != null) {
                              context.push('/projects/${item.projectId}');
                            } else {
                              context.go('/field');
                            }
                          default:
                            context.go('/notifications');
                        }
                      },
                    ),
                PrototypeSectionHeader(
                  title: 'Spatial',
                  linkLabel: 'Map',
                  onLink: () => context.go('/map'),
                ),
                PrototypeMapPreview(
                  label: '$unreadAlerts alerts · tap to inspect map',
                  onTap: () => context.go('/map'),
                ),
                if (fences.isNotEmpty)
                  PrototypeConnectedProject(
                    name: (fences.first as Map)['name'] as String? ?? l10n.projectFallback,
                    meta: '$trees trees · integrity ${health.score} · ${health.label}',
                    badge: health.score >= 75 ? 'On track' : 'Review',
                    badgeOk: health.score >= 75,
                    onTap: () {
                      final id = (fences.first as Map)['id'];
                      if (id != null) context.push('/projects/$id');
                    },
                  ),
                if (canSeeBioacoustic(user) && (bio['total_recordings'] as num? ?? 0) > 0) ...[
                  Material(
                    color: PrototypeColors.bgSurface,
                    borderRadius: BorderRadius.circular(PrototypeRadii.md),
                    child: InkWell(
                      onTap: () => context.go('/bioacoustic'),
                      borderRadius: BorderRadius.circular(PrototypeRadii.md),
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 16),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          border: Border.all(color: PrototypeColors.border),
                          borderRadius: BorderRadius.circular(PrototypeRadii.md),
                        ),
                        child: Row(
                          children: [
                            const Text('🎙', style: TextStyle(fontSize: 18)),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                '${species > 0 ? '$species species detected' : 'Bioacoustic monitoring active'}',
                                style: const TextStyle(fontSize: 13, color: PrototypeColors.textSecondary),
                              ),
                            ),
                            const Icon(Icons.chevron_right, size: 16, color: PrototypeColors.textTertiary),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
                const PrototypeSectionHeader(title: 'Live feed'),
                for (final raw in alerts.take(3))
                  PrototypeActivityItem(
                    title: (raw as Map)['title'] as String? ?? 'Activity',
                    time: (raw)['created_at'] as String? ?? '',
                    onTap: () => context.go('/notifications'),
                  ),
              ],
            );
          },
        ),
            ),
          ),
          if (canAddTrees(user))
            PrototypeFieldCaptureBar(
              label: l10n.registerTreeInField,
              onPressed: () => context.push('/trees/new'),
            ),
        ],
      ),
    );
  }

}
