import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../providers.dart';
import 'projects_list_screen.dart';

class ProjectDetailScreen extends ConsumerWidget {
  const ProjectDetailScreen({super.key, required this.projectId});

  final String projectId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final projectAsync = ref.watch(plantingProjectProvider(projectId));
    final workAreasAsync = ref.watch(workAreasProvider(projectId));

    return Scaffold(
      appBar: AppBar(title: const Text('Project')),
      floatingActionButton: projectAsync.maybeWhen(
        data: (project) => FloatingActionButton.extended(
          onPressed: () => context.push('/trees/new?project=$projectId'),
          icon: const Icon(Icons.add),
          label: const Text('Register tree'),
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
              Text('${project['code']} · ${_segmentLabels[segment] ?? segment}'),
              const SizedBox(height: 8),
              Text(project['description'] as String? ?? ''),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _chip('Mode', '${project['compliance_mode']}'),
                  _chip('Trees', '${summary?['tree_count'] ?? 0}'),
                  _chip('Work areas', '${summary?['work_area_count'] ?? 0}'),
                  if ((summary?['open_violations'] ?? 0) > 0)
                    _chip('Violations', '${summary?['open_violations']}', warn: true),
                ],
              ),
              const SizedBox(height: 24),
              Text('Work areas', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              workAreasAsync.when(
                loading: () => const LinearProgressIndicator(),
                error: (e, _) => Text(apiErrorMessage(e)),
                data: (areas) {
                  if (areas.isEmpty) {
                    return const Text('No work areas defined on web yet.');
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
                          title: Text(m['name'] as String? ?? 'Work area'),
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
