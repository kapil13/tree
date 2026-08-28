/// Human-readable alert kind labels (mirrors web portfolio monitoring tab).
String alertKindLabel(String kind, {String languageCode = 'en'}) {
  final labels = languageCode == 'hi' ? _hi : _en;
  return labels[kind] ??
      kind
          .replaceAll('_', ' ')
          .split(' ')
          .map((w) => w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1)}')
          .join(' ');
}

const _en = {
  'ndvi_degradation': 'NDVI degradation',
  'health_roundup': 'Health roundup',
  'compliance_open': 'Open compliance',
  'threat_watch': 'Threat watch',
  'survival_survey': 'Survival survey',
  'satellite_health': 'Satellite health',
  'satellite_health_digest': 'Satellite digest',
  'compliance_deadline_approaching': 'Compliance deadline',
  'compliance_deadline_overdue': 'Compliance overdue',
  'sar_integrity_drop': 'SAR integrity drop',
  'sar_optical_divergent': 'SAR optical mismatch',
  'sar_integrity_at_risk': 'SAR at risk',
  'sar_monsoon_gap_fill': 'SAR monsoon alert',
  'sar_hidden_moisture': 'SAR hidden moisture',
  'sar_wetland_detected': 'SAR wetland',
  'sar_flood_risk': 'SAR waterlogging',
  'sar_ground_moisture': 'SAR ground moisture',
  'sar_ground_instability': 'SAR ground instability',
  'sar_sweep_health': 'SAR sweep health',
  'citizen_stewardship_due': 'Citizen stewardship due',
  'weather_thunderstorm': 'Thunderstorm watch',
  'weather_hail_storm': 'Hail / storm watch',
  'weather_heavy_rain': 'Heavy rain watch',
  'locust_watch': 'Locust watch',
};

const _hi = {
  'ndvi_degradation': 'NDVI गिरावट',
  'health_roundup': 'स्वास्थ्य सारांश',
  'compliance_open': 'खुला अनुपालन',
  'threat_watch': 'खतरा निगरानी',
  'survival_survey': 'अस्तित्व सर्वे',
  'satellite_health': 'उपग्रह स्वास्थ्य',
  'satellite_health_digest': 'उपग्रह सार',
  'compliance_deadline_approaching': 'अनुपालन समय-सीमा निकट',
  'compliance_deadline_overdue': 'अनुपालन समय-सीमा समाप्त',
  'sar_integrity_drop': 'SAR अखंडता गिरावट',
  'sar_optical_divergent': 'SAR ऑप्टिकल असमानता',
  'sar_integrity_at_risk': 'SAR जोखिम पर',
  'sar_monsoon_gap_fill': 'SAR मानसून अलर्ट',
  'sar_hidden_moisture': 'SAR छिपी नमी',
  'sar_wetland_detected': 'SAR wetland',
  'sar_flood_risk': 'SAR जलभराव जोखिम',
  'sar_ground_moisture': 'SAR भूमि नमी',
  'sar_ground_instability': 'SAR भूमि अस्थिरता',
  'sar_sweep_health': 'SAR sweep स्वास्थ्य',
  'citizen_stewardship_due': 'नागरिक देखभाल बकाया',
  'weather_thunderstorm': 'आंधी-तूफान चेतावनी',
  'weather_hail_storm': 'ओलावृष्टि / तूफान चेतावनी',
  'weather_heavy_rain': 'भारी वर्षा चेतावनी',
  'locust_watch': 'टिड्डी निगरानी',
};

String healthDistributionLabel(String key, {String languageCode = 'en'}) {
  if (languageCode == 'hi') {
    return switch (key.toLowerCase()) {
      'healthy' => 'स्वस्थ',
      'moderate' => 'मध्यम',
      'unhealthy' => 'अस्वस्थ',
      'unknown' => 'अज्ञात',
      _ => key,
    };
  }
  return switch (key.toLowerCase()) {
    'healthy' => 'Healthy',
    'moderate' => 'Moderate',
    'unhealthy' => 'Unhealthy',
    'unknown' => 'Unknown',
    _ => key,
  };
}
