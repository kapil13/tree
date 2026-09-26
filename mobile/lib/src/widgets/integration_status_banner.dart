import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers.dart';
import 'prototype/prototype_ui.dart';

final integrationStripProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final client = await ref.watch(apiClientProvider.future);
  return client.getIntegrationStrip();
});

class IntegrationStatusBanner extends ConsumerWidget {
  const IntegrationStatusBanner({super.key});

  String _modeLabel(String mode) {
    switch (mode) {
      case 'live':
        return 'Live';
      case 'disabled':
        return 'Off';
      default:
        return 'Stub';
    }
  }

  Color _modeColor(String mode) {
    switch (mode) {
      case 'live':
        return const Color(0xFF166534);
      case 'disabled':
        return PrototypeColors.textMuted;
      default:
        return const Color(0xFFB45309);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stripAsync = ref.watch(integrationStripProvider);
    return stripAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
      data: (data) {
        final items = (data['integrations'] as List<dynamic>? ?? [])
            .whereType<Map<String, dynamic>>()
            .toList();
        if (items.isEmpty) return const SizedBox.shrink();
        final stubCount = items.where((item) => item['mode'] != 'live').length;
        if (stubCount == 0) return const SizedBox.shrink();

        return Container(
          width: double.infinity,
          margin: const EdgeInsets.fromLTRB(12, 8, 12, 0),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: const Color(0xFFFFFBEB),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFFCD34D)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Some integrations are not live',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF92400E),
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  for (final item in items)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(color: const Color(0xFFFDE68A)),
                      ),
                      child: Text(
                        '${item['label']}: ${_modeLabel(item['mode']?.toString() ?? 'stub')}',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                          color: _modeColor(item['mode']?.toString() ?? 'stub'),
                        ),
                      ),
                    ),
                ],
              ),
              if (data['audit_export_ready'] == false)
                const Padding(
                  padding: EdgeInsets.only(top: 6),
                  child: Text(
                    'Audit exports require live optical NDVI and SAR.',
                    style: TextStyle(fontSize: 11, color: Color(0xFF92400E)),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}
