import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../api/api_errors.dart';
import '../geo_utils.dart';
import '../providers.dart';
import '../widgets/prototype/prototype_ui.dart';
import '../widgets/stack_route_scaffold.dart';

class BiodiversityScreen extends ConsumerWidget {
  const BiodiversityScreen({super.key});

  ({double lat, double lon})? _resolveCoords(
    AsyncValue<List<dynamic>> fencesAsync,
    AsyncValue<List<dynamic>> treesAsync,
  ) {
    final fences = fencesAsync.maybeWhen(data: (d) => d, orElse: () => <dynamic>[]);
    for (final raw in fences) {
      final coords = centroidFromFence(raw as Map<String, dynamic>);
      if (coords != null) return coords;
    }
    final trees = treesAsync.maybeWhen(data: (d) => d, orElse: () => <dynamic>[]);
    for (final raw in trees) {
      final coords = coordsFromTree(raw as Map<String, dynamic>);
      if (coords != null) return coords;
    }
    return null;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summaryAsync = ref.watch(bioacousticSummaryProvider);
    final dashAsync = ref.watch(dashboardProvider);
    final fencesAsync = ref.watch(plantationFencesProvider);
    final treesAsync = ref.watch(treesProvider);
    final coords = _resolveCoords(fencesAsync, treesAsync);
    final faunaAsync = coords == null
        ? null
        : ref.watch(regionalFaunaProvider('${coords.lat},${coords.lon}'));

    return stackRouteScaffold(
      location: '/biodiversity',
      appBar: const PrototypeBackBar(title: 'Biodiversity'),
      body: summaryAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: PrototypeColors.brandCanopy)),
        error: (e, _) {
          return dashAsync.when(
            loading: () => const Center(child: CircularProgressIndicator(color: PrototypeColors.brandCanopy)),
            error: (e2, _) => Center(child: Text(apiErrorMessage(e2))),
            data: (dashboard) => _buildFromDashboard(
              context,
              dashboard,
              fencesAsync,
              faunaAsync,
              coords,
            ),
          );
        },
        data: (summary) => _buildFromSummary(
          context,
          ref,
          summary,
          fencesAsync,
          faunaAsync,
          coords,
        ),
      ),
    );
  }

  Widget _speciesSection(AsyncValue<Map<String, dynamic>>? faunaAsync) {
    if (faunaAsync == null) {
      return const PrototypeEmptyState(
        icon: '🦋',
        title: 'No location for species list',
        subtitle: 'Add a work area boundary or register a tree with GPS to load regional fauna.',
      );
    }
    return faunaAsync.when(
      loading: () => const Padding(
        padding: EdgeInsets.symmetric(vertical: 16),
        child: Center(child: CircularProgressIndicator(color: PrototypeColors.brandCanopy)),
      ),
      error: (e, _) => Text(apiErrorMessage(e)),
      data: (fauna) {
        final species = List<dynamic>.from(fauna['species'] ?? []);
        if (species.isEmpty) {
          return const PrototypeEmptyState(
            icon: '🦋',
            title: 'No regional species found',
            subtitle: 'GBIF returned no nearby occurrences for this site.',
          );
        }
        return Column(
          children: species.take(20).map((raw) {
            final s = raw as Map<String, dynamic>;
            final common = s['common_name'] as String?;
            final scientific = s['scientific_name'] as String? ?? 'Unknown';
            final iucn = s['iucn_status'] as String?;
            return PrototypeRegistryRow(
              code: s['taxon_group'] as String? ?? 'fauna',
              species: common?.isNotEmpty == true ? common! : scientific,
              meta: [
                if (common != null && common.isNotEmpty) scientific,
                if (iucn != null && iucn.isNotEmpty) 'IUCN $iucn',
              ].join(' · '),
              health: null,
              badges: [
                if (iucn != null && iucn.isNotEmpty)
                  PrototypeStatusBadge(
                    label: iucn,
                    variant: iucn == 'CR' || iucn == 'EN' ? 'danger' : 'neutral',
                  ),
              ],
            );
          }).toList(),
        );
      },
    );
  }

  Widget _buildFromSummary(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic> summary,
    AsyncValue<List<dynamic>> fencesAsync,
    AsyncValue<Map<String, dynamic>>? faunaAsync,
    ({double lat, double lon})? coords,
  ) {
    final taxa = (summary['species_richness'] as num?)?.toInt() ?? (summary['total_species_detected'] as num?)?.toInt() ?? 0;
    final shannon = summary['shannon_diversity_index'];
    final fusion = (summary['biodiversity_confidence_score'] as num?)?.toInt() ??
        (summary['bioacoustic_health_score'] as num?)?.toInt() ??
        (summary['health_score'] as num?)?.toInt() ??
        0;
    final recordings = (summary['recordings_total'] as num?)?.toInt() ?? (summary['total_recordings'] as num?)?.toInt() ?? 0;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          children: [
            PrototypeStatBox(value: '$taxa', label: 'Taxa'),
            const SizedBox(width: 8),
            PrototypeStatBox(value: shannon != null ? shannon.toString() : '—', label: 'Shannon'),
            const SizedBox(width: 8),
            PrototypeStatBox(value: '$fusion', label: 'Confidence'),
          ],
        ),
        const SizedBox(height: 12),
        Text(
          'Biodiversity Confidence from $recordings analyzed recordings (evidence quality, not habitat health)',
          style: GoogleFonts.dmSans(fontSize: 13, color: PrototypeColors.textSecondary),
        ),
        if (coords != null) ...[
          const SizedBox(height: 8),
          Text(
            'Regional species near ${coords.lat.toStringAsFixed(3)}, ${coords.lon.toStringAsFixed(3)}',
            style: GoogleFonts.dmSans(fontSize: 12, color: PrototypeColors.textTertiary),
          ),
        ],
        const SizedBox(height: 20),
        const PrototypeSectionHeader(title: 'Regional species (GBIF)'),
        _speciesSection(faunaAsync),
        const SizedBox(height: 20),
        const PrototypeSectionHeader(title: 'Hotspots by work area'),
        fencesAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (_, __) => const PrototypeEmptyState(icon: '🦋', title: 'No work areas'),
          data: (fences) {
            if (fences.isEmpty) {
              return const PrototypeEmptyState(icon: '🦋', title: 'No work areas mapped');
            }
            return Column(
              children: fences.take(8).map((raw) {
                final f = raw as Map<String, dynamic>;
                final score = (f['biodiversity_confidence_score'] as num?)?.toInt() ??
                    (f['bioacoustic_health_score'] as num?)?.toInt() ??
                    fusion;
                return PrototypeConnectedProject(
                  name: f['name'] as String? ?? 'Site',
                  meta: 'Confidence $score/100',
                  badge: score >= 75 ? 'Strong' : 'Watch',
                  badgeOk: score >= 75,
                  onTap: () => context.go('/map'),
                );
              }).toList(),
            );
          },
        ),
        const SizedBox(height: 16),
        OutlinedButton(
          onPressed: () => context.go('/bioacoustic'),
          style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
          child: const Text('Bioacoustic detail'),
        ),
      ],
    );
  }

  Widget _buildFromDashboard(
    BuildContext context,
    Map<String, dynamic> dashboard,
    AsyncValue<List<dynamic>> fencesAsync,
    AsyncValue<Map<String, dynamic>>? faunaAsync,
    ({double lat, double lon})? coords,
  ) {
    final bio = dashboard['bioacoustic'] as Map<String, dynamic>? ?? {};
    final taxa = (bio['total_species_detected'] as num?)?.toInt() ?? 0;
    final shannon = bio['shannon_diversity_index'];
    final fusion = (bio['bioacoustic_health_score'] as num?)?.toInt() ?? 0;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          children: [
            PrototypeStatBox(value: '$taxa', label: 'Taxa'),
            const SizedBox(width: 8),
            PrototypeStatBox(value: shannon != null ? shannon.toString() : '—', label: 'Shannon'),
            const SizedBox(width: 8),
            PrototypeStatBox(value: '$fusion', label: 'Confidence'),
          ],
        ),
        if (coords != null) ...[
          const SizedBox(height: 8),
          Text(
            'Regional species near ${coords.lat.toStringAsFixed(3)}, ${coords.lon.toStringAsFixed(3)}',
            style: GoogleFonts.dmSans(fontSize: 12, color: PrototypeColors.textTertiary),
          ),
        ],
        const SizedBox(height: 20),
        const PrototypeSectionHeader(title: 'Regional species (GBIF)'),
        _speciesSection(faunaAsync),
        const SizedBox(height: 20),
        const PrototypeSectionHeader(title: 'Hotspots by work area'),
        fencesAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (_, __) => const SizedBox.shrink(),
          data: (fences) => Column(
            children: fences.take(8).map((raw) {
              final f = raw as Map<String, dynamic>;
              return PrototypeConnectedProject(
                name: f['name'] as String? ?? 'Site',
                meta: 'View on map',
                badge: 'Open',
                badgeOk: true,
                onTap: () => context.go('/map'),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 16),
        FilledButton(
          onPressed: () => context.go('/bioacoustic'),
          style: FilledButton.styleFrom(backgroundColor: PrototypeColors.brandForest, minimumSize: const Size.fromHeight(48)),
          child: const Text('Run bioacoustic survey'),
        ),
      ],
    );
  }
}
