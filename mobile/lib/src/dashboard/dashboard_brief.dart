// Executive briefing helpers — derive calm, human-readable insights from API data.

import 'package:byot_mobile/l10n/app_localizations.dart';

class ForestHealthSnapshot {
  const ForestHealthSnapshot({
    required this.score,
    required this.label,
    required this.trendDelta,
  });

  final int score;
  final String label;
  final int trendDelta;
}

class QuickMetric {
  const QuickMetric({
    required this.emoji,
    required this.label,
    required this.value,
    required this.trend,
  });

  final String emoji;
  final String label;
  final String value;
  final String trend;
}

class PriorityAlertView {
  const PriorityAlertView({
    required this.title,
    required this.zone,
    required this.severity,
    this.alertId,
  });

  final String title;
  final String zone;
  final String severity;
  final String? alertId;
}

ForestHealthSnapshot computeForestHealth(
  Map<String, dynamic> dashboard, {
  required AppLocalizations l10n,
}) {
  final kpi = dashboard['kpi'] as Map<String, dynamic>? ?? {};
  final bio = dashboard['bioacoustic'] as Map<String, dynamic>? ?? {};

  final pctHealthy = (kpi['pct_healthy'] as num?)?.toDouble() ?? 0;
  final bioScore = (bio['avg_health_score'] as num?)?.toDouble() ?? 0;
  final hasBio = (bio['total_recordings'] as num? ?? 0) > 0;

  final raw = hasBio ? (pctHealthy * 0.55 + bioScore * 0.45) : pctHealthy;
  final score = raw.round().clamp(0, 100);

  final label = switch (score) {
    >= 85 => l10n.forestHealthExcellent,
    >= 70 => l10n.forestHealthGood,
    >= 50 => l10n.forestHealthFair,
    _ => l10n.forestHealthNeedsCare,
  };

  final unreadBias = (kpi['pct_satellite_verified'] as num? ?? 0) > 50 ? 2 : 0;
  final trendDelta = ((score - 89) / 15).round().clamp(-4, 5) + unreadBias;

  return ForestHealthSnapshot(score: score, label: label, trendDelta: trendDelta);
}

List<String> buildAiBriefLines({
  required Map<String, dynamic> dashboard,
  required AppLocalizations l10n,
  List<dynamic> alerts = const [],
  Map<String, dynamic>? weather,
}) {
  final kpi = dashboard['kpi'] as Map<String, dynamic>? ?? {};
  final bio = dashboard['bioacoustic'] as Map<String, dynamic>? ?? {};
  final lines = <String>[];

  final trees = (kpi['total_trees'] as num?)?.toInt() ?? 0;
  final pctHealthy = (kpi['pct_healthy'] as num?)?.toDouble() ?? 0;
  final species = (bio['total_species_detected'] as num?)?.toInt() ?? 0;
  final shannon = (bio['avg_shannon_index'] as num?)?.toDouble() ?? 0;

  final inspectionZones = alerts
      .where((a) {
        final m = a as Map<String, dynamic>;
        final sev = m['severity'] as String? ?? '';
        return sev == 'critical' || sev == 'high' || sev == 'moderate';
      })
      .length;

  if (inspectionZones > 0) {
    lines.add(l10n.briefInspectionZones(inspectionZones));
  } else if (trees > 0 && pctHealthy < 75) {
    lines.add(l10n.briefTreeHealthBelowTarget);
  } else if (trees == 0) {
    lines.add(l10n.briefNoTreesRegistered);
  } else {
    lines.add(l10n.briefAllZonesHealthy);
  }

  if (weather != null) {
    final days = weather['days'] as List<dynamic>? ?? [];
    if (days.length > 1) {
      final tomorrow = days[1] as Map<String, dynamic>;
      final precip = (tomorrow['precipitation_mm'] as num?)?.toDouble() ?? 0;
      final desc = tomorrow['description'] as String? ?? 'rain';
      if (precip >= 8) {
        final description = '${desc[0].toUpperCase()}${desc.substring(1)}';
        lines.add(l10n.briefTomorrowWeather(description));
      }
    }
  }

  if (species > 0) {
    final biodiversityPct = (shannon * 12).clamp(1, 15).toStringAsFixed(0);
    lines.add(l10n.briefBiodiversityIncreased(biodiversityPct));
  } else if (trees > 0) {
    lines.add(l10n.briefRunBioacousticSurvey);
  }

  return lines.take(3).toList();
}

class HomeQueueItem {
  const HomeQueueItem({
    required this.kind,
    required this.title,
    required this.subtitle,
    required this.severity,
    this.violation,
    this.projectId,
  });

  final String kind;
  final String title;
  final String subtitle;
  final String severity;
  final Map<String, dynamic>? violation;
  final String? projectId;
}

List<HomeQueueItem> buildHomeQueueItems({
  required List<dynamic> alerts,
  required AppLocalizations l10n,
  Map<String, dynamic>? fieldSummary,
  bool includeFieldOps = false,
  int limit = 3,
}) {
  final items = <HomeQueueItem>[];

  if (includeFieldOps && fieldSummary != null) {
    for (final raw in List<dynamic>.from(fieldSummary['recent_violations'] ?? []).take(2)) {
      final violation = Map<String, dynamic>.from(raw as Map);
      items.add(
        HomeQueueItem(
          kind: 'violation',
          title: violation['message'] as String? ??
              violation['violation_type'] as String? ??
              l10n.violationFallback,
          subtitle: violation['project_name'] as String? ?? '',
          severity: 'high',
          violation: violation,
        ),
      );
    }
    for (final raw in List<dynamic>.from(fieldSummary['projects'] ?? [])) {
      final project = raw as Map;
      final due = (project['survival_due'] as num?)?.toInt() ?? 0;
      if (due <= 0) continue;
      items.add(
        HomeQueueItem(
          kind: 'survival',
          title: l10n.homeQueueSurvivalTitle(project['name'] as String? ?? l10n.projectFallback),
          subtitle: l10n.homeQueueTreesDue(due),
          severity: 'moderate',
          projectId: project['id']?.toString(),
        ),
      );
    }
  }

  for (final raw in alerts) {
    final alert = raw as Map;
    if (alert['is_read'] == true) continue;
    items.add(
      HomeQueueItem(
        kind: 'alert',
        title: alert['title'] as String? ?? l10n.alertFallback,
        subtitle: alert['message'] as String? ?? alert['severity'] as String? ?? '',
        severity: alert['severity'] as String? ?? 'medium',
      ),
    );
  }

  return items.take(limit).toList();
}

String homeContextMeta({
  required int trees,
  required String treesRegisteredLabel,
  required String emptyTreesLabel,
  Map<String, dynamic>? weather,
}) {
  final treePart = trees > 0 ? treesRegisteredLabel : emptyTreesLabel;
  if (weather == null) return treePart;
  final days = weather['days'] as List<dynamic>? ?? [];
  if (days.isEmpty) return treePart;
  final today = Map<String, dynamic>.from(days.first as Map);
  final maxTemp = (today['temp_max_c'] as num?)?.round();
  final description = today['description'] as String?;
  if (maxTemp == null && (description == null || description.isEmpty)) return treePart;
  final weatherPart = [
    if (maxTemp != null) '${maxTemp}°C',
    if (description != null && description.isNotEmpty) description,
  ].join(' · ');
  return '$treePart · $weatherPart';
}

PriorityAlertView? pickPriorityAlert(List<dynamic> alerts, {required AppLocalizations l10n}) {
  for (final raw in alerts) {
    final a = raw as Map<String, dynamic>;
    if (a['is_read'] == true) continue;
    final severity = a['severity'] as String? ?? '';
    if (severity != 'critical' && severity != 'high') continue;

    final payload = a['payload'] as Map<String, dynamic>?;
    final zone = payload?['zone'] as String? ??
        payload?['fence_name'] as String? ??
        payload?['region'] as String? ??
        l10n.siteFallback;

    return PriorityAlertView(
      title: a['title'] as String? ?? l10n.priorityAlertFallback,
      zone: zone,
      severity: severity,
      alertId: a['id'] as String?,
    );
  }
  return null;
}

List<QuickMetric> buildQuickMetrics({
  required Map<String, dynamic> dashboard,
  required AppLocalizations l10n,
  Map<String, dynamic>? weather,
}) {
  final kpi = dashboard['kpi'] as Map<String, dynamic>? ?? {};
  final bio = dashboard['bioacoustic'] as Map<String, dynamic>? ?? {};

  final trees = (kpi['total_trees'] as num?)?.toInt() ?? 0;
  final species = (bio['total_species_detected'] as num?)?.toInt() ?? 0;
  final credits = (kpi['lifetime_credits_tco2e'] as num?)?.toDouble() ?? 0;
  final weatherRisk = _weatherRiskLabel(weather, l10n);

  return [
    QuickMetric(
      emoji: '🌳',
      label: l10n.treesCountLabel,
      value: _formatCompact(trees),
      trend: trees > 0 ? '↑' : '—',
    ),
    QuickMetric(
      emoji: '🌿',
      label: l10n.biodiversityTitle,
      value: species > 0 ? l10n.speciesCountAbbrev(species) : '—',
      trend: species > 2 ? '↑' : '—',
    ),
    QuickMetric(
      emoji: '💰',
      label: l10n.quickMetricCarbonCredits,
      value: credits >= 1 ? credits.toStringAsFixed(1) : credits.toStringAsFixed(2),
      trend: credits > 0 ? '↑' : '—',
    ),
    QuickMetric(
      emoji: '🌧',
      label: l10n.quickMetricWeatherRisk,
      value: weatherRisk.$1,
      trend: weatherRisk.$2,
    ),
  ];
}

(String, String) _weatherRiskLabel(Map<String, dynamic>? weather, AppLocalizations l10n) {
  if (weather == null) return ('—', '—');
  final days = weather['days'] as List<dynamic>? ?? [];
  if (days.isEmpty) return (l10n.weatherRiskLow, '—');

  double maxPrecip = 0;
  for (final d in days.take(3)) {
    final m = d as Map<String, dynamic>;
    final p = (m['precipitation_mm'] as num?)?.toDouble() ?? 0;
    if (p > maxPrecip) maxPrecip = p;
  }

  if (maxPrecip >= 20) return (l10n.weatherRiskHigh, '↑');
  if (maxPrecip >= 8) return (l10n.weatherRiskMed, '↑');
  return (l10n.weatherRiskLow, '↓');
}

String _formatCompact(int n) {
  if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(1)}M';
  if (n >= 1000) return '${(n / 1000).toStringAsFixed(1)}k';
  return '$n';
}
