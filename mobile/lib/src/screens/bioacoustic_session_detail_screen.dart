import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../api/api_errors.dart';
import '../providers.dart';
import '../widgets/prototype/prototype_ui.dart';
import '../widgets/stack_route_scaffold.dart';

final bioacousticRecordingProvider =
    FutureProvider.autoDispose.family<Map<String, dynamic>, String>((ref, id) async {
  final api = await ref.watch(apiClientProvider.future);
  return api.getBioacousticRecording(id);
});

class BioacousticSessionDetailScreen extends ConsumerWidget {
  const BioacousticSessionDetailScreen({super.key, required this.recordingId});

  final String recordingId;

  Color _iucnColor(String? status) {
    switch (status) {
      case 'Critically Endangered':
      case 'Endangered':
        return const Color(0xFFDC2626);
      case 'Vulnerable':
        return const Color(0xFFEA580C);
      case 'Least Concern':
        return const Color(0xFF15803D);
      default:
        return PrototypeColors.textSecondary;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final recordingAsync = ref.watch(bioacousticRecordingProvider(recordingId));

    return stackRouteScaffold(
      location: '/bioacoustic/$recordingId',
      appBar: const PrototypeBackBar(title: 'Session detail'),
      body: recordingAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: PrototypeColors.brandCanopy)),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(apiErrorMessage(e), textAlign: TextAlign.center),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () => ref.invalidate(bioacousticRecordingProvider(recordingId)),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
        data: (rec) {
          final detections = List<Map<String, dynamic>>.from(rec['species_detections'] ?? []);
          final site = rec['plantation_fence_name'] as String? ?? rec['site_name'] as String? ?? 'Field site';
          final duration = (rec['duration_seconds'] as num?)?.toStringAsFixed(0) ?? '—';
          final status = rec['status'] as String? ?? 'analyzed';
          final created = rec['created_at'] as String? ?? '';
          final score = rec['bioacoustic_health_score'];
          final shannon = rec['shannon_diversity_index'];
          final richness = rec['species_richness'] ?? rec['total_species_count'];

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: PrototypeColors.bgSurface,
                  borderRadius: BorderRadius.circular(PrototypeRadii.md),
                  border: Border.all(color: PrototypeColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(site, style: GoogleFonts.dmSans(fontSize: 18, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 4),
                    Text(
                      '${duration}s · $status · $created',
                      style: GoogleFonts.dmSans(fontSize: 13, color: PrototypeColors.textSecondary),
                    ),
                    if (score != null || shannon != null) ...[
                      const SizedBox(height: 10),
                      Text(
                        [
                          if (score != null) 'Health $score/100',
                          if (richness != null) 'Richness $richness',
                          if (shannon != null) 'Shannon $shannon',
                        ].join(' · '),
                        style: GoogleFonts.dmSans(fontSize: 13, color: PrototypeColors.brandForest),
                      ),
                    ],
                    if (rec['analysis_summary'] != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        rec['analysis_summary'] as String,
                        style: GoogleFonts.dmSans(fontSize: 13, color: PrototypeColors.textSecondary, height: 1.4),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Container(
                height: 64,
                padding: const EdgeInsets.symmetric(horizontal: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFFE8F5EC),
                  borderRadius: BorderRadius.circular(PrototypeRadii.md),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    for (final h in [30, 50, 70, 40, 90, 60, 80, 45, 75, 55, 85, 65, 50, 70, 40])
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 1.5),
                          child: Container(
                            height: h.toDouble(),
                            decoration: BoxDecoration(
                              color: PrototypeColors.brandForest.withValues(alpha: 0.75),
                              borderRadius: BorderRadius.circular(3),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              Text('Detected species', style: GoogleFonts.dmSans(fontSize: 15, fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              if (detections.isEmpty)
                Text(
                  'No species detections yet.',
                  style: GoogleFonts.dmSans(fontSize: 13, color: PrototypeColors.textSecondary),
                )
              else
                ...detections.map((s) {
                  final confidence = ((s['confidence'] as num?) ?? 0) * 100;
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      color: PrototypeColors.bgSurface,
                      borderRadius: BorderRadius.circular(PrototypeRadii.md),
                      border: Border.all(color: PrototypeColors.border),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${s['common_name']} (${s['scientific_name']})',
                                style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w600),
                              ),
                              Text(
                                '${s['taxon_group']} · ${s['call_count']} calls',
                                style: GoogleFonts.dmSans(fontSize: 12, color: PrototypeColors.textSecondary),
                              ),
                            ],
                          ),
                        ),
                        Text(
                          '${confidence.toStringAsFixed(0)}%',
                          style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w700, color: PrototypeColors.brandForest),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          s['iucn_status'] as String? ?? '',
                          style: GoogleFonts.dmSans(fontSize: 11, color: _iucnColor(s['iucn_status'] as String?)),
                        ),
                      ],
                    ),
                  );
                }),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () => context.go('/biodiversity'),
                child: const Text('View biodiversity fusion'),
              ),
              const SizedBox(height: 8),
              OutlinedButton(
                onPressed: () => context.go('/evidence'),
                child: const Text('Add to evidence bundle'),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => context.go('/map'),
                child: const Text('View on map'),
              ),
            ],
          );
        },
      ),
    );
  }
}
