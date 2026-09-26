import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Lightweight offline cache for tree list and detail screens.
class OfflineTreeCache {
  OfflineTreeCache._();

  static const _listPrefix = 'byot_tree_list_cache_';
  static const _detailPrefix = 'byot_tree_detail_';

  static String _listKey(String? projectId) => '$_listPrefix${projectId ?? 'all'}';

  static Future<void> saveList({
    required List<dynamic> items,
    required int total,
    String? projectId,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _listKey(projectId),
      jsonEncode({
        'saved_at': DateTime.now().toUtc().toIso8601String(),
        'total': total,
        'items': items,
      }),
    );
  }

  static Future<({List<dynamic> items, int total, String savedAt})?> loadList({
    String? projectId,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_listKey(projectId));
    if (raw == null) return null;
    try {
      final map = jsonDecode(raw) as Map<String, dynamic>;
      return (
        items: List<dynamic>.from(map['items'] ?? []),
        total: (map['total'] as num?)?.toInt() ?? 0,
        savedAt: map['saved_at'] as String? ?? '',
      );
    } catch (_) {
      return null;
    }
  }

  static Future<void> saveDetail(String treeId, Map<String, dynamic> tree) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      '$_detailPrefix$treeId',
      jsonEncode({
        'saved_at': DateTime.now().toUtc().toIso8601String(),
        'tree': tree,
      }),
    );
  }

  static Future<({Map<String, dynamic> tree, String savedAt})?> loadDetail(String treeId) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('$_detailPrefix$treeId');
    if (raw == null) return null;
    try {
      final map = jsonDecode(raw) as Map<String, dynamic>;
      final tree = map['tree'];
      if (tree is! Map) return null;
      return (
        tree: Map<String, dynamic>.from(tree),
        savedAt: map['saved_at'] as String? ?? '',
      );
    } catch (_) {
      return null;
    }
  }
}
