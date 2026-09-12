import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../l10n/alert_labels.dart';
import 'prototype/prototype_ui.dart';

/// Unread fire/flood/locust hazard rollup from monitoring summary.
class HazardSummaryCard extends StatelessWidget {
  const HazardSummaryCard({
    super.key,
    required this.hazardCounts,
    this.firmsLive,
  });

  final Map<String, int> hazardCounts;
  final bool? firmsLive;

  int get _total => hazardCounts.values.fold(0, (a, b) => a + b);

  @override
  Widget build(BuildContext context) {
    if (_total == 0) return const SizedBox.shrink();

    final lang = Localizations.localeOf(context).languageCode;
    final entries = hazardCounts.entries.where((e) => e.value > 0).toList();

    return Material(
      color: PrototypeColors.bgSurface,
      borderRadius: BorderRadius.circular(PrototypeRadii.lg),
      child: InkWell(
        onTap: () => context.go('/notifications?filter=fire'),
        borderRadius: BorderRadius.circular(PrototypeRadii.lg),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(PrototypeRadii.lg),
            border: Border.all(color: const Color(0xFFFECACA)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Text('🔥', style: TextStyle(fontSize: 18)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Hazard watch',
                      style: GoogleFonts.dmSans(fontSize: 15, fontWeight: FontWeight.w700),
                    ),
                  ),
                  if (firmsLive != null)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: firmsLive! ? const Color(0xFFDCFCE7) : const Color(0xFFFFF7ED),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        firmsLive! ? 'FIRMS live' : 'FIRMS fallback',
                        style: GoogleFonts.dmSans(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: firmsLive! ? const Color(0xFF166534) : const Color(0xFF9A3412),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: entries.map((entry) {
                  final filter = entry.key.contains('fire')
                      ? 'fire'
                      : entry.key.contains('flood')
                          ? 'flood'
                          : entry.key.contains('locust')
                              ? 'locust'
                              : 'all';
                  return ActionChip(
                    label: Text('${alertKindLabel(entry.key, languageCode: lang)}: ${entry.value}'),
                    onPressed: () => context.go('/notifications?filter=$filter'),
                    backgroundColor: const Color(0xFFFFF1F2),
                    side: const BorderSide(color: Color(0xFFFECACA)),
                  );
                }).toList(),
              ),
              const SizedBox(height: 4),
              Text(
                'Tap to review hazard alerts',
                style: GoogleFonts.dmSans(fontSize: 12, color: PrototypeColors.textSecondary),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
