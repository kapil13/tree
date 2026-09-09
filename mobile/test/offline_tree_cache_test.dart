import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:byot_mobile/src/offline/offline_tree_cache.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('saveList and loadList round-trip', () async {
    await OfflineTreeCache.saveList(
      items: [
        {'id': 't1', 'public_code': 'BYOT-TEST'},
      ],
      total: 1,
      projectId: 'proj-1',
    );
    final cached = await OfflineTreeCache.loadList(projectId: 'proj-1');
    expect(cached, isNotNull);
    expect(cached!.total, 1);
    expect(cached.items.first['public_code'], 'BYOT-TEST');
  });

  test('saveDetail and loadDetail round-trip', () async {
    await OfflineTreeCache.saveDetail('tree-1', {
      'id': 'tree-1',
      'species_text': 'Neem',
    });
    final cached = await OfflineTreeCache.loadDetail('tree-1');
    expect(cached, isNotNull);
    expect(cached!.tree['species_text'], 'Neem');
  });
}
