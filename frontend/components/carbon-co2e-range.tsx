"use client";

import { cn } from "@/lib/cn";
import { CarbonEstimateLabel } from "@/components/carbon-estimate-label";

export type Co2eUncertainty = {
  co2e_kg: number;
  co2e_kg_lower_90?: number | null;
  co2e_kg_upper_90?: number | null;
  uncertainty_pct?: number | null;
  verra_deduction_pct?: number | null;
  creditable_co2e_kg?: number | null;
};

function formatKg(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(2)} t`;
  return `${value.toFixed(1)} kg`;
}

/** Display CO₂e as a 90% confidence range when available. */
export function CarbonCo2eRange({
  data,
  className,
  showLabel = true,
  compact = false,
}: {
  data: Co2eUncertainty;
  className?: string;
  showLabel?: boolean;
  compact?: boolean;
}) {
  const lower = data.co2e_kg_lower_90;
  const upper = data.co2e_kg_upper_90;
  const hasRange =
    lower != null && upper != null && lower > 0 && upper > lower;

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      {hasRange ? (
        <span
          title={
            data.uncertainty_pct != null
              ? `90% confidence interval (±${data.uncertainty_pct.toFixed(1)}% measurement + model uncertainty)`
              : "90% confidence interval"
          }
        >
          {compact
            ? `${formatKg(lower)}–${formatKg(upper)} CO₂e`
            : `${formatKg(lower)} – ${formatKg(upper)} CO₂e`}
        </span>
      ) : (
        <span>{formatKg(data.co2e_kg)} CO₂e</span>
      )}
      {showLabel ? <CarbonEstimateLabel compact={compact} /> : null}
      {data.verra_deduction_pct != null && data.verra_deduction_pct > 0 ? (
        <span
          className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-900 dark:bg-violet-950/40 dark:text-violet-200"
          title="Verra VM0047 uncertainty deduction applied to creditable quantity"
        >
          −{data.verra_deduction_pct.toFixed(0)}% Verra
        </span>
      ) : null}
    </span>
  );
}
