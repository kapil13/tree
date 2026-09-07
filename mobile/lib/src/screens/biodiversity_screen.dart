import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../api/api_errors.dart';
import '../providers.dart';
import '../widgets/prototype/prototype_ui.dart';
import '../widgets/stack_route_scaffold.dart';

class BiodiversityScreen extends ConsumerWidget {
  const BiodiversityScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summaryAsync = ref.watch(bioacousticSummaryProvider);
    final dashAsync = ref.watch(dashboardProvider);
    final fencesAsync = ref.watch(plantationFencesProvider);

    return stackRouteScaffold(
      location: '/biodiversity',
      appBar: const PrototypeBackBar(title: 'Biodiversity'),
      body: summaryAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: PrototypeColors.brandCanopy)),
        error: (e, _) {
          return dashAsync.when(
            loading: () => const Center(child: CircularProgressIndicator(color: PrototypeColors.brandCanopy)),
            error: (e2, _) => Center(child: Text(apiErrorMessage(e2))),
            data: (dashboard) => _buildFromDashboard(context, dashboard, fencesAsync),
          );
        },
        data: (summary) => _buildFromSummary(context, ref, summary, fencesAsync),
      ),
    );
  }

  Widget _buildFromSummary(BuildContext context, WidgetRef ref, Map<String, dynamic> summary, AsyncValue<List<dynamic>> fencesAsync) {
    final taxa = (summary['species_richness'] as num?)?.toInt() ?? (summary['total_species_detected'] as num?)?.toInt() ?? 0;
    final shannon = summary['shannon_diversity_index'];
    final fusion = (summary['bioacoustic_health_score'] as num?)?.toInt() ?? (summary['health_score'] as num?)?.toInt() ?? 0;
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
            PrototypeStatBox(value: '$fusion', label: 'Fusion score'),
          ],
        ),
        const SizedBox(height: 12),
        Text(
          'Fused from bioacoustic ($recordings recordings) + satellite ecosystem signals',
          style: GoogleFonts.dmSans(fontSize: 13, color: PrototypeColors.textSecondary),
        ),
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
                final score = (f['bioacoustic_health_score'] as num?)?.toInt() ?? fusion;
                return PrototypeConnectedProject(
                  name: f['name'] as String? ?? 'Site',
                  meta: 'Acoustic health $score/100',
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

  Widget _buildFromDashboard(BuildContext context, Map<String, dynamic> dashboard, AsyncValue<List<dynamic>> fencesAsync) {
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
            PrototypeStatBox(value: '$fusion', label: 'Fusion score'),
          ],
        ),
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
