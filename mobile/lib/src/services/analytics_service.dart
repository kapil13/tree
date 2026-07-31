import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:shared_preferences/shared_preferences.dart';

import '../api/api_client.dart';
import 'app_settings.dart';

/// Lightweight product analytics — batches events to the backend when online.
class AnalyticsService {
  AnalyticsService._();

  static final AnalyticsService instance = AnalyticsService._();
  static const _queueKey = 'byot_analytics_queue';
  static final _random = Random();

  final List<Map<String, dynamic>> _pending = [];

  Future<void> track(String name, {Map<String, dynamic>? properties}) async {
    if (!AppSettings.instance.analyticsEnabled) return;
    _pending.add({
      'name': name,
      'properties': properties ?? {},
      'ts': DateTime.now().toUtc().toIso8601String(),
      'id': '${DateTime.now().microsecondsSinceEpoch}_${_random.nextInt(1 << 32)}',
    });
    await _persistQueue();
    unawaited(flush(ApiClient.create));
  }

  Future<void> flush(Future<ApiClient> Function() apiFactory) async {
    if (!AppSettings.instance.analyticsEnabled) return;
    await _loadQueue();
    if (_pending.isEmpty) return;

    try {
      final api = await apiFactory();
      final batch = _pending.take(50).toList();
      await api.postAnalyticsEvents(
        batch.map((e) => {'name': e['name'], 'properties': e['properties']}).toList(),
      );
      _pending.removeRange(0, batch.length);
      await _persistQueue();
    } catch (_) {
      // keep queued for next flush
    }
  }

  Future<void> _loadQueue() async {
    if (_pending.isNotEmpty) return;
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_queueKey);
    if (raw == null || raw.isEmpty) return;
    try {
      final list = jsonDecode(raw) as List<dynamic>;
      _pending.addAll(list.cast<Map<String, dynamic>>());
    } catch (_) {
      await prefs.remove(_queueKey);
    }
  }

  Future<void> _persistQueue() async {
    final prefs = await SharedPreferences.getInstance();
    if (_pending.isEmpty) {
      await prefs.remove(_queueKey);
      return;
    }
    await prefs.setString(_queueKey, jsonEncode(_pending));
  }
}
