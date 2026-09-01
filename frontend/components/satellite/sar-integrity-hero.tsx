"use client";

import { ArrowRight, Radar } from "lucide-react";
import Link from "next/link";
import type { SarFusion } from "@/lib/api";
import { portfolioMonitoringHref } from "@/lib/portfolio-health-links";
import { cn } from "@/lib/cn";
import {
  SAR_GRADE_LABEL,
  SAR_MODE_LABEL,
  isSarAtRisk,
  sarIntegrityColor,
  sarRecommendedAction,
} from "@/lib/sar-labels";

export function SarIntegrityHero({
  fusion,
  groundStatus,
  daysSinceScan,
  compact = false,
}: {
  fusion: SarFusion | null | undefined;
  groundStatus?: string | null;
  daysSinceScan?: number | null;
  compact?: boolean;
}) {
  if (!fusion) {
    return (
      <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-center">
        <Radar className="mx-auto h-8 w-8 text-stone-400" />
        <p className="mt-2 text-sm font-medium text-stone-700">Forest Integrity not established</p>
        <p className="mt-1 text-xs text-stone-500">
          Run a SAR scan to measure ground moisture and canopy–soil alignment.
        </p>
      </div>
    );
  }

  const score = fusion.forest_integrity_score;
  const color = sarIntegrityColor(score);
  const atRisk = isSarAtRisk(score, fusion.integrity_grade);
  const stale = daysSinceScan != null && daysSinceScan > 35;
  const action = sarRecommendedAction({
    sar_stale: stale,
    sar_monitoring_mode: fusion.monitoring_mode,
    sar_ground_status: groundStatus,
    sar_at_risk: atRisk,
    sar_forest_integrity: score,
  });

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-forest-200 bg-gradient-to-br from-forest-50 via-white to-emerald-50/40",
        compact ? "p-4" : "p-5",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-forest-800">
            Forest Integrity Score
          </p>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-4xl font-bold tabular-nums" style={{ color }}>
              {Math.round(score)}
            </span>
            <span className="pb-1 text-sm text-stone-500">/ 100</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-medium capitalize text-stone-700 ring-1 ring-stone-200">
              {SAR_GRADE_LABEL[fusion.integrity_grade] ?? fusion.integrity_grade.replaceAll("_", " ")}
            </span>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium ring-1",
                fusion.monitoring_mode === "optical_sar_divergent"
                  ? "bg-amber-50 text-amber-900 ring-amber-200"
                  : "bg-white/80 text-stone-700 ring-stone-200",
              )}
            >
              {SAR_MODE_LABEL[fusion.monitoring_mode] ?? fusion.monitoring_mode.replaceAll("_", " ")}
            </span>
            {atRisk && (
              <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-800 ring-1 ring-red-200">
                At risk
              </span>
            )}
          </div>
          {!compact && fusion.summary ? (
            <p className="mt-3 text-sm leading-relaxed text-stone-700">{fusion.summary}</p>
          ) : null}
        </div>

        <div
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 bg-white shadow-sm"
          style={{ borderColor: color }}
          aria-hidden
        >
          <Radar className="h-8 w-8" style={{ color }} />
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-forest-100 bg-white/70 px-3 py-2.5">
        <p className="text-xs font-medium uppercase tracking-wide text-forest-800">Recommended action</p>
        <p className="mt-1 text-sm text-stone-700">{action}</p>
      </div>
    </div>
  );
}

export function SarProductStoryBanner() {
  return (
    <section className="overflow-hidden rounded-2xl border border-forest-200 bg-gradient-to-r from-forest-900 via-forest-800 to-emerald-900 px-5 py-5 text-white sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-200/90">
            Axentis ground intelligence
          </p>
          <h2 className="text-lg font-semibold sm:text-xl">
            NISAR-inspired SAR — see moisture and stress under the canopy
          </h2>
          <p className="text-sm leading-relaxed text-emerald-50/85">
            Sentinel-1 SAR penetrates cloud and canopy to detect hidden moisture, wetland risk, and
            optical–SAR divergence during monsoon. Forest Integrity Score fuses NDVI with ground
            truth for supervisor action.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <Link
            href={portfolioMonitoringHref()}
            className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-3 py-2 text-xs font-medium text-white ring-1 ring-white/25 hover:bg-white/20"
          >
            Portfolio SAR dashboard
            <ArrowRight className="h-3 w-3" />
          </Link>
          <p className="text-[10px] text-emerald-200/70">Powered by Axentis Technologies</p>
        </div>
      </div>
    </section>
  );
}
