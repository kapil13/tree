/// Mobile remediation hints for integrity / audit blockers (mirrors web).
library;

class IntegrityRemediationAction {
  const IntegrityRemediationAction({
    required this.label,
    this.description,
    this.route,
  });

  final String label;
  final String? description;
  final String? route;
}

const _blockerLabels = {
  'insufficient_photos': 'Need at least 2 photos',
  'photo_span_too_short': 'Photos must span 30+ days',
  'satellite_scan_stale': 'Satellite scan older than 90 days',
  'fusion_below_audit_minimum': 'Fusion score below 75',
  'missing_exif': 'Missing camera EXIF',
  'missing_photo_gps': 'Photo missing GPS',
  'missing_photo_timestamp': 'Photo missing timestamp',
  'photo_timestamp_stale': 'Photo older than 7 days',
  'regeotag_mismatch': 'Re-geotag mismatch',
  'duplicate_photo': 'Duplicate photo',
  'duplicate_coordinate': 'Duplicate coordinate',
  'ai_confidence_low': 'Low AI confidence',
  'sar_integrity_below_minimum': 'SAR forest integrity below minimum',
  'optical_scan_stale': 'Work area optical scan stale',
  'fusion_below_minimum': 'Fusion score below minimum',
  'not_credit_eligible': 'Not credit eligible',
};

String integrityBlockerLabel(String code) =>
    _blockerLabels[code] ?? code.replaceAll('_', ' ');

IntegrityRemediationAction resolveIntegrityRemediation(
  String code, {
  String? treeId,
  String? projectId,
}) {
  final label = integrityBlockerLabel(code);
  switch (code) {
    case 'insufficient_photos':
    case 'photo_span_too_short':
    case 'missing_exif':
    case 'missing_photo_gps':
    case 'missing_photo_timestamp':
    case 'photo_timestamp_stale':
    case 'duplicate_photo':
      return IntegrityRemediationAction(
        label: label,
        description: 'Add a follow-up field photo from the tree detail page.',
        route: treeId != null ? '/trees/$treeId' : null,
      );
    case 'regeotag_mismatch':
      return IntegrityRemediationAction(
        label: label,
        description: 'Run a survival survey with GPS and an optional survey photo.',
        route: treeId != null ? '/trees/$treeId/survival' : null,
      );
    case 'satellite_scan_stale':
    case 'satellite_not_verified':
    case 'not_satellite_corroborated':
      return IntegrityRemediationAction(
        label: label,
        description: 'Trigger a satellite health scan from tree detail.',
        route: treeId != null ? '/trees/$treeId' : null,
      );
    case 'sar_integrity_below_minimum':
    case 'optical_scan_stale':
      return IntegrityRemediationAction(
        label: label,
        description: 'Review monitoring coverage for this project.',
        route: projectId != null ? '/projects/$projectId' : '/monitoring',
      );
    default:
      return IntegrityRemediationAction(label: label);
  }
}
