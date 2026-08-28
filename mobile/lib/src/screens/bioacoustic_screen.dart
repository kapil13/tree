import 'dart:async';

import 'package:byot_mobile/l10n/app_localizations.dart';
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
import '../theme.dart';
import '../widgets/shell_scaffold.dart';
import '../widgets/stack_route_scaffold.dart';

class BioacousticScreen extends ConsumerStatefulWidget {
  const BioacousticScreen({super.key});
  @override
  ConsumerState<BioacousticScreen> createState() => _BioacousticScreenState();
}

class _BioacousticScreenState extends ConsumerState<BioacousticScreen>
    with SingleTickerProviderStateMixin {
  static const _minSeconds = 60;
  static const _maxSeconds = 180;

  final _recorder = AudioRecorder();
  late final TabController _tabs;
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
    _tabs = TabController(length: 2, vsync: this);
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
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _start() async {
    setState(() {
      _error = null;
      _status = null;
    });
    final mic = await Permission.microphone.request();
    if (!mic.isGranted) {
      setState(() => _error = AppLocalizations.of(context)?.bioMicDenied ?? 'Microphone permission denied');
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
      _status = AppLocalizations.of(context)?.bioRecordingStatus ??
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
      final l10n = AppLocalizations.of(context);
      setState(() => _error = l10n?.bioTooShort(_minSeconds, _elapsed) ??
          'Record at least $_minSeconds seconds (currently $_elapsed s).');
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
      _status = AppLocalizations.of(context)?.bioSaving ?? 'Saving recording…';
      _error = null;
    });
    try {
      final gps = await _captureGps();
      final sync = ref.read(bioacousticSyncProvider);
      final online = await sync.isOnline();
      final gpsNote = gps.note;
      final l10n = AppLocalizations.of(context);

      if (!online) {
        await ref.read(bioacousticQueueProvider).enqueue(
              tempFilePath: path,
              durationSeconds: _elapsed.toDouble(),
              latitude: gps.lat,
              longitude: gps.lon,
            );
        if (mounted) {
          setState(() => _status = gpsNote != null
              ? (l10n?.bioSavedOfflineGps(gpsNote) ?? 'Saved offline. $gpsNote')
              : (l10n?.bioSavedOffline ??
                  'Saved offline. Will upload and analyze automatically when you have signal.'));
          _tabs.animateTo(1);
        }
        return;
      }

      setState(() => _status = gpsNote ?? l10n?.bioUploading ?? 'Uploading and analyzing…');
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
          setState(() => _status = l10n?.bioAnalysisComplete ?? 'Analysis complete. See results below.');
          _tabs.animateTo(1);
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
          setState(() {
            _status = l10n?.bioUploadFailedOffline ??
                'Upload failed — saved offline. Tap “Sync now” when your connection is stable.';
            _error = apiErrorMessage(e);
          });
          _tabs.animateTo(1);
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
      _status = AppLocalizations.of(context)?.bioSyncing ?? 'Syncing offline recordings…';
    });
    try {
      final sync = ref.read(bioacousticSyncProvider);
      final count = await sync.syncAll(() => ref.read(apiClientProvider.future));
      ref.invalidate(bioacousticRecordingsProvider);
      ref.invalidate(dashboardProvider);
      final l10n = AppLocalizations.of(context);
      if (mounted) {
        if (count > 0) {
          setState(() => _status = l10n?.bioSyncedCount(count) ?? 'Synced $count recording${count == 1 ? '' : 's'}.');
        } else if (sync.lastError != null) {
          setState(() => _error = sync.lastError);
        } else {
          setState(() => _status = l10n?.bioNothingToSync ?? 'No pending recordings to sync.');
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

  String _queueStatusLabel(BioacousticQueueStatus status, AppLocalizations l10n) {
    switch (status) {
      case BioacousticQueueStatus.pending:
        return l10n.bioQueuePending;
      case BioacousticQueueStatus.syncing:
        return l10n.bioQueueSyncing;
      case BioacousticQueueStatus.failed:
        return l10n.bioQueueFailed;
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
    final l10n = AppLocalizations.of(context)!;

    return stackRouteScaffold(
      location: '/bioacoustic',
      appBar: ShellTopBar(
        title: l10n.navBioacoustic,
        actions: [
          if (sync.syncing)
            const Padding(
              padding: EdgeInsets.all(16),
              child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
            )
          else
            IconButton(
              tooltip: l10n.bioSyncTooltip,
              onPressed: _busy ? null : _syncNow,
              icon: const Icon(Icons.sync),
            ),
        ],
        subtitle: l10n.bioacousticActionSub,
      ),
      body: Stack(
        children: [
          Column(
            children: [
              TabBar(
                controller: _tabs,
                labelColor: AranyixColors.forest,
                tabs: [
                  Tab(text: l10n.bioTabRecord, icon: const Icon(Icons.mic_rounded)),
                  Tab(text: l10n.bioTabHistory, icon: const Icon(Icons.history_rounded)),
                ],
              ),
              Expanded(
                child: TabBarView(
                  controller: _tabs,
                  children: [
                    _RecordTab(
                      l10n: l10n,
                      fences: _fences,
                      selectedFenceId: _selectedFenceId,
                      busy: _busy,
                      recording: _recording,
                      elapsed: _elapsed,
                      approxSpl: _approxSpl,
                      noiseWarning: _noiseWarning,
                      status: _status,
                      error: _error,
                      onFenceChanged: (v) => setState(() => _selectedFenceId = v),
                      onStart: _start,
                      onStop: _stop,
                      minSeconds: _minSeconds,
                      maxSeconds: _maxSeconds,
                    ),
                    _HistoryTab(
                      l10n: l10n,
                      recordings: recordings,
                      queue: queue,
                      sync: sync,
                      busy: _busy,
                      onSync: _syncNow,
                      onRetry: _retryItem,
                      statusLabel: (s) => _queueStatusLabel(s, l10n),
                      statusIcon: _queueStatusIcon,
                      iucnColor: _iucnColor,
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (_recording) _FullScreenRecordingOverlay(l10n: l10n, elapsed: _elapsed, onStop: _stop, minSeconds: _minSeconds),
        ],
      ),
    );
  }
}

class _FullScreenRecordingOverlay extends StatelessWidget {
  const _FullScreenRecordingOverlay({
    required this.l10n,
    required this.elapsed,
    required this.onStop,
    required this.minSeconds,
  });

  final AppLocalizations l10n;
  final int elapsed;
  final VoidCallback onStop;
  final int minSeconds;

  @override
  Widget build(BuildContext context) {
    final canStop = elapsed >= minSeconds;
    return Material(
      color: AranyixColors.forest.withValues(alpha: 0.96),
      child: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 24),
            Text(l10n.bioRecordingLive, style: const TextStyle(color: Colors.white70, fontSize: 16)),
            const Spacer(),
            const Icon(Icons.graphic_eq, size: 96, color: Colors.white),
            const SizedBox(height: 16),
            Text('$elapsed s', style: Theme.of(context).textTheme.displayMedium?.copyWith(color: Colors.white)),
            Text(
              l10n.bioRecordingTarget(minSeconds, 180),
              style: const TextStyle(color: Colors.white70),
            ),
            const Spacer(),
            Padding(
              padding: const EdgeInsets.all(24),
              child: SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: AranyixColors.forest,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  onPressed: canStop ? onStop : null,
                  icon: const Icon(Icons.stop_rounded),
                  label: Text(canStop ? l10n.bioStopAndSave : l10n.bioStopMin(minSeconds - elapsed)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RecordTab extends StatelessWidget {
  const _RecordTab({
    required this.l10n,
    required this.fences,
    required this.selectedFenceId,
    required this.busy,
    required this.recording,
    required this.elapsed,
    required this.approxSpl,
    required this.noiseWarning,
    required this.status,
    required this.error,
    required this.onFenceChanged,
    required this.onStart,
    required this.onStop,
    required this.minSeconds,
    required this.maxSeconds,
  });

  final AppLocalizations l10n;
  final List<dynamic> fences;
  final String? selectedFenceId;
  final bool busy;
  final bool recording;
  final int elapsed;
  final double approxSpl;
  final bool noiseWarning;
  final String? status;
  final String? error;
  final ValueChanged<String?> onFenceChanged;
  final VoidCallback onStart;
  final VoidCallback onStop;
  final int minSeconds;
  final int maxSeconds;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        DropdownButtonFormField<String?>(
          value: selectedFenceId,
          decoration: InputDecoration(
            labelText: l10n.bioSiteOptional,
            border: const OutlineInputBorder(),
          ),
          items: [
            DropdownMenuItem<String?>(value: null, child: Text(l10n.bioSiteGpsOnly)),
            ...fences.map((f) {
              final m = f as Map<String, dynamic>;
              return DropdownMenuItem<String?>(
                value: m['id'] as String,
                child: Text(m['name'] as String? ?? 'Site'),
              );
            }),
          ],
          onChanged: busy ? null : onFenceChanged,
        ),
        const SizedBox(height: 24),
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: AranyixColors.forest.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AranyixColors.forest.withValues(alpha: 0.2)),
          ),
          child: Column(
            children: [
              Icon(Icons.mic_rounded, size: 72, color: recording ? AranyixColors.forest : Colors.grey.shade600),
              const SizedBox(height: 12),
              Text(
                recording ? '$elapsed s' : l10n.bioTapToRecord,
                style: Theme.of(context).textTheme.headlineSmall,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                l10n.bioRecordingTarget(minSeconds, maxSeconds),
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall,
              ),
              if ((recording || approxSpl > 0) && !recording) ...[
                const SizedBox(height: 8),
                Text(
                  l10n.bioSplLevel(approxSpl.toStringAsFixed(0)),
                  style: TextStyle(color: noiseWarning ? Colors.orange.shade800 : Colors.grey.shade700),
                ),
              ],
              if (noiseWarning && !recording)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(l10n.bioNoiseWarning, textAlign: TextAlign.center, style: TextStyle(color: Colors.orange.shade800, fontSize: 12)),
                ),
              const SizedBox(height: 20),
              if (!recording)
                FilledButton.icon(
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(double.infinity, 52),
                    backgroundColor: AranyixColors.forest,
                  ),
                  onPressed: busy ? null : onStart,
                  icon: const Icon(Icons.fiber_manual_record),
                  label: Text(l10n.bioStartRecording),
                )
              else
                OutlinedButton.icon(
                  onPressed: elapsed < minSeconds ? null : onStop,
                  icon: const Icon(Icons.stop),
                  label: Text(elapsed < minSeconds ? l10n.bioStopMin(minSeconds - elapsed) : l10n.bioStopAndSave),
                ),
              if (status != null) ...[
                const SizedBox(height: 12),
                Text(status!, textAlign: TextAlign.center),
              ],
              if (error != null) ...[
                const SizedBox(height: 12),
                Text(error!, style: const TextStyle(color: Colors.red), textAlign: TextAlign.center),
              ],
            ],
          ),
        ),
        const SizedBox(height: 16),
        Text(l10n.bioFieldTips, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}

class _HistoryTab extends StatelessWidget {
  const _HistoryTab({
    required this.l10n,
    required this.recordings,
    required this.queue,
    required this.sync,
    required this.busy,
    required this.onSync,
    required this.onRetry,
    required this.statusLabel,
    required this.statusIcon,
    required this.iucnColor,
  });

  final AppLocalizations l10n;
  final AsyncValue<List<dynamic>> recordings;
  final BioacousticQueue queue;
  final BioacousticSyncService sync;
  final bool busy;
  final Future<void> Function() onSync;
  final Future<void> Function(QueuedBioacousticRecording) onRetry;
  final String Function(BioacousticQueueStatus) statusLabel;
  final IconData Function(BioacousticQueueStatus) statusIcon;
  final Color Function(String?) iucnColor;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onSync,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _OfflineQueueSection(
            queue: queue,
            busy: busy,
            sync: sync,
            onSync: onSync,
            onRetry: onRetry,
            statusLabel: statusLabel,
            statusIcon: statusIcon,
            emptyLabel: l10n.bioOfflineQueue,
            syncLabel: l10n.bioSyncNow,
          ),
          const SizedBox(height: 16),
          Text(l10n.bioSyncedRecordings, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          recordings.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Text(apiErrorMessage(e)),
            data: (items) {
              if (items.isEmpty) {
                return Text(l10n.bioNoRecordingsYet);
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
                          Text('${r['duration_seconds']}s · ${r['status']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                          if (r['bioacoustic_health_score'] != null)
                            Text(
                              'Biodiversity ${r['bioacoustic_health_score']}/100 · '
                              'Richness ${r['species_richness'] ?? r['total_species_count']} · '
                              'Shannon ${r['shannon_diversity_index']}',
                            ),
                          if (r['analysis_summary'] != null)
                            Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Text(r['analysis_summary'] as String, style: const TextStyle(color: Colors.grey)),
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
                                style: TextStyle(color: iucnColor(s['iucn_status'] as String?), fontSize: 11),
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
    required this.emptyLabel,
    required this.syncLabel,
  });

  final BioacousticQueue queue;
  final bool busy;
  final BioacousticSyncService sync;
  final Future<void> Function() onSync;
  final Future<void> Function(QueuedBioacousticRecording) onRetry;
  final String Function(BioacousticQueueStatus) statusLabel;
  final IconData Function(BioacousticQueueStatus) statusIcon;
  final String emptyLabel;
  final String syncLabel;

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
        Row(
          children: [
            Text(widget.emptyLabel, style: Theme.of(context).textTheme.titleMedium),
            const Spacer(),
            TextButton.icon(
              onPressed: widget.busy || widget.sync.syncing ? null : widget.onSync,
              icon: const Icon(Icons.sync, size: 18),
              label: Text(widget.syncLabel),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ..._items.map((item) {
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: Icon(widget.statusIcon(item.status)),
              title: Text('${item.durationSeconds.toStringAsFixed(0)}s · ${widget.statusLabel(item.status)}'),
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
