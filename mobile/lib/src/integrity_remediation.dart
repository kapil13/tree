/// Mobile remediation hints for integrity / audit blockers (mirrors web).
library;

import 'package:byot_mobile/l10n/app_localizations.dart';

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

String integrityBlockerLabel(AppLocalizations l10n, String code) {
  return switch (code) {
    'insufficient_photos' => l10n.blockerInsufficientPhotos,
    'photo_span_too_short' => l10n.blockerPhotoSpanTooShort,
    'satellite_scan_stale' => l10n.blockerSatelliteScanStale,
    'fusion_below_audit_minimum' => l10n.blockerFusionBelowAudit,
    'missing_exif' => l10n.blockerMissingExif,
    'missing_photo_gps' => l10n.blockerMissingPhotoGps,
    'missing_photo_timestamp' => l10n.blockerMissingPhotoTimestamp,
    'photo_timestamp_stale' => l10n.blockerPhotoTimestampStale,
    'regeotag_mismatch' => l10n.blockerRegeotagMismatch,
    'duplicate_photo' => l10n.blockerDuplicatePhoto,
    'duplicate_coordinate' => l10n.blockerDuplicateCoordinate,
    'ai_confidence_low' => l10n.blockerAiConfidenceLow,
    'sar_integrity_below_minimum' => l10n.blockerSarIntegrityBelow,
    'optical_scan_stale' => l10n.blockerOpticalScanStale,
    'fusion_below_minimum' => l10n.blockerFusionBelowMinimum,
    'not_credit_eligible' => l10n.blockerNotCreditEligible,
    _ => code.replaceAll('_', ' '),
  };
}

IntegrityRemediationAction resolveIntegrityRemediation(
  AppLocalizations l10n,
  String code, {
  String? treeId,
  String? projectId,
}) {
  final label = integrityBlockerLabel(l10n, code);
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
        description: l10n.remediationAddFollowUpPhoto,
        route: treeId != null ? '/trees/$treeId' : null,
      );
    case 'regeotag_mismatch':
      return IntegrityRemediationAction(
        label: label,
        description: l10n.remediationRunSurvivalSurvey,
        route: treeId != null ? '/trees/$treeId/survival' : null,
      );
    case 'satellite_scan_stale':
    case 'satellite_not_verified':
    case 'not_satellite_corroborated':
      return IntegrityRemediationAction(
        label: label,
        description: l10n.remediationTriggerSatellite,
        route: treeId != null ? '/trees/$treeId' : null,
      );
    case 'sar_integrity_below_minimum':
    case 'optical_scan_stale':
      return IntegrityRemediationAction(
        label: label,
        description: l10n.remediationReviewMonitoring,
        route: projectId != null ? '/projects/$projectId' : '/monitoring',
      );
    default:
      return IntegrityRemediationAction(label: label);
  }
}
