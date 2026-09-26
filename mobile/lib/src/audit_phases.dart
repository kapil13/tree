/// Estate Watch 8-phase audit workspace (mirrors web `audit-workspace.ts`).

const auditPhases = [
  'intake',
  'satellite',
  'confidence',
  'risk',
  'sampling',
  'reconciliation',
  'export',
  'attestation',
];

const _unlockStatus = {
  'intake': 'draft',
  'satellite': 'intake_complete',
  'confidence': 'analysis_ready',
  'risk': 'confidence_mapped',
  'sampling': 'risk_assessed',
  'reconciliation': 'sampling_planned',
  'export': 'field_verified',
  'attestation': 'export_ready',
};

const _statusOrder = [
  'draft',
  'intake_complete',
  'analysis_ready',
  'confidence_mapped',
  'risk_assessed',
  'sampling_planned',
  'field_verified',
  'export_ready',
  'under_review',
  'attested',
];

int _statusIndex(String status) {
  final idx = _statusOrder.indexOf(status);
  return idx >= 0 ? idx : 0;
}

bool isAuditPhaseUnlocked(String phase, String engagementStatus) {
  if (phase == 'reconciliation') {
    return _statusIndex(engagementStatus) >= _statusIndex('sampling_planned');
  }
  final required = _unlockStatus[phase];
  if (required == null) return false;
  return _statusIndex(engagementStatus) >= _statusIndex(required);
}

String defaultAuditPhase(String engagementStatus) {
  return switch (engagementStatus) {
    'draft' => 'intake',
    'intake_complete' => 'satellite',
    'analysis_ready' => 'confidence',
    'confidence_mapped' => 'risk',
    'risk_assessed' => 'sampling',
    'sampling_planned' => 'sampling',
    'field_verified' => 'reconciliation',
    'export_ready' || 'under_review' => 'attestation',
    'attested' => 'attestation',
    _ => 'intake',
  };
}

String auditPhaseLabel(String phase) {
  return switch (phase) {
    'intake' => 'Intake',
    'satellite' => 'Satellite',
    'confidence' => 'Confidence',
    'risk' => 'Risk',
    'sampling' => 'Sampling',
    'reconciliation' => 'Reconciliation',
    'export' => 'Export',
    'attestation' => 'Attestation',
    _ => phase,
  };
}
