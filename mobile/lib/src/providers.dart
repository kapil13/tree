import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'api/api_client.dart';
import 'offline/bioacoustic_queue.dart';
import 'offline/bioacoustic_sync.dart';
import 'offline/tree_registration_queue.dart';
import 'offline/tree_registration_sync.dart';

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

final treeRegistrationQueueProvider = ChangeNotifierProvider<TreeRegistrationQueue>((ref) {
  final queue = TreeRegistrationQueue();
  return queue;
});

final treeRegistrationSyncProvider = ChangeNotifierProvider<TreeRegistrationSyncService>((ref) {
  final queue = ref.watch(treeRegistrationQueueProvider);
  final sync = TreeRegistrationSyncService(queue);
  return sync;
});

final plantingProjectsProvider = FutureProvider.autoDispose((ref) async {
  final api = await ref.watch(apiClientProvider.future);
  return api.listPlantingProjects();
});

final plantingProjectProvider = FutureProvider.autoDispose.family<Map<String, dynamic>, String>((ref, id) async {
  final api = await ref.watch(apiClientProvider.future);
  return api.getPlantingProject(id);
});

final workAreasProvider = FutureProvider.autoDispose.family<List<dynamic>, String>((ref, projectId) async {
  final api = await ref.watch(apiClientProvider.future);
  return api.listWorkAreas(projectId);
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
