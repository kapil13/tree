import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../api/auth_redirect.dart';
import '../providers.dart';
import '../widgets/mobile_app_bar.dart';

import '../widgets/offline_tree_queue_section.dart';

const segmentLabels = {
  'nhai_highway': 'NHAI / Highway',
  'industrial_greenbelt': 'Mine / Green belt',
  'township_landscape': 'Township / Society',
  'nagar_van_urban': 'Nagar Van / Urban forest',
  'sahakar_van_coop': 'Sahakar Van / Cooperative forest',
  'ngo_watershed': 'NGO / Watershed',
  'general': 'General',
};

class ProjectsListScreen extends ConsumerWidget {
  const ProjectsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final projectsAsync = ref.watch(plantingProjectsProvider);
    return Scaffold(
      appBar: const MobileAppBar(title: 'Field projects'),
      body: projectsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) {
          if (maybeRedirectUnauthorized(ref, context, e)) {
            return const Center(child: CircularProgressIndicator());
          }
          return Center(child: Text(apiErrorMessage(e)));
        },
        data: (projects) {
          if (projects.isEmpty) {
            return ListView(
              padding: const EdgeInsets.all(16),
              children: const [
                Text('No planting projects assigned yet.'),
                SizedBox(height: 16),
                OfflineTreeQueueSection(),
              ],
            );
          }
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              for (var i = 0; i < projects.length; i++) ...[
                if (i > 0) const SizedBox(height: 8),
                _projectCard(context, projects[i] as Map<String, dynamic>),
              ],
              const SizedBox(height: 24),
              const OfflineTreeQueueSection(),
            ],
          );
        },
      ),
    );
  }

  Widget _projectCard(BuildContext context, Map<String, dynamic> p) {
    final summary = p['summary'] as Map<String, dynamic>?;
    final segment = p['segment'] as String? ?? 'general';
    final openV = summary?['open_violations'] ?? 0;
    return Card(
      child: ListTile(
        title: Text(p['name'] as String? ?? p['code'] as String),
        subtitle: Text(
          '${segmentLabels[segment] ?? segment} · ${p['compliance_mode']} · '
          '${summary?['tree_count'] ?? 0} trees'
          '${openV > 0 ? ' · $openV violations' : ''}',
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => context.push('/projects/${p['id']}'),
      ),
    );
  }
}
