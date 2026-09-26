// Helpers for Estate Watch mobile audit workspace.

const auditAttestationEnabledStatuses = {
  'export_ready',
  'under_review',
  'attested',
};

bool auditAttestationEnabled(String? engagementStatus) {
  if (engagementStatus == null || engagementStatus.isEmpty) return false;
  return auditAttestationEnabledStatuses.contains(engagementStatus);
}

String auditEngagementStatusLabel(String status) {
  return switch (status) {
    'draft' => 'Draft',
    'intake_complete' => 'Intake complete',
    'analysis_ready' => 'Analysis ready',
    'confidence_mapped' => 'Confidence mapped',
    'risk_assessed' => 'Risk assessed',
    'sampling_planned' => 'Sampling planned',
    'field_verified' => 'Field verified',
    'export_ready' => 'Export ready',
    'under_review' => 'Under review',
    'attested' => 'Attested',
    'no_engagement' => 'No engagement',
    _ => status.replaceAll('_', ' '),
  };
}

bool auditNeedsFieldPlots(String? engagementStatus) {
  return engagementStatus == 'sampling_planned' || engagementStatus == 'field_verified';
}

bool auditNeedsAttestationAction(Map<String, dynamic>? attestationSummary) {
  if (attestationSummary == null) return false;
  if (attestationSummary['can_sign'] == true) return true;
  if (attestationSummary['can_cosign'] == true) return true;
  final pending = (attestationSummary['review_queue'] as Map?)?['pending_review_count'] as num?;
  return (pending ?? 0) > 0;
}
