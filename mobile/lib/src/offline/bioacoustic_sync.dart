import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';

import '../api/api_client.dart';
import '../api/api_errors.dart';
import 'bioacoustic_queue.dart';

/// Uploads queued bioacoustic recordings when network is available.
class BioacousticSyncService extends ChangeNotifier {
  BioacousticSyncService(this._queue);

  final BioacousticQueue _queue;
  final Connectivity _connectivity = Connectivity();
  StreamSubscription<List<ConnectivityResult>>? _connectivitySub;
  bool _syncing = false;
  int _syncedThisRun = 0;
  String? _lastError;

  bool get syncing => _syncing;
  int get syncedThisRun => _syncedThisRun;
  String? get lastError => _lastError;

  void startListening(Future<ApiClient> Function() getApi) {
    _connectivitySub ??= _connectivity.onConnectivityChanged.listen((results) {
      if (_hasNetwork(results)) {
        unawaited(syncAll(getApi));
      }
    });
  }

  void stopListening() {
    unawaited(_connectivitySub?.cancel());
    _connectivitySub = null;
  }

  Future<bool> isOnline() async {
    final results = await _connectivity.checkConnectivity();
    return _hasNetwork(results);
  }

  bool _hasNetwork(List<ConnectivityResult> results) {
    return results.any((r) =>
        r == ConnectivityResult.mobile ||
        r == ConnectivityResult.wifi ||
        r == ConnectivityResult.ethernet ||
        r == ConnectivityResult.vpn);
  }

  Future<int> syncAll(Future<ApiClient> Function() getApi) async {
    if (_syncing) return 0;
    if (!await isOnline()) return 0;

    _syncing = true;
    _syncedThisRun = 0;
    _lastError = null;
    notifyListeners();

    try {
      final api = await getApi();
      final pending = await _queue.listPending();
      for (final item in pending) {
        if (!await isOnline()) break;
        try {
          await _queue.markSyncing(item.id);
          final rec = await api.uploadBioacousticRecording(
            filePath: item.filePath,
            durationSeconds: item.durationSeconds,
            latitude: item.latitude,
            longitude: item.longitude,
          );
          await api.analyzeBioacousticRecording(rec['id'] as String);
          await _queue.remove(item.id);
          _syncedThisRun++;
        } catch (e) {
          if (isUnauthorizedError(e)) {
            _lastError = apiErrorMessage(e);
            break;
          }
          await _queue.markFailed(item.id, apiErrorMessage(e));
          _lastError = apiErrorMessage(e);
        }
      }
    } finally {
      _syncing = false;
      notifyListeners();
    }
    return _syncedThisRun;
  }

  @override
  void dispose() {
    stopListening();
    super.dispose();
  }
}
