import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';

import '../api/api_client.dart';
import '../api/api_errors.dart';
import 'audit_visit_queue.dart';

class AuditVisitSyncService extends ChangeNotifier {
  AuditVisitSyncService(this._queue);

  final AuditVisitQueue _queue;
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
        await _queue.updateStatus(item.id, status: AuditVisitQueueStatus.syncing);
        try {
          final payload = Map<String, dynamic>.from(item.payload);
          final uploadedKeys = <String>[];
          for (final path in item.photoPaths) {
            uploadedKeys.add(await api.uploadImageFile(path));
          }
          final existingKeys = List<String>.from(payload['photo_keys'] ?? []);
          payload['photo_keys'] = [...existingKeys, ...uploadedKeys];
          await api.recordAuditFieldVisit(
            engagementId: payload['engagement_id'] as String,
            plotId: payload['plot_id'] as String,
            treePresence: payload['tree_presence'] as String,
            photoKeys: List<String>.from(payload['photo_keys'] ?? []),
            visitorLat: (payload['visitor_lat'] as num).toDouble(),
            visitorLon: (payload['visitor_lon'] as num).toDouble(),
            treesObserved: payload['trees_observed'] as int?,
            treesAlive: payload['trees_alive'] as int?,
            canopyCoverPct: (payload['canopy_cover_pct'] as num?)?.toDouble(),
            verificationOutcome:
                payload['verification_outcome'] as String? ?? 'inconclusive',
            notes: payload['notes'] as String?,
          );
          await _queue.remove(item.id);
          _syncedThisRun++;
        } catch (e) {
          if (isUnauthorizedError(e)) {
            _lastError = apiErrorMessage(e);
            await _queue.updateStatus(
              item.id,
              status: AuditVisitQueueStatus.pending,
              errorMessage: _lastError,
            );
            break;
          }
          await _queue.updateStatus(
            item.id,
            status: AuditVisitQueueStatus.failed,
            errorMessage: apiErrorMessage(e),
            retryCount: item.retryCount + 1,
          );
        }
      }
    } finally {
      _syncing = false;
      notifyListeners();
    }
    return _syncedThisRun;
  }
}
