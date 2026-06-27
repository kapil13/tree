import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../providers.dart';

class TreeDetailScreen extends ConsumerStatefulWidget {
  const TreeDetailScreen({super.key, required this.id});
  final String id;
  @override
  ConsumerState<TreeDetailScreen> createState() => _TreeDetailScreenState();
}

class _TreeDetailScreenState extends ConsumerState<TreeDetailScreen> {
  Map<String, dynamic>? tree;
  bool analyzing = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final api = await ref.read(apiClientProvider.future);
    final t = await api.getTree(widget.id);
    if (mounted) setState(() => tree = t);
  }

  Future<void> _analyze() async {
    setState(() => analyzing = true);
    final api = await ref.read(apiClientProvider.future);
    await api.runAnalysis(widget.id);
    await _load();
    if (mounted) setState(() => analyzing = false);
  }

  @override
  Widget build(BuildContext context) {
    final t = tree;
    return Scaffold(
      appBar: AppBar(title: Text(t?['species_text'] ?? 'Tree')),
      body: t == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(t['public_code'], style: const TextStyle(fontFamily: 'monospace')),
                        const SizedBox(height: 8),
                        _row('Health', t['current_health']),
                        _row('Carbon', '${t['current_carbon_kg']} kg'),
                        _row('DBH', '${t['current_dbh_cm'] ?? '—'} cm'),
                        _row('Height', '${t['current_height_m'] ?? '—'} m'),
                        _row('Satellite', t['satellite_verified'] == true ? '✓' : '—'),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Center(
                      child: QrImageView(
                        data: 'https://byot.earth/p/${t['public_code']}',
                        size: 180,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: analyzing ? null : _analyze,
                  icon: const Icon(Icons.auto_awesome),
                  label: Text(analyzing ? 'Analyzing…' : 'Run AI analysis'),
                ),
              ],
            ),
    );
  }

  Widget _row(String label, String v) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Row(
          children: [
            SizedBox(width: 80, child: Text(label, style: const TextStyle(color: Colors.grey))),
            Expanded(child: Text(v)),
          ],
        ),
      );
}
