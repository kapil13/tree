import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../nav_access.dart';
import '../providers.dart';
import '../session.dart';
import '../theme.dart';
import '../widgets/sar_monitoring_cards.dart';

class MonitoringScreen extends ConsumerWidget {
  const MonitoringScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summaryAsync = ref.watch(monitoringSummaryProvider);
    final user = sessionController.user;

    return Scaffold(
      backgroundColor: AranyixColors.surface,
      appBar: AppBar(title: const Text('Monitoring')),
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
                  onPressed: () => ref.invalidate(monitoringSummaryProvider),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
        data: (summary) {
          final stale = summary['stale_satellite_work_areas'] ?? 0;
          final sarAtRisk = summary['sar_at_risk_work_areas'] ?? 0;
          final sarAvg = summary['sar_avg_forest_integrity'];
          final sarDivergent = summary['sar_divergent_work_areas'] ?? 0;
          final sarAligned = summary['sar_aligned_work_areas'] ?? 0;
          final sarAlerts = Map<String, dynamic>.from(summary['unread_sar_alerts_by_kind'] ?? {});
          final alertsByKind = Map<String, dynamic>.from(summary['unread_alerts_by_kind'] ?? {});
          final workAreas = List<dynamic>.from(summary['work_area_monitoring'] ?? []);
          final fieldTasks = List<dynamic>.from(summary['open_sar_field_verifications'] ?? []);
          final highlightFenceId = GoRouterState.of(context).uri.queryParameters['fence'];

          return RefreshIndicator(
            color: AranyixColors.forest,
            onRefresh: () async => ref.invalidate(monitoringSummaryProvider),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    ActionChip(
                      avatar: const Icon(Icons.map_outlined, size: 18),
                      label: const Text('Map'),
                      onPressed: () => context.go('/map'),
                    ),
                    ActionChip(
                      avatar: const Icon(Icons.notifications_outlined, size: 18),
                      label: const Text('Alerts'),
                      onPressed: () => context.go('/notifications'),
                    ),
                    if (canSeeFieldOps(user))
                      ActionChip(
                        avatar: const Icon(Icons.construction_outlined, size: 18),
                        label: const Text('Field ops'),
                        onPressed: () => context.push('/field-ops'),
                      ),
                  ],
                ),
                const SizedBox(height: 16),
                SarIntegrityHeroCard(
                  avgIntegrity: sarAvg is num ? sarAvg : null,
                  atRisk: sarAtRisk is int ? sarAtRisk : int.tryParse('$sarAtRisk') ?? 0,
                  divergent: sarDivergent is int ? sarDivergent : int.tryParse('$sarDivergent') ?? 0,
                  aligned: sarAligned is int ? sarAligned : int.tryParse('$sarAligned') ?? 0,
                ),
                const SizedBox(height: 12),
                _StatCard(
                  title: 'Stale satellite scans',
                  value: '$stale',
                  subtitle: 'Work areas without a recent NDVI pass',
                ),
                if (fieldTasks.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  Text('Open SAR field verifications', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 8),
                  for (final raw in fieldTasks.take(8))
                    SarWorkAreaTile(
                      name: (raw as Map)['work_area_name'] as String? ?? 'Work area',
                      subtitle: raw['alert_kind'] as String? ?? raw['message'] as String? ?? '',
                      integrity: raw['forest_integrity_score'] as num?,
                      onTap: raw['work_area_id'] != null
                          ? () => context.push('/monitoring?fence=${raw['work_area_id']}')
                          : null,
                    ),
                ],
                if (sarAlerts.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  Text('SAR alerts (30d)', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final e in sarAlerts.entries)
                        Chip(
                          backgroundColor: Colors.amber.shade50,
                          label: Text('${e.key}: ${e.value}', style: const TextStyle(fontSize: 11)),
                        ),
                    ],
                  ),
                ],
                const SizedBox(height: 20),
                Text('Unread alerts by kind', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                if (alertsByKind.isEmpty)
                  const Text('No unread alerts.', style: TextStyle(color: AranyixColors.onSurfaceMuted))
                else
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final e in alertsByKind.entries)
                        Chip(label: Text('${e.key}: ${e.value}')),
                    ],
                  ),
                const SizedBox(height: 20),
                Text('Work area SAR status', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                if (workAreas.isEmpty)
                  Text(
                    'No work-area monitoring rows yet. Open violations: ${summary['open_violations'] ?? 0}, '
                    'survival due: ${summary['survival_due'] ?? 0}.',
                    style: const TextStyle(color: AranyixColors.onSurfaceMuted),
                  )
                else
                  for (final raw in workAreas.take(30))
                    SarWorkAreaTile(
                      name: (raw as Map)['name'] as String? ?? 'Work area',
                      subtitle: [
                        raw['project_name'] ?? '',
                        if (raw['latest_ndvi'] != null) 'NDVI ${raw['latest_ndvi']}',
                        if (raw['days_since_scan'] != null) '${raw['days_since_scan']}d since NDVI',
                      ].where((s) => s.toString().isNotEmpty).join(' · '),
                      integrity: raw['sar_forest_integrity'] as num?,
                      mode: sarModeLabel(raw['sar_monitoring_mode'] as String?),
                      recommendedAction: raw['sar_recommended_action'] as String?,
                      highlight: highlightFenceId != null && raw['id'] == highlightFenceId,
                      onTap: raw['id'] != null
                          ? () => context.push('/monitoring?fence=${raw['id']}')
                          : (raw['project_id'] != null
                              ? () => context.push('/projects/${raw['project_id']}')
                              : null),
                    ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.title, required this.value, required this.subtitle});

  final String title;
  final String value;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AranyixColors.surfaceContainer,
        borderRadius: BorderRadius.circular(AranyixRadii.card),
        border: Border.all(color: Colors.black.withValues(alpha: 0.04)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(color: AranyixColors.onSurfaceMuted)),
          const SizedBox(height: 6),
          Text(value, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text(subtitle, style: Theme.of(context).textTheme.bodyMedium),
        ],
      ),
    );
  }
}
