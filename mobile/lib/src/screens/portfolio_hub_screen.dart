import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../audit_workspace.dart';
import '../providers.dart';
import '../widgets/prototype/prototype_ui.dart';
import '../widgets/stack_route_scaffold.dart';

/// Portfolio hub — 5 tabs (Phase F parity with web `/portfolio-health`).
class PortfolioHubScreen extends ConsumerStatefulWidget {
  const PortfolioHubScreen({super.key, this.initialTab = 0});

  final int initialTab;

  @override
  ConsumerState<PortfolioHubScreen> createState() => _PortfolioHubScreenState();
}

class _PortfolioHubScreenState extends ConsumerState<PortfolioHubScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 5, vsync: this, initialIndex: widget.initialTab.clamp(0, 4));
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return stackRouteScaffold(
      location: '/portfolio',
      appBar: AppBar(
        title: const Text('Portfolio health'),
        bottom: TabBar(
          controller: _tabs,
          isScrollable: true,
          tabs: const [
            Tab(text: 'Overview'),
            Tab(text: 'Monitoring'),
            Tab(text: 'Compliance'),
            Tab(text: 'Audit'),
            Tab(text: 'Threats'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: [
          _OverviewTab(),
          _MonitoringTab(),
          _ComplianceTab(),
          _AuditTab(),
          _ThreatsTab(),
        ],
      ),
    );
  }
}

class _OverviewTab extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashAsync = ref.watch(dashboardProvider);
    final monitoringAsync = ref.watch(monitoringSummaryProvider);
    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(dashboardProvider);
        ref.invalidate(monitoringSummaryProvider);
      },
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          dashAsync.when(
            loading: () => const PrototypeLoadingSkeleton(lines: 3),
            error: (e, _) => Text(apiErrorMessage(e)),
            data: (dash) => PrototypeKpiStrip(
              items: [
                PrototypeKpi(label: 'Trees', value: '${dash['tree_count'] ?? 0}'),
                PrototypeKpi(label: 'Projects', value: '${dash['project_count'] ?? 0}'),
                PrototypeKpi(label: 'Health', value: '${dash['forest_health_score'] ?? '—'}'),
              ],
            ),
          ),
          const SizedBox(height: 16),
          monitoringAsync.when(
            loading: () => const PrototypeLoadingSkeleton(lines: 2),
            error: (e, _) => Text(apiErrorMessage(e)),
            data: (m) {
              final areas = List<dynamic>.from(m['work_area_monitoring'] ?? []);
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Monitoring snapshot', style: TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  Text('${areas.length} work areas tracked'),
                  TextButton(
                    onPressed: () => context.push('/satellite'),
                    child: const Text('Open satellite workspace →'),
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

class _MonitoringTab extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summaryAsync = ref.watch(monitoringSummaryProvider);
    return summaryAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text(apiErrorMessage(e))),
      data: (summary) {
        final areas = List<dynamic>.from(summary['work_area_monitoring'] ?? []);
        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: areas.length,
          itemBuilder: (_, i) {
            final raw = areas[i] as Map;
            return PrototypeNdviRow(
              site: raw['name'] as String? ?? raw['work_area_name'] as String? ?? 'Work area',
              ndvi: (raw['latest_ndvi'] as num?)?.toDouble(),
              meta: [
                if (raw['days_since_scan'] != null) '${raw['days_since_scan']}d since scan',
                if (raw['sar_recommended_action'] != null) raw['sar_recommended_action'],
              ].join(' · '),
              actionLabel: raw['sar_recommended_action'] as String? ?? 'View',
              onTap: () {
                final id = raw['work_area_id'] as String? ?? raw['id'] as String?;
                if (id != null) context.push('/satellite?fence=$id');
              },
            );
          },
        );
      },
    );
  }
}

class _ComplianceTab extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final projectsAsync = ref.watch(plantingProjectsProvider);
    return projectsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text(apiErrorMessage(e))),
      data: (projects) => ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: projects.length,
        itemBuilder: (_, i) {
          final p = projects[i] as Map<String, dynamic>;
          return ListTile(
            title: Text(p['name'] as String? ?? 'Project'),
            subtitle: Text(p['compliance_mode'] as String? ?? ''),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/projects/${p['id']}/compliance'),
          );
        },
      ),
    );
  }
}

class _AuditTab extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summaryAsync = ref.watch(auditPortfolioSummaryProvider);
    return summaryAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text(apiErrorMessage(e))),
      data: (summary) {
        final projects = List<Map<String, dynamic>>.from(
          (summary['projects'] as List?)?.map((e) => Map<String, dynamic>.from(e as Map)) ?? [],
        );
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            PrototypeSignalStrip(
              signals: [
                PrototypeSignal(value: '${summary['engagement_count'] ?? 0}', label: 'Engagements'),
                PrototypeSignal(value: '${summary['audit_plots_due'] ?? 0}', label: 'Plots due'),
                PrototypeSignal(value: '${summary['engagements_attested'] ?? 0}', label: 'Attested'),
              ],
            ),
            const SizedBox(height: 12),
            for (final p in projects)
              ListTile(
                title: Text(p['name'] as String? ?? 'Project'),
                subtitle: Text(auditEngagementStatusLabel(p['engagement_status'] as String? ?? '')),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/projects/${p['id']}/audit'),
              ),
            TextButton(onPressed: () => context.push('/audit'), child: const Text('Full audit workspace →')),
          ],
        );
      },
    );
  }
}

class _ThreatsTab extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final alertsAsync = ref.watch(alertsProvider);
    return alertsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text(apiErrorMessage(e))),
      data: (alerts) {
        if (alerts.isEmpty) {
          return const Center(child: Text('No active threat alerts'));
        }
        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: alerts.length,
          itemBuilder: (_, i) {
            final a = alerts[i] as Map;
            return ListTile(
              title: Text(a['title'] as String? ?? a['alert_type'] as String? ?? 'Alert'),
              subtitle: Text(a['message'] as String? ?? ''),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push('/alerts/${a['id']}'),
            );
          },
        );
      },
    );
  }
}

class PrototypeKpiStrip extends StatelessWidget {
  const PrototypeKpiStrip({super.key, required this.items});

  final List<PrototypeKpi> items;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: items
          .map(
            (k) => Expanded(
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    children: [
                      Text(k.value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                      Text(k.label, style: const TextStyle(fontSize: 11)),
                    ],
                  ),
                ),
              ),
            ),
          )
          .toList(),
    );
  }
}

class PrototypeKpi {
  const PrototypeKpi({required this.label, required this.value});
  final String label;
  final String value;
}
