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

class FieldWorkerHomeScreen extends ConsumerWidget {
  const FieldWorkerHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
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
                    Text(
                      'Field workspace${user?['organization_name'] != null ? ' · ${user!['organization_name']}' : ''}',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AranyixColors.forest,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text("Today's work", style: Theme.of(context).textTheme.headlineSmall),
                    const SizedBox(height: 6),
                    Text(
                      'Register trees in your assigned packages and keep GPS / photos up to date.',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AranyixColors.onSurfaceMuted,
                          ),
                    ),
                    const SizedBox(height: 12),
                    Align(
                      alignment: Alignment.centerRight,
                      child: IconButton(
                        tooltip: 'Profile',
                        onPressed: () => context.go('/profile'),
                        icon: const Icon(Icons.person_outline, color: AranyixColors.forestDark),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: _ActionCard(
                            icon: Icons.eco_outlined,
                            title: 'Register tree',
                            subtitle: 'GPS, photos, compliance',
                            onTap: canAddTrees(user)
                                ? () => context.push('/trees/new')
                                : null,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _ActionCard(
                            icon: Icons.assignment_outlined,
                            title: 'My projects',
                            subtitle: 'Packages & work areas',
                            onTap: () => context.go('/projects'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
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
                    const SizedBox(height: 24),
                    Text('Assigned projects', style: Theme.of(context).textTheme.titleMedium),
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
                          return const Text(
                            'No projects assigned yet. Ask your supervisor to add you on the project Team tab.',
                          );
                        }
                        return Column(
                          children: [
                            for (final raw in projects)
                              Card(
                                child: ListTile(
                                  title: Text((raw as Map)['name'] as String? ?? 'Project'),
                                  subtitle: Text((raw)['segment'] as String? ?? 'general'),
                                  trailing: const Icon(Icons.chevron_right),
                                  onTap: () => context.push('/projects/${raw['id']}'),
                                ),
                              ),
                          ],
                        );
                      },
                    ),
                    const SizedBox(height: 24),
                    Text('Recent trees', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 8),
                    treesAsync.when(
                      loading: () => const LinearProgressIndicator(),
                      error: (e, _) => Text(apiErrorMessage(e)),
                      data: (trees) {
                        if (trees.isEmpty) {
                          return const Text('No trees registered yet.');
                        }
                        return Column(
                          children: [
                            for (final raw in trees.take(5))
                              ListTile(
                                contentPadding: EdgeInsets.zero,
                                title: Text((raw as Map)['species_text'] as String? ?? 'Tree'),
                                subtitle: Text((raw)['public_code'] as String? ?? ''),
                                trailing: const Icon(Icons.chevron_right, size: 18),
                                onTap: () => context.push('/trees/${raw['id']}'),
                              ),
                          ],
                        );
                      },
                    ),
                    const SizedBox(height: 16),
                    const OfflineTreeQueueSection(),
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

class _ActionCard extends StatelessWidget {
  const _ActionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AranyixRadii.card),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: onTap == null ? Colors.grey : AranyixColors.forest),
              const SizedBox(height: 12),
              Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 4),
              Text(subtitle, style: const TextStyle(fontSize: 12, color: AranyixColors.onSurfaceMuted)),
            ],
          ),
        ),
      ),
    );
  }
}
