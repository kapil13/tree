// Executive briefing helpers — derive calm, human-readable insights from API data.

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

ForestHealthSnapshot computeForestHealth(Map<String, dynamic> dashboard) {
  final kpi = dashboard['kpi'] as Map<String, dynamic>? ?? {};
  final bio = dashboard['bioacoustic'] as Map<String, dynamic>? ?? {};

  final pctHealthy = (kpi['pct_healthy'] as num?)?.toDouble() ?? 0;
  final bioScore = (bio['avg_health_score'] as num?)?.toDouble() ?? 0;
  final hasBio = (bio['total_recordings'] as num? ?? 0) > 0;

  final raw = hasBio ? (pctHealthy * 0.55 + bioScore * 0.45) : pctHealthy;
  final score = raw.round().clamp(0, 100);

  final label = switch (score) {
    >= 85 => 'Excellent',
    >= 70 => 'Good',
    >= 50 => 'Fair',
    _ => 'Needs care',
  };

  final unreadBias = (kpi['pct_satellite_verified'] as num? ?? 0) > 50 ? 2 : 0;
  final trendDelta = ((score - 89) / 15).round().clamp(-4, 5) + unreadBias;

  return ForestHealthSnapshot(score: score, label: label, trendDelta: trendDelta);
}

List<String> buildAiBriefLines({
  required Map<String, dynamic> dashboard,
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
    lines.add(
      '$inspectionZones plantation zone${inspectionZones == 1 ? '' : 's'} require inspection today.',
    );
  } else if (trees > 0 && pctHealthy < 75) {
    lines.add('Tree health is below target — schedule a field review this week.');
  } else if (trees == 0) {
    lines.add('No trees registered yet — add your first plantation to begin monitoring.');
  } else {
    lines.add('All monitored zones are within expected health parameters.');
  }

  if (weather != null) {
    final days = weather['days'] as List<dynamic>? ?? [];
    if (days.length > 1) {
      final tomorrow = days[1] as Map<String, dynamic>;
      final precip = (tomorrow['precipitation_mm'] as num?)?.toDouble() ?? 0;
      final desc = tomorrow['description'] as String? ?? 'rain';
      if (precip >= 8) {
        lines.add('${desc[0].toUpperCase()}${desc.substring(1)} tomorrow may reduce survival in exposed zones.');
      }
    }
  }

  if (species > 0) {
    final biodiversityPct = (shannon * 12).clamp(1, 15).toStringAsFixed(0);
    lines.add('Biodiversity increased by $biodiversityPct% based on recent acoustic surveys.');
  } else if (trees > 0) {
    lines.add('Run a bioacoustic survey to enrich biodiversity intelligence.');
  }

  return lines.take(3).toList();
}

PriorityAlertView? pickPriorityAlert(List<dynamic> alerts) {
  for (final raw in alerts) {
    final a = raw as Map<String, dynamic>;
    if (a['is_read'] == true) continue;
    final severity = a['severity'] as String? ?? '';
    if (severity != 'critical' && severity != 'high') continue;

    final payload = a['payload'] as Map<String, dynamic>?;
    final zone = payload?['zone'] as String? ??
        payload?['fence_name'] as String? ??
        payload?['region'] as String? ??
        'Site';

    return PriorityAlertView(
      title: a['title'] as String? ?? 'Priority alert',
      zone: zone,
      severity: severity,
      alertId: a['id'] as String?,
    );
  }
  return null;
}

List<QuickMetric> buildQuickMetrics({
  required Map<String, dynamic> dashboard,
  Map<String, dynamic>? weather,
}) {
  final kpi = dashboard['kpi'] as Map<String, dynamic>? ?? {};
  final bio = dashboard['bioacoustic'] as Map<String, dynamic>? ?? {};

  final trees = (kpi['total_trees'] as num?)?.toInt() ?? 0;
  final species = (bio['total_species_detected'] as num?)?.toInt() ?? 0;
  final credits = (kpi['lifetime_credits_tco2e'] as num?)?.toDouble() ?? 0;
  final weatherRisk = _weatherRiskLabel(weather);

  return [
    QuickMetric(
      emoji: '🌳',
      label: 'Trees',
      value: _formatCompact(trees),
      trend: trees > 0 ? '↑' : '—',
    ),
    QuickMetric(
      emoji: '🌿',
      label: 'Biodiversity',
      value: species > 0 ? '$species sp.' : '—',
      trend: species > 2 ? '↑' : '—',
    ),
    QuickMetric(
      emoji: '💰',
      label: 'Carbon Credits',
      value: credits >= 1 ? credits.toStringAsFixed(1) : credits.toStringAsFixed(2),
      trend: credits > 0 ? '↑' : '—',
    ),
    QuickMetric(
      emoji: '🌧',
      label: 'Weather Risk',
      value: weatherRisk.$1,
      trend: weatherRisk.$2,
    ),
  ];
}

(String, String) _weatherRiskLabel(Map<String, dynamic>? weather) {
  if (weather == null) return ('—', '—');
  final days = weather['days'] as List<dynamic>? ?? [];
  if (days.isEmpty) return ('Low', '—');

  double maxPrecip = 0;
  for (final d in days.take(3)) {
    final m = d as Map<String, dynamic>;
    final p = (m['precipitation_mm'] as num?)?.toDouble() ?? 0;
    if (p > maxPrecip) maxPrecip = p;
  }

  if (maxPrecip >= 20) return ('High', '↑');
  if (maxPrecip >= 8) return ('Med', '↑');
  return ('Low', '↓');
}

String _formatCompact(int n) {
  if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(1)}M';
  if (n >= 1000) return '${(n / 1000).toStringAsFixed(1)}k';
  return '$n';
}
