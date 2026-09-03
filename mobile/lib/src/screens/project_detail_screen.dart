import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../providers.dart';
import '../widgets/shell_scaffold.dart';
import '../widgets/stack_route_scaffold.dart';
import 'projects_list_screen.dart' show segmentLabels;

class ProjectDetailScreen extends ConsumerWidget {
  const ProjectDetailScreen({super.key, required this.projectId});

  final String projectId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final projectAsync = ref.watch(plantingProjectProvider(projectId));
    final workAreasAsync = ref.watch(workAreasProvider(projectId));
    final integrityAsync = ref.watch(integrityFusionProvider(projectId));

    return stackRouteScaffold(
      location: '/projects/$projectId',
      appBar: ShellTopBar(title: AppLocalizations.of(context)!.projects, menuWithBack: true),
      floatingActionButton: projectAsync.maybeWhen(
        data: (project) => FloatingActionButton.extended(
          onPressed: () => context.push('/trees/new?project=$projectId'),
          icon: const Icon(Icons.add),
          label: Text(l10n.registerTreeBtn),
        ),
        orElse: () => null,
      ),
      body: projectAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(apiErrorMessage(e))),
        data: (project) {
          final summary = project['summary'] as Map<String, dynamic>?;
          final segment = project['segment'] as String? ?? 'general';
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(project['name'] as String, style: Theme.of(context).textTheme.headlineSmall),
              Text('${project['code']} · ${segmentLabels[segment] ?? segment}'),
              const SizedBox(height: 8),
              Text(project['description'] as String? ?? ''),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _chip(l10n.modeLabel, '${project['compliance_mode']}'),
                  _chip(l10n.treesCountLabel, '${summary?['tree_count'] ?? 0}'),
                  _chip(l10n.workAreas, '${summary?['work_area_count'] ?? 0}'),
                  if ((summary?['open_violations'] ?? 0) > 0)
                    _chip(l10n.violationsLabel, '${summary?['open_violations']}', warn: true),
                ],
              ),
              const SizedBox(height: 16),
              integrityAsync.when(
                loading: () => const LinearProgressIndicator(),
                error: (e, _) => Text(apiErrorMessage(e)),
                data: (integrity) => _IntegrityMonitoringCard(integrity: integrity),
              ),
              const SizedBox(height: 24),
              Text(l10n.workAreas, style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              workAreasAsync.when(
                loading: () => const LinearProgressIndicator(),
                error: (e, _) => Text(apiErrorMessage(e)),
                data: (areas) {
                  if (areas.isEmpty) {
                    return Text(l10n.noWorkAreasYet);
                  }
                  return Column(
                    children: areas.map((wa) {
                      final m = wa as Map<String, dynamic>;
                      final id = m['id'] as String;
                      final density = _densityLabel(m, segment);
                      final lastScan = m['last_satellite_at'] as String?;
                      final scanLabel = _satelliteLabel(lastScan);
                      return Card(
                        child: ListTile(
                          title: Text(m['name'] as String? ?? l10n.workAreaFallback),
                          subtitle: Text(
                            '${m['geometry_type']} · ${m['tree_count'] ?? 0} trees'
                            '${m['segment_code'] != null ? ' · block ${m['segment_code']}' : ''}'
                            '${density.isNotEmpty ? ' · $density' : ''}'
                            '${scanLabel.isNotEmpty ? '\n$scanLabel' : ''}',
                          ),
                          trailing: Icon(
                            lastScan != null ? Icons.satellite_alt : Icons.satellite_alt_outlined,
                            color: _satelliteIconColor(lastScan),
                          ),
                          isThreeLine: scanLabel.isNotEmpty,
                          onTap: () => context.push(
                            '/trees/new?project=$projectId&work_area=$id',
                          ),
                        ),
                      );
                    }).toList(),
                  );
                },
              ),
            ],
          );
        },
      ),
    );
  }

  String _densityLabel(Map<String, dynamic> wa, String segment) {
    if (segment != 'industrial_greenbelt') return '';
    final area = (wa['area_ha'] as num?)?.toDouble();
    final trees = (wa['tree_count'] as num?)?.toInt() ?? 0;
    if (area == null || area <= 0) return '';
    return '${(trees / area).toStringAsFixed(0)} trees/ha';
  }

  String _satelliteLabel(String? lastScanIso) {
    if (lastScanIso == null) return 'Satellite: no scan yet';
    final parsed = DateTime.tryParse(lastScanIso);
    if (parsed == null) return 'Satellite: scanned';
    final days = DateTime.now().toUtc().difference(parsed.toUtc()).inDays;
    if (days > 35) return 'Satellite: stale ($days days ago)';
    if (days == 0) return 'Satellite: scanned today';
    return 'Satellite: $days days ago';
  }

  Color? _satelliteIconColor(String? lastScanIso) {
    if (lastScanIso == null) return Colors.grey;
    final parsed = DateTime.tryParse(lastScanIso);
    if (parsed == null) return Colors.green;
    final days = DateTime.now().toUtc().difference(parsed.toUtc()).inDays;
    if (days > 35) return Colors.orange.shade800;
    return Colors.green.shade700;
  }

  Widget _chip(String label, String value, {bool warn = false}) {
    return Chip(
      label: Text('$label: $value'),
      backgroundColor: warn ? Colors.orange.shade100 : null,
    );
  }
}

class _IntegrityMonitoringCard extends StatelessWidget {
  const _IntegrityMonitoringCard({required this.integrity});

  final Map<String, dynamic> integrity;

  String _gateLabel(String code) {
    const labels = {
      'sar_integrity_below_minimum': 'SAR forest integrity below minimum',
      'optical_scan_stale': 'Work area optical scan is stale',
      'insufficient_photos': 'Need at least 2 photos',
      'photo_span_too_short': 'Photos must span 30+ days',
      'regeotag_mismatch': 'Re-geotag mismatch',
      'fusion_below_minimum': 'Fusion score below minimum',
      'not_credit_eligible': 'Not credit eligible',
    };
    return labels[code] ?? code.replaceAll('_', ' ');
  }

  @override
  Widget build(BuildContext context) {
    final monitoringGate = integrity['monitoring_gate'] as Map<String, dynamic>?;
    final monitoringReady = integrity['monitoring_ready'] == true ||
        monitoringGate?['passed'] == true;
    final reasons = (monitoringGate?['reasons'] as List?)?.whereType<String>().toList() ?? [];
    final blocking = (integrity['blocking_trees'] as List?) ?? [];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  monitoringReady ? Icons.verified_user : Icons.warning_amber_rounded,
                  color: monitoringReady ? Colors.green.shade700 : Colors.orange.shade800,
                ),
                const SizedBox(width: 8),
                Text(
                  'Integrity monitoring gate',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              monitoringReady
                  ? 'Monitoring gate passed for credit transitions.'
                  : 'Monitoring gate blocked for credit transitions.',
            ),
            if (monitoringGate?['message'] != null) ...[
              const SizedBox(height: 6),
              Text(
                monitoringGate!['message'] as String,
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
            ],
            if (!monitoringReady && reasons.isNotEmpty) ...[
              const SizedBox(height: 8),
              ...reasons.map(
                (reason) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('• '),
                      Expanded(child: Text(_gateLabel(reason))),
                    ],
                  ),
                ),
              ),
            ],
            const SizedBox(height: 8),
            Text(
              'Eligible ${integrity['credit_eligible_count'] ?? 0}/${integrity['tree_count'] ?? 0} · '
              'Audit ready ${integrity['audit_ready_count'] ?? 0}/${integrity['tree_count'] ?? 0}',
              style: const TextStyle(fontSize: 12),
            ),
            if (blocking.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                '${blocking.length} tree(s) with blocking issues',
                style: TextStyle(fontSize: 12, color: Colors.orange.shade900),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
