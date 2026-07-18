import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'api/api_client.dart';
import 'offline/bioacoustic_queue.dart';
import 'offline/bioacoustic_sync.dart';

final apiClientProvider = FutureProvider<ApiClient>((ref) async {
  return ApiClient.create();
});

final bioacousticQueueProvider = ChangeNotifierProvider<BioacousticQueue>((ref) {
  final queue = BioacousticQueue();
  ref.onDispose(queue.dispose);
  return queue;
});

final bioacousticSyncProvider = ChangeNotifierProvider<BioacousticSyncService>((ref) {
  final queue = ref.watch(bioacousticQueueProvider);
  final sync = BioacousticSyncService(queue);
  ref.onDispose(sync.dispose);
  return sync;
});

final dashboardProvider = FutureProvider.autoDispose((ref) async {
  final api = await ref.watch(apiClientProvider.future);
  return api.dashboard();
});

final treesProvider = FutureProvider.autoDispose((ref) async {
  final api = await ref.watch(apiClientProvider.future);
  return api.listTrees();
});

final alertsProvider = FutureProvider.autoDispose((ref) async {
  final api = await ref.watch(apiClientProvider.future);
  return api.listAlerts();
});

final userProvider = FutureProvider.autoDispose((ref) async {
  final api = await ref.watch(apiClientProvider.future);
  return api.me();
});

final bioacousticRecordingsProvider = FutureProvider.autoDispose((ref) async {
  final api = await ref.watch(apiClientProvider.future);
  return api.listBioacousticRecordings();
});
