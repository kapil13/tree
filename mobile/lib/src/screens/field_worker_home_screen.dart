import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../api/auth_redirect.dart';
import '../nav_access.dart';
import '../providers.dart';
import '../session.dart';
import '../theme.dart';
import '../widgets/offline_tree_queue_section.dart';
import '../widgets/primary_field_actions.dart';
import '../widgets/shell_scaffold.dart';

class FieldWorkerHomeScreen extends ConsumerWidget {
  const FieldWorkerHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final user = sessionController.user;
    final projectsAsync = ref.watch(plantingProjectsProvider);
    final treesAsync = ref.watch(treesProvider);

    return Scaffold(
      backgroundColor: AranyixColors.surface,
      body: SafeArea(
        child: RefreshIndicator(
          color: AranyixColors.forest,
          onRefresh: () async {
            ref.invalidate(plantingProjectsProvider);
            ref.invalidate(treesProvider);
          },
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverToBoxAdapter(child: PendingSyncBanner()),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    Row(
                      children: [
                        IconButton(
                          onPressed: () => openAppDrawer(context),
                          icon: const Icon(Icons.menu_rounded),
                          color: AranyixColors.forestDark,
                          tooltip: l10n.menuOpen,
                        ),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${l10n.fieldWorkspace}${user?['organization_name'] != null ? ' · ${user!['organization_name']}' : ''}',
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: AranyixColors.forest,
                                ),
                              ),
                              Text(l10n.todayWork, style: Theme.of(context).textTheme.headlineSmall),
                            ],
                          ),
                        ),
                        IconButton(
                          tooltip: l10n.profile,
                          onPressed: () => context.go('/profile'),
                          icon: const Icon(Icons.person_outline, color: AranyixColors.forestDark),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      l10n.registerTreePrimarySub,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AranyixColors.onSurfaceMuted,
                          ),
                    ),
                    const SizedBox(height: 16),
                    PrimaryFieldActions(user: user),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        ActionChip(
                          avatar: const Icon(Icons.map_outlined, size: 18),
                          label: Text(l10n.map),
                          onPressed: () => context.go('/map'),
                        ),
                        ActionChip(
                          avatar: const Icon(Icons.notifications_outlined, size: 18),
                          label: Text(l10n.navAlerts),
                          onPressed: () => context.go('/notifications'),
                        ),
                        if (canSeeFieldOps(user))
                          ActionChip(
                            avatar: const Icon(Icons.construction_outlined, size: 18),
                            label: Text(l10n.fieldOps),
                            onPressed: () => context.push('/field-ops'),
                          ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    Text(l10n.projects, style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 8),
                    projectsAsync.when(
                      loading: () => const LinearProgressIndicator(),
                      error: (e, _) {
                        if (maybeRedirectUnauthorized(ref, context, e)) {
                          return const SizedBox.shrink();
                        }
                        return Text(apiErrorMessage(e));
                      },
                      data: (projects) {
                        if (projects.isEmpty) {
                          return Text(
                            'No projects assigned yet.',
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                  color: AranyixColors.onSurfaceMuted,
                                ),
                          );
                        }
                        return Column(
                          children: [
                            for (final raw in projects.take(5))
                              Card(
                                margin: const EdgeInsets.only(bottom: 8),
                                child: ListTile(
                                  leading: const Icon(Icons.assignment_outlined, color: AranyixColors.forest),
                                  title: Text((raw as Map<String, dynamic>)['name'] as String? ?? 'Project'),
                                  trailing: const Icon(Icons.chevron_right),
                                  onTap: () => context.push('/projects/${raw['id']}'),
                                ),
                              ),
                          ],
                        );
                      },
                    ),
                    const SizedBox(height: 24),
                    Text(l10n.trees, style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 8),
                    treesAsync.when(
                      loading: () => const LinearProgressIndicator(),
                      error: (e, _) {
                        if (maybeRedirectUnauthorized(ref, context, e)) {
                          return const SizedBox.shrink();
                        }
                        return Text(apiErrorMessage(e));
                      },
                      data: (items) {
                        if (items.isEmpty) {
                          return Text(
                            'No trees registered yet.',
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                  color: AranyixColors.onSurfaceMuted,
                                ),
                          );
                        }
                        return Column(
                          children: [
                            for (final raw in items.take(4))
                              ListTile(
                                contentPadding: EdgeInsets.zero,
                                title: Text((raw as Map<String, dynamic>)['species_text'] as String? ?? 'Tree'),
                                subtitle: Text(raw['public_code'] as String? ?? ''),
                                trailing: const Icon(Icons.chevron_right),
                                onTap: () => context.push('/trees/${raw['id']}'),
                              ),
                          ],
                        );
                      },
                    ),
                  ]),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
