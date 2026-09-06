import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../api/auth_redirect.dart';
import '../dashboard/dashboard_brief.dart';
import '../nav_access.dart';
import '../providers.dart';
import '../session.dart';
import '../widgets/offline_connectivity_banner.dart';
import '../widgets/offline_tree_queue_section.dart';
import '../widgets/prototype/prototype_ui.dart';
import '../widgets/shell_scaffold.dart';

/// Command center home — matches design/prototypes v4.2 renderHome().
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashAsync = ref.watch(dashboardProvider);
    final alertsAsync = ref.watch(alertsProvider);
    final weatherAsync = ref.watch(weatherProvider);
    final fencesAsync = ref.watch(plantationFencesProvider);
    final userAsync = ref.watch(userProvider);
    final user = sessionController.user ?? userAsync.valueOrNull;
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      backgroundColor: PrototypeColors.bgApp,
      appBar: dashAsync.maybeWhen(
        data: (dashboard) {
          final alerts = alertsAsync.maybeWhen(data: (d) => d, orElse: () => <dynamic>[]);
          final fences = fencesAsync.maybeWhen(data: (d) => d, orElse: () => <dynamic>[]);
          final unread = alerts.where((a) => (a as Map)['is_read'] != true).length;
          return PrototypeCommandBar(
            title: 'Command center',
            projectLabel: _projectLabel(fences, user, l10n),
            onMenu: () => openAppDrawer(context),
            onProject: fences.isNotEmpty ? () => _showProjectPicker(context, fences, l10n) : null,
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
          ref.invalidate(plantationFencesProvider);
          ref.invalidate(treesProvider);
        },
        child: dashAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
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
            final health = computeForestHealth(dashboard);
            final briefLines = buildAiBriefLines(dashboard: dashboard, alerts: alerts, weather: weather);
            final priority = pickPriorityAlert(alerts);
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
            final projectName = _projectLabel(fences, user, l10n);
            final queueAlerts = alerts.where((a) => (a as Map)['is_read'] != true).take(3).toList();

            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              children: [
                const OfflineConnectivityBanner(),
                const PendingSyncBanner(),
                PrototypeContextStrip(
                  project: projectName,
                  meta: trees > 0 ? '$trees trees registered' : l10n.registerTreePrimarySub,
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
                  title: 'Queue',
                  linkLabel: 'Field →',
                  onLink: () => context.go('/field'),
                ),
                if (queueAlerts.isEmpty)
                  PrototypePriorityCard(
                    icon: '✓',
                    title: 'No urgent items',
                    subtitle: 'Field queue is clear for now',
                    action: 'Field',
                    onTap: () => context.go('/field'),
                  )
                else
                  for (final raw in queueAlerts)
                    PrototypePriorityCard(
                      icon: '!',
                      title: (raw as Map)['title'] as String? ?? 'Alert',
                      subtitle: (raw)['message'] as String? ?? (raw)['severity'] as String? ?? '',
                      severity: (raw)['severity'] as String? ?? 'medium',
                      action: 'Open',
                      onTap: () => context.go('/notifications'),
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

  String _projectLabel(List<dynamic> fences, Map<String, dynamic>? user, AppLocalizations l10n) {
    if (fences.isNotEmpty) {
      final first = fences.first as Map<String, dynamic>;
      final name = first['name'] as String? ?? l10n.homeAllSites;
      if (fences.length == 1) return name;
      return '$name +${fences.length - 1}';
    }
    return user?['organization_name'] as String? ?? l10n.homeAllSites;
  }

  void _showProjectPicker(BuildContext context, List<dynamic> fences, AppLocalizations l10n) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: PrototypeColors.bgSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(PrototypeRadii.lg)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
              child: Text(l10n.projects, style: Theme.of(ctx).textTheme.titleLarge),
            ),
            for (final raw in fences)
              ListTile(
                leading: const Icon(Icons.folder_outlined, color: PrototypeColors.brandForest),
                title: Text((raw as Map<String, dynamic>)['name'] as String? ?? l10n.siteFallback),
                onTap: () => Navigator.pop(ctx),
              ),
          ],
        ),
      ),
    );
  }
}
