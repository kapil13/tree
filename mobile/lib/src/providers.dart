import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'api/api_client.dart';
import 'project_context.dart';
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
  ref.onDispose(sync.dispose);
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

final integrityFusionProvider =
    FutureProvider.autoDispose.family<Map<String, dynamic>, String>((ref, projectId) async {
  final api = await ref.watch(apiClientProvider.future);
  return api.getIntegrityFusion(projectId);
});

final survivalDueProvider =
    FutureProvider.autoDispose.family<Map<String, dynamic>, String>((ref, projectId) async {
  final api = await ref.watch(apiClientProvider.future);
  return api.survivalDue(projectId);
});

final projectViolationsProvider =
    FutureProvider.autoDispose.family<List<dynamic>, String>((ref, projectId) async {
  final api = await ref.watch(apiClientProvider.future);
  return api.listComplianceViolations(projectId);
});

final projectCreditLedgerProvider =
    FutureProvider.autoDispose.family<Map<String, dynamic>, String>((ref, projectId) async {
  final api = await ref.watch(apiClientProvider.future);
  return api.getProjectCreditLedger(projectId);
});

final projectSchemeProvider =
    FutureProvider.autoDispose.family<Map<String, dynamic>?, String>((ref, projectId) async {
  final project = await ref.watch(plantingProjectProvider(projectId).future);
  final schemeCode = project['scheme_code'] as String?;
  if (schemeCode == null) return null;
  final api = await ref.watch(apiClientProvider.future);
  try {
    return await api.getCentralScheme(schemeCode);
  } catch (_) {
    return null;
  }
});

final dashboardProvider = FutureProvider.autoDispose((ref) async {
  final api = await ref.watch(apiClientProvider.future);
  return api.dashboard();
});

final treesProvider = FutureProvider.autoDispose((ref) async {
  final api = await ref.watch(apiClientProvider.future);
  final projectId = ref.watch(selectedProjectIdProvider);
  return api.listTrees(projectId: projectId);
});

/// Trees in the current map viewport (bbox + capped page size).
final mapTreesProvider = FutureProvider.autoDispose.family<List<dynamic>, String>((ref, bbox) async {
  final api = await ref.watch(apiClientProvider.future);
  final projectId = ref.watch(selectedProjectIdProvider);
  return api.listTrees(bbox: bbox, pageSize: 150, projectId: projectId);
});

final alertsProvider = FutureProvider.autoDispose((ref) async {
  final api = await ref.watch(apiClientProvider.future);
  return api.listAlerts();
});

final alertProvider = FutureProvider.autoDispose.family<Map<String, dynamic>, String>((ref, alertId) async {
  final api = await ref.watch(apiClientProvider.future);
  return api.getAlert(alertId);
});

final fieldOpsSummaryProvider = FutureProvider.autoDispose((ref) async {
  final api = await ref.watch(apiClientProvider.future);
  return api.fieldOpsSummary();
});

final auditFieldPlotQueueProvider = FutureProvider.autoDispose((ref) async {
  final api = await ref.watch(apiClientProvider.future);
  final projectId = ref.watch(selectedProjectIdProvider);
  return api.auditFieldPlotQueue(projectId: projectId);
});

final monitoringSummaryProvider = FutureProvider.autoDispose((ref) async {
  final api = await ref.watch(apiClientProvider.future);
  try {
    return await api.monitoringSummary();
  } catch (_) {
    // Fallback so monitoring screen still renders core KPIs.
    return api.fieldOpsSummary();
  }
});

final userProvider = FutureProvider.autoDispose((ref) async {
  final api = await ref.watch(apiClientProvider.future);
  return api.me();
});

final bioacousticRecordingsProvider = FutureProvider.autoDispose((ref) async {
  final api = await ref.watch(apiClientProvider.future);
  return api.listBioacousticRecordings();
});

final bioacousticSummaryProvider = FutureProvider.autoDispose((ref) async {
  final api = await ref.watch(apiClientProvider.future);
  return api.bioacousticSummary();
});

final plantationFencesProvider = FutureProvider.autoDispose((ref) async {
  final api = await ref.watch(apiClientProvider.future);
  return api.listPlantationFences();
});

final regionalFaunaProvider = FutureProvider.autoDispose.family<Map<String, dynamic>, String>((ref, key) async {
  final parts = key.split(',');
  if (parts.length != 2) {
    throw StateError('regionalFaunaProvider expects "lat,lon" key');
  }
  final lat = double.parse(parts[0]);
  final lon = double.parse(parts[1]);
  final api = await ref.watch(apiClientProvider.future);
  return api.regionalFauna(latitude: lat, longitude: lon);
});

/// Weather at first registered tree, or null when no trees exist.
final weatherProvider = FutureProvider.autoDispose<Map<String, dynamic>?>((ref) async {
  final api = await ref.watch(apiClientProvider.future);
  final trees = await ref.watch(treesProvider.future);
  if (trees.isEmpty) return null;

  final first = trees.first as Map<String, dynamic>;
  final lat = (first['latitude'] as num?)?.toDouble();
  final lon = (first['longitude'] as num?)?.toDouble();
  if (lat == null || lon == null) return null;

  try {
    return await api.weatherForecast(latitude: lat, longitude: lon, days: 3);
  } catch (_) {
    return null;
  }
});
