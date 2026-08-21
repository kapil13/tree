import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_errors.dart';
import '../providers.dart';
import '../theme.dart';
import '../widgets/mobile_app_bar.dart';

class StewardshipScreen extends ConsumerWidget {
  const StewardshipScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(citizenProfileProvider);
    final stewardshipAsync = ref.watch(citizenStewardshipProvider);
    final adoptableAsync = ref.watch(citizenAdoptableProvider);

    return Scaffold(
      backgroundColor: AranyixColors.surface,
      appBar: const MobileAppBar(title: 'Stewardship'),
      body: profileAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => _ErrorState(
          message: apiErrorMessage(e),
          onRetry: () {
            ref.invalidate(citizenProfileProvider);
            ref.invalidate(citizenStewardshipProvider);
            ref.invalidate(citizenAdoptableProvider);
          },
        ),
        data: (profile) {
          return stewardshipAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => _ErrorState(
              message: apiErrorMessage(e),
              onRetry: () => ref.invalidate(citizenStewardshipProvider),
            ),
            data: (stewardship) {
              final owned = List<Map<String, dynamic>>.from(stewardship['owned'] ?? []);
              final adopted = List<Map<String, dynamic>>.from(stewardship['adopted'] ?? []);
              final dueCount = stewardship['due_count'] as int? ?? 0;
              final badges = List<Map<String, dynamic>>.from(profile['badges'] ?? []);

              return RefreshIndicator(
                color: AranyixColors.forest,
                onRefresh: () async {
                  ref.invalidate(citizenProfileProvider);
                  ref.invalidate(citizenStewardshipProvider);
                  ref.invalidate(citizenAdoptableProvider);
                },
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                  children: [
                    _KpiGrid(
                      points: profile['points'] as int? ?? 0,
                      streak: profile['stewardship_streak'] as int? ?? 0,
                      badges: badges.length,
                      dueCount: dueCount,
                    ),
                    if (badges.isNotEmpty) ...[
                      const SizedBox(height: 16),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          for (final badge in badges)
                            Chip(
                              avatar: const Icon(Icons.military_tech_outlined, size: 18),
                              label: Text(badge['label'] as String? ?? 'Badge'),
                              backgroundColor: AranyixColors.forestLight,
                            ),
                        ],
                      ),
                    ],
                    if (dueCount > 0) ...[
                      const SizedBox(height: 16),
                      _BannerCard(
                        icon: Icons.event_repeat,
                        title: '$dueCount check-in${dueCount == 1 ? '' : 's'} due',
                        subtitle: 'Visit your trees and confirm survival with GPS.',
                        tone: _BannerTone.warning,
                      ),
                    ],
                    const SizedBox(height: 20),
                    _SectionHeader(
                      icon: Icons.park_outlined,
                      title: 'Your grove',
                      subtitle: '${owned.length} owned tree${owned.length == 1 ? '' : 's'}',
                    ),
                    if (owned.isEmpty)
                      const _EmptyHint('Register a tree to start your grove.')
                    else
                      for (final tree in owned)
                        _StewardshipTreeCard(tree: tree),
                    const SizedBox(height: 20),
                    _SectionHeader(
                      icon: Icons.favorite_outline,
                      title: 'Adopted trees',
                      subtitle: '${adopted.length} stewarded',
                    ),
                    if (adopted.isEmpty)
                      const _EmptyHint('Adopt community trees below to earn stewardship points.')
                    else
                      for (final tree in adopted)
                        _StewardshipTreeCard(tree: tree, showRelinquish: true, ref: ref),
                    const SizedBox(height: 20),
                    _SectionHeader(
                      icon: Icons.volunteer_activism_outlined,
                      title: 'Adopt a tree',
                      subtitle: 'Support trees planted by others',
                    ),
                    adoptableAsync.when(
                      loading: () => const Padding(
                        padding: EdgeInsets.all(24),
                        child: Center(child: CircularProgressIndicator()),
                      ),
                      error: (e, _) => _ErrorState(
                        message: apiErrorMessage(e),
                        onRetry: () => ref.invalidate(citizenAdoptableProvider),
                      ),
                      data: (page) {
                        final items = List<Map<String, dynamic>>.from(page['items'] ?? []);
                        if (items.isEmpty) {
                          return const _EmptyHint('No adoptable trees nearby right now. Check back soon.');
                        }
                        return Column(
                          children: [
                            for (final tree in items)
                              _AdoptableTreeCard(
                                tree: tree,
                                onAdopted: () {
                                  ref.invalidate(citizenProfileProvider);
                                  ref.invalidate(citizenStewardshipProvider);
                                  ref.invalidate(citizenAdoptableProvider);
                                },
                              ),
                          ],
                        );
                      },
                    ),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }
}

class _KpiGrid extends StatelessWidget {
  const _KpiGrid({
    required this.points,
    required this.streak,
    required this.badges,
    required this.dueCount,
  });

  final int points;
  final int streak;
  final int badges;
  final int dueCount;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = (constraints.maxWidth - 12) / 2;
        return Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            _KpiTile(width: width, label: 'Points', value: '$points'),
            _KpiTile(width: width, label: 'Streak', value: '${streak}w'),
            _KpiTile(width: width, label: 'Badges', value: '$badges'),
            _KpiTile(
              width: width,
              label: 'Due check-ins',
              value: '$dueCount',
              highlight: dueCount > 0,
            ),
          ],
        );
      },
    );
  }
}

class _KpiTile extends StatelessWidget {
  const _KpiTile({
    required this.width,
    required this.label,
    required this.value,
    this.highlight = false,
  });

  final double width;
  final String label;
  final String value;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AranyixColors.surfaceElevated,
        borderRadius: BorderRadius.circular(AranyixRadii.card),
        border: Border.all(color: AranyixColors.border),
        boxShadow: AranyixShadows.card,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.6,
              color: AranyixColors.onSurfaceMuted,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.w800,
              color: highlight ? AranyixColors.warningOnContainer : AranyixColors.forestDark,
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Icon(icon, color: AranyixColors.forest),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: Theme.of(context).textTheme.titleMedium),
                Text(
                  subtitle,
                  style: const TextStyle(fontSize: 12, color: AranyixColors.onSurfaceMuted),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StewardshipTreeCard extends StatelessWidget {
  const _StewardshipTreeCard({
    required this.tree,
    this.showRelinquish = false,
    this.ref,
  });

  final Map<String, dynamic> tree;
  final bool showRelinquish;
  final WidgetRef? ref;

  @override
  Widget build(BuildContext context) {
    final due = tree['next_checkin_due'] == true;
    final title = tree['nickname'] as String? ?? tree['species_text'] as String? ?? 'Tree';
    final code = tree['public_code'] as String? ?? '';
    final id = tree['id'] as String?;

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AranyixRadii.card),
        side: const BorderSide(color: AranyixColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
                      Text(code, style: const TextStyle(fontSize: 12, color: AranyixColors.onSurfaceMuted)),
                    ],
                  ),
                ),
                _StatusPill(due: due),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              '${tree['stewardship_checkins'] ?? 0} check-ins'
              '${tree['days_since_planted'] != null ? ' · ${tree['days_since_planted']} days old' : ''}',
              style: const TextStyle(fontSize: 12, color: AranyixColors.onSurfaceMuted),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              children: [
                if (id != null)
                  FilledButton(
                    onPressed: () => context.push('/trees/$id'),
                    child: const Text('View tree'),
                  ),
                if (due && id != null)
                  OutlinedButton(
                    onPressed: () => context.push('/trees/$id/survival'),
                    child: const Text('Check in'),
                  ),
                if (showRelinquish && id != null && ref != null)
                  TextButton(
                    onPressed: () => _relinquish(context, ref!, id),
                    child: const Text('Relinquish'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _relinquish(BuildContext context, WidgetRef ref, String treeId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Relinquish adoption?'),
        content: const Text('You can adopt another tree later.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Relinquish')),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;
    try {
      final api = await ref.read(apiClientProvider.future);
      await api.relinquishAdoption(treeId);
      ref.invalidate(citizenStewardshipProvider);
      ref.invalidate(citizenProfileProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Adoption removed')),
        );
      }
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
    }
  }
}

class _AdoptableTreeCard extends ConsumerStatefulWidget {
  const _AdoptableTreeCard({required this.tree, required this.onAdopted});

  final Map<String, dynamic> tree;
  final VoidCallback onAdopted;

  @override
  ConsumerState<_AdoptableTreeCard> createState() => _AdoptableTreeCardState();
}

class _AdoptableTreeCardState extends ConsumerState<_AdoptableTreeCard> {
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    final tree = widget.tree;
    final title = tree['species_text'] as String? ?? 'Tree';
    final code = tree['public_code'] as String? ?? '';
    final owner = tree['owner_name'] as String?;

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AranyixRadii.card),
        side: const BorderSide(color: AranyixColors.border),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(
          [code, if (owner != null) 'Planted by $owner'].join(' · '),
          style: const TextStyle(fontSize: 12),
        ),
        trailing: FilledButton(
          onPressed: _busy ? null : _adopt,
          child: _busy
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                )
              : const Text('Adopt'),
        ),
      ),
    );
  }

  Future<void> _adopt() async {
    final id = widget.tree['id'] as String?;
    if (id == null) return;
    setState(() => _busy = true);
    try {
      final api = await ref.read(apiClientProvider.future);
      await api.adoptTree(id);
      widget.onAdopted();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Tree adopted — thank you for stewarding it.')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }
}

enum _BannerTone { warning }

class _BannerCard extends StatelessWidget {
  const _BannerCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.tone,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final _BannerTone tone;

  @override
  Widget build(BuildContext context) {
    final bg = tone == _BannerTone.warning
        ? AranyixColors.warningContainer
        : AranyixColors.forestLight;
    final fg = tone == _BannerTone.warning
        ? AranyixColors.warningOnContainer
        : AranyixColors.forestDark;
    final border = tone == _BannerTone.warning ? AranyixColors.warningBorder : AranyixColors.border;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(AranyixRadii.card),
        border: Border.all(color: border),
      ),
      child: Row(
        children: [
          Icon(icon, color: fg),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(fontWeight: FontWeight.w700, color: fg)),
                const SizedBox(height: 2),
                Text(subtitle, style: TextStyle(fontSize: 13, color: fg)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.due});

  final bool due;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: due ? AranyixColors.warningContainer : AranyixColors.forestLight,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        due ? 'Check-in due' : 'On track',
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          color: due ? AranyixColors.warningOnContainer : AranyixColors.forestDark,
        ),
      ),
    );
  }
}

class _EmptyHint extends StatelessWidget {
  const _EmptyHint(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Text(text, style: const TextStyle(color: AranyixColors.onSurfaceMuted)),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
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
    );
  }
}
