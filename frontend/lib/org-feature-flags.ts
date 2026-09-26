/** Human-readable labels for org feature flag keys (mirrors backend ORG_FEATURE_FLAGS). */

export const ORG_FEATURE_LABELS: Record<string, string> = {
  ai_scan: "AI tree health scans",
  satellite: "Satellite NDVI monitoring",
  bioacoustic: "Bioacoustic recordings",
  reports: "Compliance report exports",
  payments: "Credit purchases",
};

export function orgFeatureDisabledMessage(featureKey: string): string {
  const label = ORG_FEATURE_LABELS[featureKey] ?? featureKey.replace(/_/g, " ");
  return `${label} is disabled for your organization. Contact your platform administrator.`;
}
