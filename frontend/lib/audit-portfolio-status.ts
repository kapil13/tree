/** Human labels and tones for Estate Watch engagement statuses. */

export const AUDIT_ENGAGEMENT_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  intake_complete: "Intake complete",
  analysis_ready: "Analysis ready",
  confidence_mapped: "Confidence mapped",
  risk_assessed: "Risk assessed",
  sampling_planned: "Sampling planned",
  field_verified: "Field verified",
  export_ready: "Export ready",
  under_review: "Under review",
  attested: "Attested",
  no_engagement: "No engagement",
};

export function auditEngagementStatusLabel(status: string): string {
  return AUDIT_ENGAGEMENT_STATUS_LABEL[status] ?? status.replaceAll("_", " ");
}

export function auditEngagementStatusTone(status: string): string {
  if (status === "attested") {
    return "text-emerald-800 bg-emerald-50 ring-emerald-200 dark:text-emerald-200 dark:bg-emerald-950/50 dark:ring-emerald-800";
  }
  if (status === "export_ready" || status === "under_review") {
    return "text-sky-800 bg-sky-50 ring-sky-200 dark:text-sky-200 dark:bg-sky-950/50 dark:ring-sky-800";
  }
  if (status === "sampling_planned" || status === "field_verified") {
    return "text-amber-800 bg-amber-50 ring-amber-200 dark:text-amber-200 dark:bg-amber-950/50 dark:ring-amber-800";
  }
  if (status === "no_engagement") {
    return "text-stone-600 bg-stone-100 ring-stone-200 dark:text-stone-300 dark:bg-stone-900 dark:ring-stone-700";
  }
  return "text-stone-700 bg-stone-50 ring-stone-200 dark:text-stone-300 dark:bg-stone-900 dark:ring-stone-700";
}

export function auditAttestationEnabled(status: string): boolean {
  return status === "export_ready" || status === "under_review" || status === "attested";
}
