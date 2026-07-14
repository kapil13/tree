import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:record/record.dart';

import '../api/api_errors.dart';
import '../providers.dart';

class BioacousticScreen extends ConsumerStatefulWidget {
  const BioacousticScreen({super.key});
  @override
  ConsumerState<BioacousticScreen> createState() => _BioacousticScreenState();
}

class _BioacousticScreenState extends ConsumerState<BioacousticScreen> {
  static const _minSeconds = 30;
  static const _maxSeconds = 60;

  final _recorder = AudioRecorder();
  bool _recording = false;
  int _elapsed = 0;
  Timer? _timer;
  String? _recordPath;
  String? _status;
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _timer?.cancel();
    _recorder.dispose();
    super.dispose();
  }

  Future<void> _start() async {
    setState(() {
      _error = null;
      _status = null;
    });
    final mic = await Permission.microphone.request();
    if (!mic.isGranted) {
      setState(() => _error = 'Microphone permission denied');
      return;
    }
    final dir = await getTemporaryDirectory();
    _recordPath = '${dir.path}/byot_bio_${DateTime.now().millisecondsSinceEpoch}.m4a';
    await _recorder.start(const RecordConfig(encoder: AudioEncoder.aacLc), path: _recordPath!);
    setState(() {
      _recording = true;
      _elapsed = 0;
      _status = 'Recording… hold device steady in a quiet outdoor spot.';
    });
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return;
      setState(() {
        _elapsed++;
        if (_elapsed >= _maxSeconds) _stop();
      });
    });
  }

  Future<void> _stop() async {
    _timer?.cancel();
    if (!_recording) return;
    await _recorder.stop();
    setState(() => _recording = false);
    if (_elapsed < _minSeconds) {
      setState(() => _error = 'Record at least $_minSeconds seconds (currently $_elapsed s).');
      return;
    }
    final path = _recordPath;
    if (path == null) return;
    await _uploadAndAnalyze(path);
  }

  Future<void> _uploadAndAnalyze(String path) async {
    setState(() {
      _busy = true;
      _status = 'Capturing GPS and uploading…';
      _error = null;
    });
    try {
      double lat = 17.385;
      double lon = 78.4867;
      try {
        final pos = await Geolocator.getCurrentPosition();
        lat = pos.latitude;
        lon = pos.longitude;
      } catch (_) {}

      final api = await ref.read(apiClientProvider.future);
      final rec = await api.uploadBioacousticRecording(
        filePath: path,
        durationSeconds: _elapsed.toDouble(),
        latitude: lat,
        longitude: lon,
      );
      setState(() => _status = 'Running AI species identification…');
      await api.analyzeBioacousticRecording(rec['id'] as String);
      ref.invalidate(bioacousticRecordingsProvider);
      ref.invalidate(dashboardProvider);
      if (mounted) {
        setState(() => _status = 'Analysis complete. See results below.');
      }
    } catch (e) {
      if (mounted) setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Color _iucnColor(String? status) {
    switch (status) {
      case 'Critically Endangered':
      case 'Endangered':
        return Colors.red.shade700;
      case 'Vulnerable':
        return Colors.orange.shade800;
      case 'Least Concern':
        return Colors.green.shade700;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final recordings = ref.watch(bioacousticRecordingsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Bioacoustic')),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(bioacousticRecordingsProvider),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    const Icon(Icons.graphic_eq, size: 48, color: Color(0xFF15803D)),
                    const SizedBox(height: 8),
                    Text('$_elapsed s', style: Theme.of(context).textTheme.headlineMedium),
                    Text('Target: $_minSeconds–$_maxSeconds seconds',
                        style: const TextStyle(color: Colors.grey)),
                    const SizedBox(height: 16),
                    if (!_recording)
                      FilledButton.icon(
                        onPressed: _busy ? null : _start,
                        icon: const Icon(Icons.mic),
                        label: const Text('Start recording'),
                      )
                    else
                      OutlinedButton.icon(
                        onPressed: _elapsed < _minSeconds ? null : _stop,
                        icon: const Icon(Icons.stop),
                        label: Text(_elapsed < _minSeconds
                            ? 'Stop (${_minSeconds - _elapsed}s min)'
                            : 'Stop & analyze'),
                      ),
                    if (_status != null) ...[
                      const SizedBox(height: 12),
                      Text(_status!, textAlign: TextAlign.center),
                    ],
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      Text(_error!, style: const TextStyle(color: Colors.red), textAlign: TextAlign.center),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text('Recordings', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            recordings.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Text(apiErrorMessage(e)),
              data: (items) {
                if (items.isEmpty) {
                  return const Text('No recordings yet.');
                }
                return Column(
                  children: items.map((raw) {
                    final r = raw as Map<String, dynamic>;
                    final detections = (r['species_detections'] as List?) ?? [];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${r['duration_seconds']}s · ${r['status']}',
                              style: const TextStyle(fontWeight: FontWeight.bold),
                            ),
                            if (r['bioacoustic_health_score'] != null)
                              Text(
                                'Health ${r['bioacoustic_health_score']}/100 · '
                                'Shannon ${r['shannon_diversity_index']} · '
                                '${r['total_species_count']} species',
                              ),
                            if (r['analysis_summary'] != null)
                              Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: Text(r['analysis_summary'] as String,
                                    style: const TextStyle(color: Colors.grey)),
                              ),
                            ...detections.map((d) {
                              final s = d as Map<String, dynamic>;
                              return ListTile(
                                dense: true,
                                contentPadding: EdgeInsets.zero,
                                title: Text('${s['common_name']} (${s['scientific_name']})'),
                                subtitle: Text(
                                  '${s['taxon_group']} · ${s['call_count']} calls · '
                                  '${((s['confidence'] as num) * 100).toStringAsFixed(0)}%',
                                ),
                                trailing: Text(
                                  s['iucn_status'] as String? ?? '',
                                  style: TextStyle(
                                    color: _iucnColor(s['iucn_status'] as String?),
                                    fontSize: 11,
                                  ),
                                ),
                              );
                            }),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
