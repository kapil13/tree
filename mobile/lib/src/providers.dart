import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'api/api_client.dart';

final apiClientProvider = FutureProvider<ApiClient>((ref) async {
  return ApiClient.create();
});

final dashboardProvider = FutureProvider.autoDispose((ref) async {
  final api = await ref.watch(apiClientProvider.future);
  return api.dashboard();
});

final treesProvider = FutureProvider.autoDispose((ref) async {
  final api = await ref.watch(apiClientProvider.future);
  return api.listTrees();
});

void invalidateSessionData(WidgetRef ref) {
  ref.invalidate(apiClientProvider);
  ref.invalidate(dashboardProvider);
  ref.invalidate(treesProvider);
}
