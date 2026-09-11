/** Estate Watch audit workspace — phase navigation and status helpers. */

export const AUDIT_PHASES = [
  "intake",
  "satellite",
  "confidence",
  "risk",
  "sampling",
  "reconciliation",
  "export",
  "attestation",
] as const;

export type AuditPhase = (typeof AUDIT_PHASES)[number];

const UNLOCK_STATUS: Record<AuditPhase, string> = {
  intake: "draft",
  satellite: "intake_complete",
  confidence: "analysis_ready",
  risk: "confidence_mapped",
  sampling: "risk_assessed",
  reconciliation: "sampling_planned",
  export: "field_verified",
  attestation: "export_ready",
};

const STATUS_ORDER = [
  "draft",
  "intake_complete",
  "analysis_ready",
  "confidence_mapped",
  "risk_assessed",
  "sampling_planned",
  "field_verified",
  "export_ready",
  "under_review",
  "attested",
] as const;

function statusIndex(status: string): number {
  const idx = STATUS_ORDER.indexOf(status as (typeof STATUS_ORDER)[number]);
  return idx >= 0 ? idx : 0;
}

export function isAuditPhaseUnlocked(phase: AuditPhase, engagementStatus: string): boolean {
  if (phase === "reconciliation") {
    return statusIndex(engagementStatus) >= statusIndex("sampling_planned");
  }
  return statusIndex(engagementStatus) >= statusIndex(UNLOCK_STATUS[phase]);
}

export function defaultAuditPhase(engagementStatus: string): AuditPhase {
  if (engagementStatus === "draft") return "intake";
  if (engagementStatus === "intake_complete") return "satellite";
  if (engagementStatus === "analysis_ready") return "confidence";
  if (engagementStatus === "confidence_mapped") return "risk";
  if (engagementStatus === "risk_assessed") return "sampling";
  if (engagementStatus === "sampling_planned") return "sampling";
  if (engagementStatus === "field_verified") return "export";
  if (engagementStatus === "export_ready" || engagementStatus === "under_review") return "attestation";
  if (engagementStatus === "attested") return "attestation";
  return "intake";
}

export function formatAuditStatus(status: string): string {
  return status.replaceAll("_", " ");
}
