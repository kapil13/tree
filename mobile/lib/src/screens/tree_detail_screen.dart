import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../api/api_errors.dart';
import '../providers.dart';

class TreeDetailScreen extends ConsumerStatefulWidget {
  const TreeDetailScreen({super.key, required this.id});
  final String id;
  @override
  ConsumerState<TreeDetailScreen> createState() => _TreeDetailScreenState();
}

class _TreeDetailScreenState extends ConsumerState<TreeDetailScreen> {
  Map<String, dynamic>? tree;
  Map<String, dynamic>? satellite;
  String? _error;
  bool _loading = true;
  bool analyzing = false;
  bool satelliteBusy = false;

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
      final t = await api.getTree(widget.id);
      Map<String, dynamic>? sat;
      try {
        sat = await api.getSatelliteHealthLatest(widget.id);
      } catch (_) {
        // satellite health is optional
      }
      if (mounted) {
        setState(() {
          tree = t;
          satellite = sat;
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

  Future<void> _analyze() async {
    setState(() => analyzing = true);
    try {
      final api = await ref.read(apiClientProvider.future);
      await api.runAnalysis(widget.id);
      await _load();
      ref.invalidate(treesProvider);
      ref.invalidate(dashboardProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(apiErrorMessage(e))),
        );
      }
    } finally {
      if (mounted) setState(() => analyzing = false);
    }
  }

  Future<void> _satelliteHealth() async {
    setState(() => satelliteBusy = true);
    try {
      final api = await ref.read(apiClientProvider.future);
      final sat = await api.runSatelliteHealth(widget.id);
      if (mounted) setState(() => satellite = sat);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(apiErrorMessage(e))),
        );
      }
    } finally {
      if (mounted) setState(() => satelliteBusy = false);
    }
  }

  String _str(dynamic v) => v?.toString() ?? '—';

  @override
  Widget build(BuildContext context) {
    final t = tree;
    return Scaffold(
      appBar: AppBar(title: Text(t?['species_text'] ?? 'Tree')),
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
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(t!['public_code'], style: const TextStyle(fontFamily: 'monospace')),
                            const SizedBox(height: 8),
                            _row('Health', _str(t['current_health'])),
                            _row('Carbon', '${t['current_carbon_kg']} kg'),
                            _row('DBH', '${t['current_dbh_cm'] ?? '—'} cm'),
                            _row('Height', '${t['current_height_m'] ?? '—'} m'),
                            _row('Satellite', t['satellite_verified'] == true ? '✓' : '—'),
                          ],
                        ),
                      ),
                    ),
                    if (satellite != null) ...[
                      const SizedBox(height: 12),
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Satellite health',
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                              const SizedBox(height: 8),
                              _row('Risk', _str(satellite!['risk_level'])),
                              _row('Status', _str(satellite!['health_status'])),
                              if (satellite!['ndvi_current'] != null)
                                _row('NDVI', _str(satellite!['ndvi_current'])),
                              const SizedBox(height: 8),
                              Text(_str(satellite!['summary'])),
                              if (satellite!['llm_narrative'] != null) ...[
                                const SizedBox(height: 8),
                                Text(
                                  satellite!['llm_narrative'] as String,
                                  style: const TextStyle(color: Colors.grey),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 12),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: FutureBuilder(
                          future: ref.read(apiClientProvider.future),
                          builder: (context, snap) {
                            final code = t['public_code'] as String;
                            final url = snap.hasData
                                ? snap.data!.publicTreeUrl(code)
                                : 'https://aranyix.tech/p/$code';
                            return Center(
                              child: QrImageView(data: url, size: 180),
                            );
                          },
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    FilledButton.icon(
                      onPressed: analyzing ? null : _analyze,
                      icon: const Icon(Icons.auto_awesome),
                      label: Text(analyzing ? 'Analyzing…' : 'Run AI analysis'),
                    ),
                    const SizedBox(height: 8),
                    OutlinedButton.icon(
                      onPressed: satelliteBusy ? null : _satelliteHealth,
                      icon: const Icon(Icons.satellite_alt),
                      label: Text(satelliteBusy ? 'Checking satellite…' : 'Run satellite health'),
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
