import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme.dart';

/// Forest Integrity hero for mobile monitoring (Phase 4.5).
class SarIntegrityHeroCard extends StatelessWidget {
  const SarIntegrityHeroCard({
    super.key,
    required this.avgIntegrity,
    required this.atRisk,
    required this.divergent,
    required this.aligned,
  });

  final num? avgIntegrity;
  final int atRisk;
  final int divergent;
  final int aligned;

  Color _scoreColor(num score) {
    if (score >= 75) return Colors.green.shade700;
    if (score >= 55) return Colors.lime.shade800;
    if (score >= 40) return Colors.amber.shade800;
    return Colors.red.shade700;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AranyixColors.forest.withValues(alpha: 0.12), Colors.white],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(AranyixRadii.card),
        border: Border.all(color: AranyixColors.forest.withValues(alpha: 0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.radar, color: AranyixColors.forest, size: 22),
              const SizedBox(width: 8),
              Text(
                'Forest Integrity',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AranyixColors.forest,
                    ),
              ),
              const Spacer(),
              Text(
                'Axentis SAR',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: AranyixColors.onSurfaceMuted,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (avgIntegrity != null)
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '${avgIntegrity!.round()}',
                  style: TextStyle(
                    fontSize: 36,
                    fontWeight: FontWeight.w800,
                    color: _scoreColor(avgIntegrity!),
                    height: 1,
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.only(left: 4, bottom: 4),
                  child: Text('/ 100 portfolio avg', style: TextStyle(color: AranyixColors.onSurfaceMuted)),
                ),
              ],
            )
          else
            const Text(
              'Run SAR scans on the web satellite page to establish Forest Integrity baselines.',
              style: TextStyle(color: AranyixColors.onSurfaceMuted, fontSize: 13),
            ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _Chip(label: '$atRisk at risk', warn: atRisk > 0),
              _Chip(label: '$divergent divergent', warn: divergent > 0),
              _Chip(label: '$aligned aligned'),
            ],
          ),
        ],
      ),
    );
  }
}

class SarWorkAreaTile extends StatelessWidget {
  const SarWorkAreaTile({
    super.key,
    required this.name,
    required this.subtitle,
    this.integrity,
    this.mode,
    this.recommendedAction,
    this.highlight = false,
    this.onTap,
  });

  final String name;
  final String subtitle;
  final num? integrity;
  final String? mode;
  final String? recommendedAction;
  final bool highlight;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      color: highlight ? Colors.green.shade50 : AranyixColors.surfaceContainer,
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (subtitle.isNotEmpty) Text(subtitle, style: const TextStyle(fontSize: 12)),
            if (integrity != null)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  'Integrity $integrity${mode != null ? ' · $mode' : ''}',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: (integrity! < 50) ? Colors.amber.shade900 : AranyixColors.forest,
                  ),
                ),
              ),
            if (recommendedAction != null && recommendedAction!.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  recommendedAction!,
                  style: const TextStyle(fontSize: 11, color: AranyixColors.onSurfaceMuted),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
          ],
        ),
        trailing: onTap != null ? const Icon(Icons.chevron_right, size: 20) : null,
        onTap: onTap,
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.label, this.warn = false});

  final String label;
  final bool warn;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: warn ? Colors.amber.shade50 : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: warn ? Colors.amber.shade200 : Colors.black12),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 11, color: warn ? Colors.amber.shade900 : AranyixColors.onSurfaceMuted),
      ),
    );
  }
}

String? sarModeLabel(String? mode) {
  switch (mode) {
    case 'aligned':
      return 'Aligned';
    case 'optical_sar_divergent':
      return 'Mismatch';
    case 'sar_gap_fill':
      return 'Gap-fill';
    case 'sar_stress':
      return 'Stress';
    default:
      return mode;
  }
}
