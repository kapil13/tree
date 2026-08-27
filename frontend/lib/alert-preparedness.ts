import type { PreparednessBrief } from "@/components/alerts/alert-preparedness-block";

const STRONG_METHANE_ANOMALY_PPB = 15;

export function interpretEmissionFusionClient(input: {
  verdict: string;
  anomalyPpb?: number | null;
  alignmentScore?: number | null;
  workAreaName?: string;
}): PreparednessBrief {
  const { verdict, anomalyPpb, alignmentScore, workAreaName = "this work area" } = input;
  const ppb = anomalyPpb ?? 0;
  const score = alignmentScore ?? 0;

  if (verdict === "consistent" && ppb >= STRONG_METHANE_ANOMALY_PPB) {
    return {
      headline: `Elevated methane detected — matches declared sources`,
      meaning: `Satellite sees about +${ppb.toFixed(1)} ppb methane over ${workAreaName}, and it lines up with your registered sources and wind direction.`,
      prepare: [
        "Log this scan for compliance — no immediate field action required",
        "Keep source registry and dispersion model up to date for audits",
      ],
      urgency: "monitor",
      category: "methane",
    };
  }

  if (verdict === "misaligned" || verdict === "uncertain" || ppb >= STRONG_METHANE_ANOMALY_PPB) {
    return {
      headline: `Check methane signals at ${workAreaName}`,
      meaning: `Satellite shows +${ppb.toFixed(1)} ppb methane anomaly (alignment ${score.toFixed(0)}/100). Verify sources on the ground before reporting or audit.`,
      prepare: [
        "Confirm emission source locations and activity dates in the field",
        "Update the source registry if equipment or land use changed",
        "Re-run dispersion after corrections if the signal persists",
      ],
      urgency: verdict === "misaligned" ? "this_week" : "monitor",
      category: "methane",
    };
  }

  return {
    headline: `No strong methane anomaly at ${workAreaName}`,
    meaning: "Latest satellite scan does not show a significant elevation over baseline.",
    prepare: ["Continue routine monitoring on your normal schedule"],
    urgency: "monitor",
    category: "methane",
  };
}
