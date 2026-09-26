// Alert inbox filter helpers (mirrors web /alerts hazard chips).

bool matchesAlertFilter(Map<String, dynamic> alert, String filter) {
  if (filter == 'all') return true;
  final kind = alert['kind'] as String? ?? '';
  final severity = alert['severity'] as String? ?? '';
  switch (filter) {
    case 'critical':
      return severity == 'critical';
    case 'ndvi':
      return kind.contains('ndvi') || kind.contains('canopy');
    case 'fire':
      return kind.contains('fire');
    case 'flood':
      return kind.contains('flood');
    case 'locust':
      return kind.contains('locust');
    case 'weather':
      return kind.startsWith('weather_');
    case 'survey':
      return kind.contains('survey');
    default:
      return kind.contains(filter);
  }
}

const alertFilterChipOrder = [
  'all',
  'critical',
  'fire',
  'flood',
  'locust',
  'weather',
  'ndvi',
  'survey',
];

String alertFilterLabel(String filter, {String languageCode = 'en'}) {
  final labels = languageCode == 'hi' ? _filterHi : _filterEn;
  return labels[filter] ?? filter;
}

const _filterEn = {
  'all': 'All',
  'critical': 'Critical',
  'fire': 'Fire',
  'flood': 'Flood',
  'locust': 'Locust',
  'weather': 'Weather',
  'ndvi': 'NDVI',
  'survey': 'Survey',
};

const _filterHi = {
  'all': 'सभी',
  'critical': 'गंभीर',
  'fire': 'आग',
  'flood': 'बाढ़',
  'locust': 'टिड्डी',
  'weather': 'मौसम',
  'ndvi': 'NDVI',
  'survey': 'सर्वे',
};

bool isHazardAlertKind(String? kind) {
  if (kind == null) return false;
  return kind == 'fire_alert' ||
      kind == 'flood_extent_alert' ||
      kind == 'locust_watch' ||
      kind.startsWith('weather_');
}

bool isMapHazardAlert(Map<String, dynamic> alert) {
  final kind = alert['kind'] as String? ?? '';
  if (!isHazardAlertKind(kind)) return false;
  final severity = alert['severity'] as String? ?? '';
  return severity == 'critical' || severity == 'high' || severity == 'warning';
}
