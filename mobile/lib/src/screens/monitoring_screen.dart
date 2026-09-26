import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../api/auth_redirect.dart';
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

  List<dynamic> _orderedWorkAreas(List<dynamic> workAreas, String? highlightFenceId) {
    if (highlightFenceId == null || highlightFenceId.isEmpty) return workAreas;
    final highlighted = <dynamic>[];
    final rest = <dynamic>[];
    for (final raw in workAreas) {
      final id = (raw as Map)['id']?.toString();
      if (id == highlightFenceId) {
        highlighted.add(raw);
      } else {
        rest.add(raw);
      }
    }
    return [...highlighted, ...rest];
  }

  void _openWorkArea(BuildContext context, Map raw) {
    final workAreaId = raw['id'] as String? ?? raw['work_area_id'] as String?;
    if (workAreaId != null && workAreaId.isNotEmpty) {
      context.push('/map?fence=$workAreaId');
      return;
    }
    final projectId = raw['project_id'] as String?;
    if (projectId != null && projectId.isNotEmpty) {
      context.push('/projects/$projectId');
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
        actions: [
          IconButton(
            tooltip: 'Portfolio health',
            icon: const Icon(Icons.dashboard_outlined),
            onPressed: () => context.push('/portfolio?tab=1'),
          ),
          IconButton(
            tooltip: 'Satellite workspace',
            icon: const Icon(Icons.satellite_alt_outlined),
            onPressed: () => context.push('/satellite'),
          ),
        ],
      ),
      body: summaryAsync.when(
        loading: () => const Padding(
          padding: EdgeInsets.all(16),
          child: PrototypeLoadingSkeleton(lines: 5),
        ),
        error: (e, _) {
          if (maybeRedirectUnauthorized(ref, context, e)) {
            return const SizedBox.shrink();
          }
          return Center(
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
        );
        },
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
                  title: l10n.monitoringNeedsDecision,
                  linkLabel: l10n.navField,
                  onLink: canSeeFieldOps(user) ? () => context.go('/field') : null,
                ),
                if (decisionAlerts.isEmpty)
                  PrototypeEmptyState(icon: '✓', title: l10n.monitoringNoUrgentAlerts, subtitle: l10n.monitoringSignalsStable)
                else
                  for (final raw in decisionAlerts)
                    PrototypeMonitorCard(
                      title: (raw as Map)['title'] as String? ?? l10n.alertFallback,
                      subtitle: (raw)['message'] as String? ?? '',
                      actionHint: alertKindLabel((raw)['kind'] as String? ?? '', languageCode: lang),
                      severity: (raw)['severity'] as String? ?? 'moderate',
                      onTap: () => context.push('/alerts/${(raw)['id']}'),
                    ),
                PrototypeSectionHeader(
                  title: l10n.monitoringSitePulse,
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
                else ...[
                  for (final raw in _orderedWorkAreas(workAreas, highlightFenceId).take(12))
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
                      highlighted: highlightFenceId != null &&
                          highlightFenceId.isNotEmpty &&
                          raw['id']?.toString() == highlightFenceId,
                      onTap: () => _openWorkArea(context, raw),
                    ),
                ],
                const SizedBox(height: 8),
                bioSummaryAsync.when(
                  loading: () => const SizedBox.shrink(),
                  error: (e, _) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Material(
                      color: PrototypeColors.bgSurface,
                      borderRadius: BorderRadius.circular(PrototypeRadii.lg),
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              l10n.monitoringBioLoadError,
                              style: const TextStyle(
                                fontSize: 13,
                                color: PrototypeColors.textSecondary,
                              ),
                            ),
                            const SizedBox(height: 8),
                            TextButton(
                              onPressed: () => ref.invalidate(bioacousticSummaryProvider),
                              child: Text(l10n.retry),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
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
