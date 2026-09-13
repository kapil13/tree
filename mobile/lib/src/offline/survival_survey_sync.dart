import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';

import '../api/api_client.dart';
import '../api/api_errors.dart';
import 'survival_survey_queue.dart';

class SurvivalSurveySyncService extends ChangeNotifier {
  SurvivalSurveySyncService(this._queue);

  final SurvivalSurveyQueue _queue;
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
        await _queue.updateStatus(item.id, status: SurvivalSurveyQueueStatus.syncing);
        try {
          final payload = Map<String, dynamic>.from(item.payload);
          var photoKey = payload['photo_key'] as String?;
          for (final path in item.photoPaths) {
            photoKey = await api.uploadImageFile(path);
          }
          await api.regeotagTree(
            payload['tree_id'] as String,
            lat: (payload['latitude'] as num).toDouble(),
            lon: (payload['longitude'] as num).toDouble(),
            accuracy: (payload['accuracy_m'] as num?)?.toDouble(),
            remarks: payload['remarks'] as String?,
            survivalStatus: payload['survival_status'] as String?,
            photoKey: photoKey,
            dbhCm: (payload['dbh_cm'] as num?)?.toDouble(),
            heightM: (payload['height_m'] as num?)?.toDouble(),
            method: payload['method'] as String?,
          );
          await _queue.remove(item.id);
          _syncedThisRun++;
        } catch (e) {
          if (isUnauthorizedError(e)) {
            _lastError = apiErrorMessage(e);
            await _queue.updateStatus(
              item.id,
              status: SurvivalSurveyQueueStatus.pending,
              errorMessage: _lastError,
            );
            break;
          }
          await _queue.updateStatus(
            item.id,
            status: SurvivalSurveyQueueStatus.failed,
            errorMessage: apiErrorMessage(e),
            retryCount: item.retryCount + 1,
          );
          _lastError = apiErrorMessage(e);
        }
      }
    } finally {
      _syncing = false;
      notifyListeners();
    }
    return _syncedThisRun;
  }
}
