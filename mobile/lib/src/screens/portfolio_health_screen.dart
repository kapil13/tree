import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../providers.dart';
import '../theme.dart';
import '../widgets/mobile_app_bar.dart';
import '../widgets/sar_monitoring_cards.dart';

class PortfolioHealthScreen extends ConsumerStatefulWidget {
  const PortfolioHealthScreen({super.key});

  @override
  ConsumerState<PortfolioHealthScreen> createState() => _PortfolioHealthScreenState();
}

class _PortfolioHealthScreenState extends ConsumerState<PortfolioHealthScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    ref.invalidate(dashboardProvider);
    ref.invalidate(monitoringSummaryProvider);
    ref.invalidate(intelligenceSummaryProvider);
    ref.invalidate(bioacousticSummaryProvider);
    ref.invalidate(alertsProvider);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AranyixColors.surface,
      appBar: MobileAppBar(
        title: 'Portfolio health',
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: _refresh,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: Column(
        children: [
          Material(
            color: AranyixColors.surfaceElevated,
            child: TabBar(
              controller: _tabs,
              isScrollable: true,
              tabAlignment: TabAlignment.start,
              labelColor: AranyixColors.forestDark,
              unselectedLabelColor: AranyixColors.onSurfaceMuted,
              indicatorColor: AranyixColors.forest,
              tabs: const [
                Tab(text: 'Overview'),
                Tab(text: 'Threats'),
                Tab(text: 'Monitoring'),
                Tab(text: 'Biodiversity'),
              ],
            ),
          ),
          Expanded(
            child: TabBarView(
              controller: _tabs,
              children: [
                _OverviewTab(onOpenMonitoring: () => _tabs.animateTo(2)),
                const _ThreatsTab(),
                const _MonitoringTab(),
                const _BiodiversityTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _OverviewTab extends ConsumerWidget {
  const _OverviewTab({required this.onOpenMonitoring});

  final VoidCallback onOpenMonitoring;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashAsync = ref.watch(dashboardProvider);
    final monitoringAsync = ref.watch(monitoringSummaryProvider);
    final alertsAsync = ref.watch(alertsProvider);

    return RefreshIndicator(
      color: AranyixColors.forest,
      onRefresh: () async {
        ref.invalidate(dashboardProvider);
        ref.invalidate(monitoringSummaryProvider);
        ref.invalidate(alertsProvider);
      },
      child: dashAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => _TabError(message: apiErrorMessage(e), onRetry: () => ref.invalidate(dashboardProvider)),
        data: (dashboard) {
          final monitoring = monitoringAsync.maybeWhen(data: (d) => d, orElse: () => <String, dynamic>{});
          final alerts = alertsAsync.maybeWhen(data: (d) => d, orElse: () => <dynamic>[]);
          final kpi = Map<String, dynamic>.from(dashboard['kpi'] ?? {});
          final unread = alerts.where((a) => (a as Map)['read_at'] == null).length;

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _MetricGrid(
                items: [
                  _MetricItem('Trees', '${kpi['tree_count'] ?? dashboard['tree_count'] ?? '—'}'),
                  _MetricItem('Projects', '${monitoring['project_count'] ?? '—'}'),
                  _MetricItem('Open alerts', '$unread'),
                  _MetricItem(
                    'Survival due',
                    '${monitoring['survival_due'] ?? monitoring['open_violations'] ?? 0}',
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if ((monitoring['stale_satellite_work_areas'] ?? 0) > 0 ||
                  (monitoring['sar_at_risk_work_areas'] ?? 0) > 0)
                _AttentionCard(
                  staleScans: monitoring['stale_satellite_work_areas'] ?? 0,
                  sarAtRisk: monitoring['sar_at_risk_work_areas'] ?? 0,
                  onMonitoring: onOpenMonitoring,
                ),
              const SizedBox(height: 12),
              Text('Quick links', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
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
                  ActionChip(
                    avatar: const Icon(Icons.assignment_outlined, size: 18),
                    label: const Text('Projects'),
                    onPressed: () => context.go('/projects'),
                  ),
                  ActionChip(
                    avatar: const Icon(Icons.construction_outlined, size: 18),
                    label: const Text('Field ops'),
                    onPressed: () => context.push('/field-ops'),
                  ),
                ],
              ),
            ],
          );
        },
      ),
    );
  }
}

class _ThreatsTab extends ConsumerWidget {
  const _ThreatsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final intelAsync = ref.watch(intelligenceSummaryProvider);

    return RefreshIndicator(
      color: AranyixColors.forest,
      onRefresh: () async => ref.invalidate(intelligenceSummaryProvider),
      child: intelAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => _TabError(
          message: apiErrorMessage(e),
          onRetry: () => ref.invalidate(intelligenceSummaryProvider),
        ),
        data: (summary) {
          final weatherCount = summary['weather_alert_count'] ?? 0;
          final pestHigh = summary['pest_high_count'] ?? 0;
          final highestRisk = summary['highest_risk'] as String? ?? 'low';
          final threatSites = List<dynamic>.from(summary['threat_sites'] ?? []);
          final weatherAlerts = List<dynamic>.from(summary['weather_alerts'] ?? []);
          final earlyWarnings = List<dynamic>.from(summary['early_warnings'] ?? []);

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _MetricGrid(
                items: [
                  _MetricItem('Highest risk', highestRisk.toUpperCase()),
                  _MetricItem('Weather alerts', '$weatherCount'),
                  _MetricItem('Pest hotspots', '$pestHigh'),
                  _MetricItem('Threat sites', '${threatSites.length}'),
                ],
              ),
              if (weatherAlerts.isNotEmpty) ...[
                const SizedBox(height: 20),
                Text('Weather', style: Theme.of(context).textTheme.titleMedium),
                for (final raw in weatherAlerts.take(6))
                  _ListTileCard(
                    title: (raw as Map)['headline'] as String? ?? 'Weather alert',
                    subtitle: raw['summary'] as String? ?? '',
                  ),
              ],
              if (earlyWarnings.isNotEmpty) ...[
                const SizedBox(height: 20),
                Text('Early warnings', style: Theme.of(context).textTheme.titleMedium),
                for (final raw in earlyWarnings.take(6))
                  _ListTileCard(
                    title: (raw as Map)['title'] as String? ?? 'Warning',
                    subtitle: raw['detail'] as String? ?? '',
                  ),
              ],
              if (threatSites.isNotEmpty) ...[
                const SizedBox(height: 20),
                Text('Threat watch', style: Theme.of(context).textTheme.titleMedium),
                for (final raw in threatSites.take(8))
                  _ListTileCard(
                    title: (raw as Map)['site_name'] as String? ?? 'Site',
                    subtitle: raw['risk_level'] != null ? 'Risk: ${raw['risk_level']}' : '',
                  ),
              ],
              if (weatherAlerts.isEmpty && earlyWarnings.isEmpty && threatSites.isEmpty)
                const _EmptyTabHint('No active threats detected for your portfolio.'),
            ],
          );
        },
      ),
    );
  }
}

class _MonitoringTab extends ConsumerWidget {
  const _MonitoringTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summaryAsync = ref.watch(monitoringSummaryProvider);

    return RefreshIndicator(
      color: AranyixColors.forest,
      onRefresh: () async => ref.invalidate(monitoringSummaryProvider),
      child: summaryAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => _TabError(
          message: apiErrorMessage(e),
          onRetry: () => ref.invalidate(monitoringSummaryProvider),
        ),
        data: (summary) {
          final sarAvg = summary['sar_avg_forest_integrity'];
          final sarAtRisk = summary['sar_at_risk_work_areas'] ?? 0;
          final sarDivergent = summary['sar_divergent_work_areas'] ?? 0;
          final sarAligned = summary['sar_aligned_work_areas'] ?? 0;
          final stale = summary['stale_satellite_work_areas'] ?? 0;
          final workAreas = List<dynamic>.from(summary['work_area_monitoring'] ?? []);

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              SarIntegrityHeroCard(
                avgIntegrity: sarAvg is num ? sarAvg : null,
                atRisk: sarAtRisk is int ? sarAtRisk : int.tryParse('$sarAtRisk') ?? 0,
                divergent: sarDivergent is int ? sarDivergent : int.tryParse('$sarDivergent') ?? 0,
                aligned: sarAligned is int ? sarAligned : int.tryParse('$sarAligned') ?? 0,
              ),
              const SizedBox(height: 12),
              _ListTileCard(
                title: 'Stale satellite scans',
                subtitle: '$stale work areas need a fresh NDVI pass',
              ),
              const SizedBox(height: 12),
              FilledButton.tonalIcon(
                onPressed: () => context.go('/monitoring'),
                icon: const Icon(Icons.open_in_new),
                label: const Text('Open full monitoring'),
              ),
              if (workAreas.isNotEmpty) ...[
                const SizedBox(height: 20),
                Text('Work areas', style: Theme.of(context).textTheme.titleMedium),
                for (final raw in workAreas.take(10))
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
                    onTap: () => context.go('/map'),
                  ),
              ],
            ],
          );
        },
      ),
    );
  }
}

class _BiodiversityTab extends ConsumerWidget {
  const _BiodiversityTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bioAsync = ref.watch(bioacousticSummaryProvider);

    return RefreshIndicator(
      color: AranyixColors.forest,
      onRefresh: () async => ref.invalidate(bioacousticSummaryProvider),
      child: bioAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => _TabError(
          message: apiErrorMessage(e),
          onRetry: () => ref.invalidate(bioacousticSummaryProvider),
        ),
        data: (summary) {
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _MetricGrid(
                items: [
                  _MetricItem('Recordings', '${summary['total_recordings'] ?? 0}'),
                  _MetricItem('Analyzed', '${summary['analyzed_recordings'] ?? 0}'),
                  _MetricItem('Species', '${summary['total_species_detected'] ?? 0}'),
                  _MetricItem('Threatened', '${summary['threatened_species_count'] ?? 0}'),
                ],
              ),
              const SizedBox(height: 16),
              if (summary['avg_health_score'] != null)
                _ListTileCard(
                  title: 'Acoustic health score',
                  subtitle: '${summary['avg_health_score']} average across analyzed clips',
                ),
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: () => context.go('/bioacoustic'),
                icon: const Icon(Icons.mic_rounded),
                label: const Text('Record biodiversity clip'),
              ),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: () => context.push('/assistant'),
                icon: const Icon(Icons.auto_awesome_outlined),
                label: const Text('Ask AI about biodiversity'),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _MetricItem {
  const _MetricItem(this.label, this.value);
  final String label;
  final String value;
}

class _MetricGrid extends StatelessWidget {
  const _MetricGrid({required this.items});

  final List<_MetricItem> items;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = (constraints.maxWidth - 12) / 2;
        return Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            for (final item in items)
              Container(
                width: width,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AranyixColors.surfaceElevated,
                  borderRadius: BorderRadius.circular(AranyixRadii.card),
                  border: Border.all(color: AranyixColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.label.toUpperCase(),
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: AranyixColors.onSurfaceMuted,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      item.value,
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: AranyixColors.forestDark,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        );
      },
    );
  }
}

class _AttentionCard extends StatelessWidget {
  const _AttentionCard({
    required this.staleScans,
    required this.sarAtRisk,
    required this.onMonitoring,
  });

  final int staleScans;
  final int sarAtRisk;
  final VoidCallback onMonitoring;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AranyixColors.warningContainer,
        borderRadius: BorderRadius.circular(AranyixRadii.card),
        border: Border.all(color: AranyixColors.warningBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Needs attention', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          Text(
            [
              if (staleScans > 0) '$staleScans stale satellite scan${staleScans == 1 ? '' : 's'}',
              if (sarAtRisk > 0) '$sarAtRisk SAR at-risk area${sarAtRisk == 1 ? '' : 's'}',
            ].join(' · '),
            style: const TextStyle(fontSize: 13),
          ),
          const SizedBox(height: 10),
          TextButton(onPressed: onMonitoring, child: const Text('View monitoring tab')),
        ],
      ),
    );
  }
}

class _ListTileCard extends StatelessWidget {
  const _ListTileCard({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: const BorderSide(color: AranyixColors.border),
      ),
      child: ListTile(
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: subtitle.isEmpty ? null : Text(subtitle),
      ),
    );
  }
}

class _EmptyTabHint extends StatelessWidget {
  const _EmptyTabHint(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Text(text, textAlign: TextAlign.center, style: const TextStyle(color: AranyixColors.onSurfaceMuted)),
    );
  }
}

class _TabError extends StatelessWidget {
  const _TabError({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        SizedBox(
          height: MediaQuery.sizeOf(context).height * 0.5,
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(message, textAlign: TextAlign.center),
                  const SizedBox(height: 12),
                  FilledButton(onPressed: onRetry, child: const Text('Retry')),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
