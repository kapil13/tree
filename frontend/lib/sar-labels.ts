/** Shared SAR / Forest Integrity labels — mirrors backend sar_ops_dashboard logic. */

export const SAR_MODE_LABEL: Record<string, string> = {
  aligned: "Aligned",
  optical_sar_divergent: "Optical mismatch",
  sar_gap_fill: "Monsoon gap-fill",
  sar_stress: "Ground stress",
  sar_only: "SAR only",
};

export const SAR_GRADE_LABEL: Record<string, string> = {
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
  at_risk: "At risk",
  critical: "Critical",
};

export const SAR_GROUND_STATUS_LABEL: Record<string, string> = {
  stable: "Stable",
  moist: "Moist ground",
  hidden_moisture: "Hidden moisture",
  wetland_risk: "Wetland risk",
};

export function sarIntegrityColor(score: number | null | undefined): string {
  if (score == null) return "#94a3b8";
  if (score >= 75) return "#16a34a";
  if (score >= 55) return "#84cc16";
  if (score >= 40) return "#f59e0b";
  return "#dc2626";
}

export function sarRecommendedAction(input: {
  sar_stale?: boolean;
  sar_monitoring_mode?: string | null;
  sar_ground_status?: string | null;
  sar_at_risk?: boolean;
  sar_forest_integrity?: number | null;
}): string {
  const mode = input.sar_monitoring_mode ?? "";
  const status = input.sar_ground_status ?? "";
  const integrity = input.sar_forest_integrity;

  if (input.sar_stale) {
    return "Run a SAR scan — last capture is older than 35 days.";
  }
  if (mode === "optical_sar_divergent") {
    return "Verify drainage on site; canopy looks green but SAR shows ground moisture risk.";
  }
  if (status === "wetland_risk" || status === "hidden_moisture") {
    return "Schedule field check for waterlogging or hidden moisture under canopy.";
  }
  if (mode === "sar_gap_fill") {
    return "Optical NDVI is stale; rely on SAR and schedule field verification after monsoon.";
  }
  if (input.sar_at_risk) {
    const score = integrity != null ? `${Math.round(integrity)}` : "low";
    return `Forest Integrity at risk (${score}/100) — re-scan after field intervention.`;
  }
  if (integrity != null && integrity >= 65) {
    return "Continue routine SAR monitoring.";
  }
  return "Run SAR scan to establish Forest Integrity baseline.";
}

export function isSarAtRisk(
  integrity: number | null | undefined,
  grade: string | null | undefined,
): boolean {
  if (integrity != null && integrity < 50) return true;
  return grade === "at_risk" || grade === "critical";
}
