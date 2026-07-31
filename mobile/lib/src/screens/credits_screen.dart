import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_errors.dart';
import '../providers.dart';
import '../theme.dart';

class CreditsScreen extends ConsumerStatefulWidget {
  const CreditsScreen({super.key});

  @override
  ConsumerState<CreditsScreen> createState() => _CreditsScreenState();
}

class _CreditsScreenState extends ConsumerState<CreditsScreen> {
  Map<String, dynamic>? _summary;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = await ref.read(apiClientProvider.future);
      final summary = await api.creditsSummary();
      if (mounted) {
        setState(() {
          _summary = summary;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = apiErrorMessage(e);
          _loading = false;
        });
      }
    }
  }

  String _num(dynamic v) {
    if (v is num) return v.toStringAsFixed(3);
    return v?.toString() ?? '0';
  }

  @override
  Widget build(BuildContext context) {
    final s = _summary;
    final byStatus = Map<String, dynamic>.from(s?['by_status'] ?? {});

    return Scaffold(
      backgroundColor: AranyixColors.surface,
      appBar: AppBar(title: const Text('Credits')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(_error!, textAlign: TextAlign.center),
                        const SizedBox(height: 12),
                        FilledButton(onPressed: _load, child: const Text('Retry')),
                      ],
                    ),
                  ),
                )
              : RefreshIndicator(
                  color: AranyixColors.forest,
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Text(
                        'Organization credit ledger summary (tCO₂e). Estimated until verified / issued.',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: AranyixColors.onSurfaceMuted,
                            ),
                      ),
                      const SizedBox(height: 16),
                      _row('Projects', '${s?['project_count'] ?? 0}'),
                      _row('Gross credits', _num(s?['total_gross_credits_tco2e'])),
                      _row('Buffer withheld', _num(s?['total_buffer_withheld_tco2e'])),
                      _row('Net credits', _num(s?['total_net_credits_tco2e'])),
                      _row('Issued credits', _num(s?['total_issued_credits_tco2e'])),
                      if (byStatus.isNotEmpty) ...[
                        const SizedBox(height: 20),
                        Text('By status', style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 8),
                        for (final e in byStatus.entries)
                          ListTile(
                            contentPadding: EdgeInsets.zero,
                            title: Text(e.key),
                            trailing: Text('${e.value}'),
                          ),
                      ],
                    ],
                  ),
                ),
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Expanded(child: Text(label, style: const TextStyle(color: AranyixColors.onSurfaceMuted))),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
        ],
      ),
    );
  }
}
