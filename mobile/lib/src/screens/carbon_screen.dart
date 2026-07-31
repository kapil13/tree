import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_errors.dart';
import '../providers.dart';
import '../theme.dart';

class CarbonScreen extends ConsumerStatefulWidget {
  const CarbonScreen({super.key});

  @override
  ConsumerState<CarbonScreen> createState() => _CarbonScreenState();
}

class _CarbonScreenState extends ConsumerState<CarbonScreen> {
  final _species = TextEditingController();
  final _dbh = TextEditingController();
  final _height = TextEditingController();
  final _age = TextEditingController();
  bool _busy = false;
  Map<String, dynamic>? _result;
  String? _error;

  @override
  void dispose() {
    _species.dispose();
    _dbh.dispose();
    _height.dispose();
    _age.dispose();
    super.dispose();
  }

  Future<void> _estimate() async {
    final species = _species.text.trim();
    if (species.isEmpty) {
      setState(() => _error = 'Enter a species name.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
      _result = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      final result = await api.carbonEstimate(
        species: species,
        dbhCm: double.tryParse(_dbh.text.trim()),
        heightM: double.tryParse(_height.text.trim()),
        ageYears: double.tryParse(_age.text.trim()),
      );
      if (mounted) setState(() => _result = result);
    } catch (e) {
      if (mounted) setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final co2e = (_result?['co2e_kg'] as num?)?.toDouble();
    final notes = List<dynamic>.from(_result?['notes'] ?? []);

    return Scaffold(
      backgroundColor: AranyixColors.surface,
      appBar: AppBar(title: const Text('Carbon calculator')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'Estimate CO₂e from species and optional measurements. '
            'This is an Estimate — not a Live field measurement or registry-issued credit.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AranyixColors.onSurfaceMuted),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _species,
            decoration: const InputDecoration(labelText: 'Species'),
            textCapitalization: TextCapitalization.sentences,
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _dbh,
            decoration: const InputDecoration(labelText: 'DBH (cm, optional)'),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _height,
            decoration: const InputDecoration(labelText: 'Height (m, optional)'),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _age,
            decoration: const InputDecoration(labelText: 'Age (years, optional)'),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _busy ? null : _estimate,
            child: Text(_busy ? 'Estimating…' : 'Estimate'),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ],
          if (_result != null) ...[
            const SizedBox(height: 20),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Estimate', style: TextStyle(fontWeight: FontWeight.w600, color: AranyixColors.forest)),
                    const SizedBox(height: 8),
                    Text(
                      co2e != null ? '${co2e.toStringAsFixed(1)} kg CO₂e' : '—',
                      style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 8),
                    Text('Carbon: ${(_result!['carbon_kg'] as num?)?.toStringAsFixed(1) ?? '—'} kg'),
                    Text('Confidence: ${(_result!['confidence'] as num?)?.toStringAsFixed(2) ?? '—'}'),
                    Text('Methodology: ${_result!['methodology'] ?? '—'}'),
                    const SizedBox(height: 8),
                    const Text(
                      'Honesty label: Estimate (modelled). Not Live sensor data.',
                      style: TextStyle(fontSize: 12, color: AranyixColors.onSurfaceMuted),
                    ),
                    if (notes.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      for (final n in notes) Text('• $n', style: const TextStyle(fontSize: 12)),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
