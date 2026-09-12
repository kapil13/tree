import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'prototype/prototype_ui.dart';

/// Renders backend `payload.interpretation` on alert detail screens.
class AlertPreparednessCard extends StatelessWidget {
  const AlertPreparednessCard({super.key, required this.interpretation});

  final Map<String, dynamic> interpretation;

  @override
  Widget build(BuildContext context) {
    final headline = interpretation['headline'] as String? ?? '';
    final meaning = interpretation['meaning'] as String? ?? '';
    final prepare = List<String>.from(interpretation['prepare'] as List? ?? const []);
    final urgency = interpretation['urgency'] as String? ?? 'monitor';
    final category = interpretation['category'] as String? ?? 'general';

    if (headline.isEmpty && meaning.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: PrototypeColors.bgSurface,
        borderRadius: BorderRadius.circular(PrototypeRadii.lg),
        border: Border.all(color: PrototypeColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  headline,
                  style: GoogleFonts.dmSans(fontSize: 16, fontWeight: FontWeight.w700),
                ),
              ),
              const SizedBox(width: 8),
              _Chip(label: _categoryLabel(category)),
              if (urgency != 'monitor') ...[
                const SizedBox(width: 6),
                _Chip(label: _urgencyLabel(urgency), accent: true),
              ],
            ],
          ),
          if (meaning.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(meaning, style: GoogleFonts.dmSans(fontSize: 14, height: 1.5, color: PrototypeColors.textSecondary)),
          ],
          if (prepare.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text('Prepare', style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            for (final step in prepare)
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('• ', style: TextStyle(fontSize: 14)),
                    Expanded(child: Text(step, style: GoogleFonts.dmSans(fontSize: 13, height: 1.45))),
                  ],
                ),
              ),
          ],
        ],
      ),
    );
  }

  String _categoryLabel(String category) {
    return switch (category) {
      'fire' => 'Fire',
      'flood' => 'Flood',
      'weather' => 'Weather',
      'pest' => 'Pest',
      'satellite' => 'Satellite',
      _ => 'Alert',
    };
  }

  String _urgencyLabel(String urgency) {
    return switch (urgency) {
      'today' => 'Act today',
      'this_week' => 'This week',
      _ => 'Monitor',
    };
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.label, this.accent = false});

  final String label;
  final bool accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: accent ? const Color(0xFFFFF7ED) : PrototypeColors.bgSubtle,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: accent ? const Color(0xFFFDBA74) : PrototypeColors.border),
      ),
      child: Text(
        label,
        style: GoogleFonts.dmSans(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: accent ? const Color(0xFF9A3412) : PrototypeColors.textSecondary,
        ),
      ),
    );
  }
}
