import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../api/auth_redirect.dart';
import '../providers.dart';

const _segmentLabels = {
  'nhai_highway': 'NHAI / Highway',
  'industrial_greenbelt': 'Mine / Green belt',
  'township_landscape': 'Township / Society',
  'ngo_watershed': 'NGO / Watershed',
  'general': 'General',
};

class ProjectsListScreen extends ConsumerWidget {
  const ProjectsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final projectsAsync = ref.watch(plantingProjectsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Field projects')),
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
            return const Center(child: Text('No planting projects assigned yet.'));
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: projects.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (_, i) {
              final p = projects[i] as Map<String, dynamic>;
              final summary = p['summary'] as Map<String, dynamic>?;
              final segment = p['segment'] as String? ?? 'general';
              final openV = summary?['open_violations'] ?? 0;
              return Card(
                child: ListTile(
                  title: Text(p['name'] as String? ?? p['code'] as String),
                  subtitle: Text(
                    '${_segmentLabels[segment] ?? segment} · ${p['compliance_mode']} · '
                    '${summary?['tree_count'] ?? 0} trees'
                    '${openV > 0 ? ' · $openV violations' : ''}',
                  ),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push('/projects/${p['id']}'),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
