import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'l10n/l10n_ext.dart';
import 'package:flutter/material.dart';

const _selectedProjectKey = 'aranyix_selected_project_id';

/// Persisted planting-project scope applied across home, trees, and map.
class SelectedProjectIdNotifier extends StateNotifier<String?> {
  SelectedProjectIdNotifier() : super(null) {
    _restore();
  }

  Future<void> _restore() async {
    final prefs = await SharedPreferences.getInstance();
    final id = prefs.getString(_selectedProjectKey);
    if (id != null && id.isNotEmpty) {
      state = id;
    }
  }

  Future<void> setProjectId(String? id) async {
    state = id;
    final prefs = await SharedPreferences.getInstance();
    if (id == null || id.isEmpty) {
      await prefs.remove(_selectedProjectKey);
    } else {
      await prefs.setString(_selectedProjectKey, id);
    }
  }
}

final selectedProjectIdProvider =
    StateNotifierProvider<SelectedProjectIdNotifier, String?>((ref) {
  return SelectedProjectIdNotifier();
});

String selectedProjectLabel(
  BuildContext context,
  List<dynamic> projects,
  String? selectedId,
) {
  final l10n = context.l10n;
  if (selectedId != null) {
    for (final raw in projects) {
      final p = raw as Map<String, dynamic>;
      if (p['id'] == selectedId) {
        return p['name'] as String? ?? l10n.projectFallback;
      }
    }
  }
  if (projects.length == 1) {
    return (projects.first as Map)['name'] as String? ?? l10n.homeAllSites;
  }
  return l10n.homeAllSites;
}
