import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';

import '../api/api_client.dart';
import '../api/api_errors.dart';
import 'tree_registration_queue.dart';
import 'tree_registration_sync.dart';

class TreeRegistrationSyncService extends ChangeNotifier {
  TreeRegistrationSyncService(this._queue);

  final TreeRegistrationQueue _queue;
  bool _syncing = false;

  bool get syncing => _syncing;

  void startListening() {
    Connectivity().onConnectivityChanged.listen((_) => syncAll());
  }

  Future<void> syncAll() async {
    if (_syncing) return;
    final connectivity = await Connectivity().checkConnectivity();
    if (connectivity.contains(ConnectivityResult.none)) return;

    _syncing = true;
    notifyListeners();
    try {
      final api = await ApiClient.create();
      final pending = await _queue.listPending();
      for (final item in pending) {
        await _queue.updateStatus(item.id, status: TreeQueueStatus.syncing);
        try {
          final payload = Map<String, dynamic>.from(item.payload);
          final localPaths = item.photoPaths;
          final uploadedKeys = <String>[];
          for (final path in localPaths) {
            uploadedKeys.add(await api.uploadImageFile(path));
          }
          final existingKeys = List<String>.from(payload['photo_keys'] ?? []);
          payload['photo_keys'] = [...existingKeys, ...uploadedKeys];
          await api.createTree(
            programCode: payload['program_code'] as String,
            speciesText: payload['species_text'] as String,
            lat: (payload['latitude'] as num).toDouble(),
            lon: (payload['longitude'] as num).toDouble(),
            accuracy: (payload['accuracy_m'] as num?)?.toDouble(),
            photoKeys: List<String>.from(payload['photo_keys'] ?? []),
            metadata: Map<String, dynamic>.from(payload['metadata'] ?? {}),
            workAreaId: payload['work_area_id'] as String?,
          );
          await _queue.remove(item.id);
        } catch (e) {
          await _queue.updateStatus(
            item.id,
            status: TreeQueueStatus.failed,
            errorMessage: apiErrorMessage(e),
            retryCount: item.retryCount + 1,
          );
        }
      }
    } finally {
      _syncing = false;
      notifyListeners();
    }
  }
}
