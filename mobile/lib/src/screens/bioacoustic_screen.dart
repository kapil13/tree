import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:record/record.dart';

import '../api/api_errors.dart';
import '../location_helper.dart';
import '../offline/bioacoustic_queue.dart';
import '../offline/bioacoustic_sync.dart';
import '../providers.dart';

class BioacousticScreen extends ConsumerStatefulWidget {
  const BioacousticScreen({super.key});
  @override
  ConsumerState<BioacousticScreen> createState() => _BioacousticScreenState();
}

class _BioacousticScreenState extends ConsumerState<BioacousticScreen> {
  static const _minSeconds = 60;
  static const _maxSeconds = 180;
  static const _preferredSeconds = 120;

  final _recorder = AudioRecorder();
  bool _recording = false;
  int _elapsed = 0;
  double _approxSpl = 0;
  bool _noiseWarning = false;
  Timer? _timer;
  StreamSubscription<Amplitude>? _ampSub;
  String? _recordPath;
  String? _status;
  String? _error;
  bool _busy = false;
  String? _selectedFenceId;
  List<dynamic> _fences = [];

  @override
  void initState() {
    super.initState();
    Future.microtask(() async {
      await ref.read(bioacousticQueueProvider).init();
      try {
        final api = await ref.read(apiClientProvider.future);
        final fences = await api.listPlantationFences();
        if (mounted) setState(() => _fences = fences);
      } catch (_) {}
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _ampSub?.cancel();
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
    _recordPath = '${dir.path}/byot_bio_${DateTime.now().millisecondsSinceEpoch}.wav';
    await _recorder.start(
      const RecordConfig(
        encoder: AudioEncoder.wav,
        sampleRate: 48000,
        numChannels: 1,
        bitRate: 768000,
      ),
      path: _recordPath!,
    );
    _ampSub?.cancel();
    _ampSub = _recorder.onAmplitudeChanged(const Duration(milliseconds: 300)).listen((amp) {
      if (!mounted || !_recording) return;
      final approx = amp.current + 90;
      setState(() {
        _approxSpl = approx;
        _noiseWarning = approx >= 62;
      });
    });
    setState(() {
      _recording = true;
      _elapsed = 0;
      _approxSpl = 0;
      _noiseWarning = false;
      _status =
          'Recording ambient soundscape… hold phone 1–1.5 m above ground, stay still.';
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
    await _ampSub?.cancel();
    _ampSub = null;
    if (!_recording) return;
    await _recorder.stop();
    setState(() => _recording = false);
    if (_elapsed < _minSeconds) {
      setState(() => _error = 'Record at least $_minSeconds seconds (currently $_elapsed s).');
      return;
    }
    final path = _recordPath;
    if (path == null) return;
    await _saveOrUpload(path);
  }

  Future<({double lat, double lon, String? note})> _captureGps() async {
    final gps = await captureLocation();
    return (lat: gps.latitude, lon: gps.longitude, note: gps.message);
  }

  Future<void> _saveOrUpload(String path) async {
    setState(() {
      _busy = true;
      _status = 'Saving recording…';
      _error = null;
    });
    try {
      final gps = await _captureGps();
      final sync = ref.read(bioacousticSyncProvider);
      final online = await sync.isOnline();
      final gpsNote = gps.note;

      if (!online) {
        await ref.read(bioacousticQueueProvider).enqueue(
              tempFilePath: path,
              durationSeconds: _elapsed.toDouble(),
              latitude: gps.lat,
              longitude: gps.lon,
            );
        if (mounted) {
          setState(() => _status = gpsNote != null
              ? 'Saved offline. $gpsNote'
              : 'Saved offline. Will upload and analyze automatically when you have signal.');
        }
        return;
      }

      setState(() => _status = gpsNote ?? 'Uploading and analyzing…');
      try {
        final api = await ref.read(apiClientProvider.future);
        final rec = await api.uploadBioacousticRecording(
          filePath: path,
          durationSeconds: _elapsed.toDouble(),
          latitude: gps.lat,
          longitude: gps.lon,
          plantationFenceId: _selectedFenceId,
        );
        await api.analyzeBioacousticRecording(rec['id'] as String);
        ref.invalidate(bioacousticRecordingsProvider);
        ref.invalidate(dashboardProvider);
        if (mounted) {
          setState(() => _status = 'Analysis complete. See results below.');
        }
      } catch (e) {
        if (isUnauthorizedError(e)) rethrow;
        await ref.read(bioacousticQueueProvider).enqueue(
              tempFilePath: path,
              durationSeconds: _elapsed.toDouble(),
              latitude: gps.lat,
              longitude: gps.lon,
            );
        if (mounted) {
          setState(() => _status =
              'Upload failed — saved offline. Tap “Sync now” when your connection is stable.');
          _error = apiErrorMessage(e);
        }
      }
    } catch (e) {
      if (mounted) setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _syncNow() async {
    setState(() {
      _busy = true;
      _error = null;
      _status = 'Syncing offline recordings…';
    });
    try {
      final sync = ref.read(bioacousticSyncProvider);
      final count = await sync.syncAll(() => ref.read(apiClientProvider.future));
      ref.invalidate(bioacousticRecordingsProvider);
      ref.invalidate(dashboardProvider);
      if (mounted) {
        if (count > 0) {
          setState(() => _status = 'Synced $count recording${count == 1 ? '' : 's'}.');
        } else if (sync.lastError != null) {
          setState(() => _error = sync.lastError);
        } else {
          setState(() => _status = 'No pending recordings to sync.');
        }
      }
    } catch (e) {
      if (mounted) setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _retryItem(QueuedBioacousticRecording item) async {
    await ref.read(bioacousticQueueProvider).markPending(item.id);
    await _syncNow();
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

  String _queueStatusLabel(BioacousticQueueStatus status) {
    switch (status) {
      case BioacousticQueueStatus.pending:
        return 'Waiting to sync';
      case BioacousticQueueStatus.syncing:
        return 'Syncing…';
      case BioacousticQueueStatus.failed:
        return 'Sync failed';
    }
  }

  IconData _queueStatusIcon(BioacousticQueueStatus status) {
    switch (status) {
      case BioacousticQueueStatus.pending:
        return Icons.cloud_off;
      case BioacousticQueueStatus.syncing:
        return Icons.cloud_upload;
      case BioacousticQueueStatus.failed:
        return Icons.error_outline;
    }
  }

  @override
  Widget build(BuildContext context) {
    final recordings = ref.watch(bioacousticRecordingsProvider);
    final queue = ref.watch(bioacousticQueueProvider);
    final sync = ref.watch(bioacousticSyncProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Biodiversity Assessment'),
        actions: [
          if (sync.syncing)
            const Padding(
              padding: EdgeInsets.all(16),
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            )
          else
            IconButton(
              tooltip: 'Sync offline recordings',
              onPressed: _busy ? null : _syncNow,
              icon: const Icon(Icons.sync),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(bioacousticRecordingsProvider);
          await _syncNow();
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text('Plantation site (optional)', style: TextStyle(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String?>(
                      value: _selectedFenceId,
                      decoration: const InputDecoration(
                        border: OutlineInputBorder(),
                        hintText: 'Link to site for NDVI reports',
                      ),
                      items: [
                        const DropdownMenuItem<String?>(value: null, child: Text('No site — GPS only')),
                        ..._fences.map((f) {
                          final m = f as Map<String, dynamic>;
                          return DropdownMenuItem<String?>(
                            value: m['id'] as String,
                            child: Text(m['name'] as String? ?? 'Site'),
                          );
                        }),
                      ],
                      onChanged: _busy ? null : (v) => setState(() => _selectedFenceId = v),
                    ),
                  ],
                ),
              ),
            ),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    const Icon(Icons.graphic_eq, size: 48, color: Color(0xFF15803D)),
                    const SizedBox(height: 8),
                    Text('$_elapsed s', style: Theme.of(context).textTheme.headlineMedium),
                    Text('Target: $_minSeconds–$_maxSeconds s · 48 kHz mono WAV',
                        style: const TextStyle(color: Colors.grey)),
                    if (_recording || _approxSpl > 0) ...[
                      const SizedBox(height: 8),
                      Text(
                        'Ambient SPL ≈ ${_approxSpl.toStringAsFixed(0)} dB',
                        style: TextStyle(
                          color: _noiseWarning ? Colors.orange.shade800 : Colors.grey.shade700,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      if (_noiseWarning)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            'High background noise — traffic, wind, or machinery may reduce accuracy.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Colors.orange.shade800, fontSize: 12),
                          ),
                        ),
                    ],
                    const SizedBox(height: 8),
                    const Text(
                      'Record ambient environmental sound (not voice). Hold phone 1–1.5 m above ground, stay still. '
                      'Best at sunrise or sunset. Works offline — syncs when you regain signal.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.grey, fontSize: 13),
                    ),
                    const SizedBox(height: 16),
                    if (!_recording)
                      FilledButton.icon(
                        onPressed: _busy ? null : _start,
                        icon: const Icon(Icons.mic),
                        label: const Text('Start ambient recording'),
                      )
                    else
                      OutlinedButton.icon(
                        onPressed: _elapsed < _minSeconds ? null : _stop,
                        icon: const Icon(Icons.stop),
                        label: Text(_elapsed < _minSeconds
                            ? 'Stop (${_minSeconds - _elapsed}s min)'
                            : 'Stop & save'),
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
            _OfflineQueueSection(
              queue: queue,
              busy: _busy,
              sync: sync,
              onSync: _syncNow,
              onRetry: _retryItem,
              statusLabel: _queueStatusLabel,
              statusIcon: _queueStatusIcon,
            ),
            const SizedBox(height: 16),
            Text('Synced recordings', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            recordings.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Text(apiErrorMessage(e)),
              data: (items) {
                if (items.isEmpty) {
                  return const Text('No synced recordings yet.');
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
                                'Biodiversity ${r['bioacoustic_health_score']}/100 · '
                                'Richness ${r['species_richness'] ?? r['total_species_count']} · '
                                'Shannon ${r['shannon_diversity_index']}',
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

class _OfflineQueueSection extends StatefulWidget {
  const _OfflineQueueSection({
    required this.queue,
    required this.busy,
    required this.sync,
    required this.onSync,
    required this.onRetry,
    required this.statusLabel,
    required this.statusIcon,
  });

  final BioacousticQueue queue;
  final bool busy;
  final BioacousticSyncService sync;
  final Future<void> Function() onSync;
  final Future<void> Function(QueuedBioacousticRecording) onRetry;
  final String Function(BioacousticQueueStatus) statusLabel;
  final IconData Function(BioacousticQueueStatus) statusIcon;

  @override
  State<_OfflineQueueSection> createState() => _OfflineQueueSectionState();
}

class _OfflineQueueSectionState extends State<_OfflineQueueSection> {
  List<QueuedBioacousticRecording> _items = [];

  @override
  void initState() {
    super.initState();
    widget.queue.addListener(_reload);
    _reload();
  }

  @override
  void dispose() {
    widget.queue.removeListener(_reload);
    super.dispose();
  }

  Future<void> _reload() async {
    final items = await widget.queue.listAll();
    if (mounted) setState(() => _items = items);
  }

  @override
  Widget build(BuildContext context) {
    if (_items.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 16),
        Row(
          children: [
            Text('Offline queue', style: Theme.of(context).textTheme.titleMedium),
            const Spacer(),
            TextButton.icon(
              onPressed: widget.busy || widget.sync.syncing ? null : widget.onSync,
              icon: const Icon(Icons.sync, size: 18),
              label: const Text('Sync now'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ..._items.map((item) {
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: Icon(widget.statusIcon(item.status)),
              title: Text(
                '${item.durationSeconds.toStringAsFixed(0)}s · ${widget.statusLabel(item.status)}',
              ),
              subtitle: Text(
                '${item.createdAt.toLocal().toString().substring(0, 16)}\n'
                'Location ${formatCoordinates(item.latitude, item.longitude)}'
                '${item.errorMessage != null ? '\n${item.errorMessage}' : ''}',
              ),
              isThreeLine: item.errorMessage != null,
              trailing: item.status == BioacousticQueueStatus.failed
                  ? IconButton(
                      tooltip: 'Retry',
                      onPressed: widget.busy ? null : () => widget.onRetry(item),
                      icon: const Icon(Icons.refresh),
                    )
                  : null,
            ),
          );
        }),
      ],
    );
  }
}
