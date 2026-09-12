import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../l10n/alert_labels.dart';
import '../nav_access.dart';
import '../providers.dart';
import '../session.dart';
import '../widgets/hazard_summary_card.dart';
import '../widgets/offline_connectivity_banner.dart';
import '../widgets/prototype/prototype_ui.dart';
import '../widgets/shell_scaffold.dart';

class MonitoringScreen extends ConsumerWidget {
  const MonitoringScreen({super.key});

  void _openWorkArea(BuildContext context, Map raw) {
    final projectId = raw['project_id'] as String?;
    if (projectId != null && projectId.isNotEmpty) {
      context.push('/projects/$projectId');
      return;
    }
    final workAreaId = raw['id'] as String? ?? raw['work_area_id'] as String?;
    if (workAreaId != null && workAreaId.isNotEmpty) {
      context.push('/map?focus=$workAreaId');
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final lang = Localizations.localeOf(context).languageCode;
    final summaryAsync = ref.watch(monitoringSummaryProvider);
    final alertsAsync = ref.watch(alertsProvider);
    final bioSummaryAsync = ref.watch(bioacousticSummaryProvider);
    final user = sessionController.user;
    final unread = alertsAsync.maybeWhen(
      data: (items) => items.where((a) => (a as Map)['is_read'] != true).length,
      orElse: () => 0,
    );

    return Scaffold(
      backgroundColor: PrototypeColors.bgApp,
      appBar: PrototypeCommandBar(
        title: l10n.monitoring,
        onMenu: () => openAppDrawer(context),
        alertCount: unread,
        onAlerts: () => context.go('/notifications'),
      ),
      body: summaryAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: PrototypeColors.brandCanopy)),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(apiErrorMessage(e), textAlign: TextAlign.center),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () => ref.invalidate(monitoringSummaryProvider),
                  style: FilledButton.styleFrom(backgroundColor: PrototypeColors.brandForest),
                  child: Text(l10n.retry),
                ),
              ],
            ),
          ),
        ),
        data: (summary) {
          final workAreas = List<dynamic>.from(summary['work_area_monitoring'] ?? []);
          final highlightFenceId = GoRouterState.of(context).uri.queryParameters['fence'];
          final decisionAlerts = alertsAsync.maybeWhen(
            data: (items) => items
                .where((a) {
                  final m = a as Map;
                  final sev = m['severity'] as String? ?? '';
                  return sev == 'critical' || sev == 'high' || m['is_read'] != true;
                })
                .take(3)
                .toList(),
            orElse: () => <dynamic>[],
          );

          return RefreshIndicator(
            color: PrototypeColors.brandCanopy,
            onRefresh: () async {
              ref.invalidate(monitoringSummaryProvider);
              ref.invalidate(alertsProvider);
              ref.invalidate(bioacousticSummaryProvider);
            },
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              children: [
                const OfflineConnectivityBanner(),
                HazardSummaryCard(
                  hazardCounts: Map<String, int>.from(
                    (summary['unread_hazard_alerts_by_kind'] as Map?)?.map(
                          (k, v) => MapEntry('$k', (v as num).toInt()),
                        ) ??
                        const {},
                  ),
                  firmsLive: (summary['scan_engine'] as Map?)?['firms_live'] as bool?,
                ),
                const SizedBox(height: 8),
                PrototypeSectionHeader(
                  title: 'Needs decision',
                  linkLabel: 'Field',
                  onLink: canSeeFieldOps(user) ? () => context.go('/field') : null,
                ),
                if (decisionAlerts.isEmpty)
                  const PrototypeEmptyState(icon: '✓', title: 'No urgent alerts', subtitle: 'Monitoring signals are stable')
                else
                  for (final raw in decisionAlerts)
                    PrototypeMonitorCard(
                      title: (raw as Map)['title'] as String? ?? 'Alert',
                      subtitle: (raw)['message'] as String? ?? '',
                      actionHint: alertKindLabel((raw)['kind'] as String? ?? '', languageCode: lang),
                      severity: (raw)['severity'] as String? ?? 'moderate',
                      onTap: () => context.push('/alerts/${(raw)['id']}'),
                    ),
                PrototypeSectionHeader(
                  title: 'Site pulse',
                  linkLabel: l10n.map,
                  onLink: () => context.go('/map'),
                ),
                if (workAreas.isEmpty)
                  Text(
                    l10n.monitoringNoWorkAreas(
                      '${summary['open_violations'] ?? 0}',
                      '${summary['survival_due'] ?? 0}',
                    ),
                    style: const TextStyle(color: PrototypeColors.textSecondary),
                  )
                else
                  for (final raw in workAreas.take(12))
                    PrototypeNdviRow(
                      site: (raw as Map)['name'] as String? ?? l10n.monitoringWorkAreaFallback,
                      ndvi: (raw['latest_ndvi'] as num?)?.toDouble(),
                      meta: [
                        raw['project_name'] ?? '',
                        if (raw['latest_ndvi'] != null) 'NDVI ${raw['latest_ndvi']}',
                        if (raw['days_since_scan'] != null)
                          l10n.monitoringDaysSinceNdvi('${raw['days_since_scan']}'),
                      ].where((s) => s.toString().isNotEmpty).join(' · '),
                      actionLabel: raw['sar_recommended_action'] as String? ?? 'OK',
                      onTap: () => _openWorkArea(context, raw),
                    ),
                const SizedBox(height: 8),
                bioSummaryAsync.when(
                  loading: () => const SizedBox.shrink(),
                  error: (_, __) => const SizedBox.shrink(),
                  data: (bio) {
                    final species = (bio['species_richness'] as num?)?.toInt() ??
                        (bio['total_species_detected'] as num?)?.toInt() ?? 0;
                    final shannon = bio['shannon_diversity_index'];
                    return Material(
                      color: PrototypeColors.bgSurface,
                      borderRadius: BorderRadius.circular(PrototypeRadii.lg),
                      child: InkWell(
                        onTap: () => context.go('/bioacoustic'),
                        borderRadius: BorderRadius.circular(PrototypeRadii.lg),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(PrototypeRadii.lg),
                            border: Border.all(color: PrototypeColors.border),
                          ),
                          child: Row(
                            children: [
                              const Text('🎙', style: TextStyle(fontSize: 18)),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  '$species species · Shannon ${shannon ?? '—'}',
                                  style: const TextStyle(fontSize: 13, color: PrototypeColors.textSecondary),
                                ),
                              ),
                              const Icon(Icons.chevron_right, size: 16, color: PrototypeColors.textTertiary),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
