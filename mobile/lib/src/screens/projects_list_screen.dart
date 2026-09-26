import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../api/auth_redirect.dart';
import '../nav_access.dart';
import '../providers.dart';
import '../session.dart';
import '../project/segment_labels.dart';
import '../widgets/create_project_sheet.dart';
import '../widgets/offline_tree_queue_section.dart';
import '../widgets/shell_scaffold.dart';

class ProjectsListScreen extends ConsumerWidget {
  const ProjectsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final user = sessionController.user;
    final canCreate = isSupervisor(user) && canWriteInApp(user);
    final projectsAsync = ref.watch(plantingProjectsProvider);
    return Scaffold(
      appBar: ShellTopBar(title: l10n.projects),
      floatingActionButton: canCreate
          ? FloatingActionButton.extended(
              onPressed: () => context.push('/projects/new'),
              backgroundColor: const Color(0xFF15803D),
              icon: const Icon(Icons.add),
              label: Text(l10n.newProject),
            )
          : null,
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
              children: [
                Text(l10n.noProjectsYet),
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
    final l10n = AppLocalizations.of(context)!;
    final summary = p['summary'] as Map<String, dynamic>?;
    final segment = p['segment'] as String? ?? 'general';
    final openV = (summary?['open_violations'] as num?)?.toInt() ?? 0;
    final treeCount = (summary?['tree_count'] as num?)?.toInt() ?? 0;
    return Card(
      child: ListTile(
        title: Text(p['name'] as String? ?? p['code'] as String),
        subtitle: Text(
          '${segmentLabel(l10n, segment)} · ${p['compliance_mode']} · '
          '${l10n.projectTreesCount(treeCount)}'
          '${openV > 0 ? l10n.projectViolationsSuffix(openV) : ''}',
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => context.push('/projects/${p['id']}'),
      ),
    );
  }
}
