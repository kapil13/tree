"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Radar, Scan, Trash2 } from "lucide-react";
import { NdviSparkline } from "@/components/satellite/ndvi-sparkline";
import { NdviStatsPanel } from "@/components/ndvi-stats-panel";
import { showToast } from "@/components/toast";
import { errorMessage, plantationFences, sar, type PlantationFence } from "@/lib/api";
import { formatAreaHa, FENCE_AREA_WARN_HA } from "@/lib/geo";
import { daysSinceIso } from "@/lib/map-geometry";
import { SAR_GROUND_STATUS_LABEL } from "@/lib/sar-labels";
import { cn } from "@/lib/cn";

type Props = {
  fence: PlantationFence;
  onScanComplete?: () => void;
  onDelete?: () => void;
};

function ndviTone(value: number | null | undefined): string {
  if (value == null) return "text-stone-500";
  if (value >= 0.6) return "text-emerald-700";
  if (value >= 0.35) return "text-lime-700";
  if (value >= 0.2) return "text-amber-800";
  return "text-rose-800";
}

function scanFreshnessLabel(days: number | null): { label: string; tone: string } {
  if (days == null) return { label: "No scan yet", tone: "bg-stone-100 text-stone-700" };
  if (days <= 14) return { label: `Scanned ${days}d ago`, tone: "bg-emerald-50 text-emerald-800" };
  if (days <= 35) return { label: `Scanned ${days}d ago`, tone: "bg-amber-50 text-amber-900" };
  return { label: `Stale · ${days}d ago`, tone: "bg-rose-50 text-rose-800" };
}

export function SatelliteSiteSummaryRail({ fence, onScanComplete, onDelete }: Props) {
  const qc = useQueryClient();
  const scanDays = daysSinceIso(fence.last_satellite_at);
  const freshness = scanFreshnessLabel(scanDays);
  const ndviValue = fence.latest_ndvi_mean ?? null;

  const { data: satelliteSeries } = useQuery({
    queryKey: ["fence-sat", fence.id],
    queryFn: () => plantationFences.satellite(fence.id),
  });

  const { data: sarMonitoring } = useQuery({
    queryKey: ["sar-monitoring", fence.id],
    queryFn: () => sar.fenceMonitoring(fence.id),
    enabled: Boolean(fence.id),
  });

  const scanFence = useMutation({
    mutationFn: () => plantationFences.scan(fence.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plantation-fences"] });
      qc.invalidateQueries({ queryKey: ["fence-sat", fence.id] });
      qc.invalidateQueries({ queryKey: ["satellite-health", "fence", fence.id] });
      qc.invalidateQueries({ queryKey: ["scan-history"] });
      onScanComplete?.();
    },
  });

  const scanSar = useMutation({
    mutationFn: () => sar.scanFence(fence.id),
    onSuccess: (data) => {
      showToast(
        `SAR scan complete — ${SAR_GROUND_STATUS_LABEL[data.analysis.ground_status] ?? data.analysis.ground_status}`,
      );
      qc.invalidateQueries({ queryKey: ["sar-monitoring", fence.id] });
      qc.invalidateQueries({ queryKey: ["scan-history"] });
      qc.invalidateQueries({ queryKey: ["monitoring-summary"] });
    },
    onError: (err) => showToast(errorMessage(err)),
  });

  const deleteFence = useMutation({
    mutationFn: () => plantationFences.remove(fence.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plantation-fences"] });
      onDelete?.();
    },
  });

  const fusion = sarMonitoring?.latest?.fusion;
  const trendPoints =
    satelliteSeries?.points?.map((p) => ({ ts: p.ts, ndvi: p.ndvi })) ?? [];

  return (
    <div className="flex h-full flex-col bg-white dark:bg-stone-950">
      <div className="border-b border-stone-200/80 px-4 py-4 dark:border-stone-800">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-800">
          Vegetation overview
        </p>
        <h2 className="mt-1 truncate text-lg font-semibold text-stone-900 dark:text-stone-50">
          {fence.name}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-stone-600">
          <span>{fence.area_ha != null ? formatAreaHa(fence.area_ha) : "Area —"}</span>
          {(fence.area_ha ?? 0) > FENCE_AREA_WARN_HA && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-900">
              Large block
            </span>
          )}
          <span className={cn("rounded-full px-2 py-0.5 font-medium", freshness.tone)}>
            {freshness.label}
          </span>
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
              Mean NDVI
            </p>
            <p className={cn("text-4xl font-bold tabular-nums", ndviTone(ndviValue))}>
              {ndviValue != null ? ndviValue.toFixed(2) : "—"}
            </p>
          </div>
          {fusion?.forest_integrity_score != null ? (
            <div className="rounded-xl bg-sky-50 px-3 py-2 text-right ring-1 ring-sky-100">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-800">
                Integrity
              </p>
              <p className="text-2xl font-bold tabular-nums text-sky-900">
                {fusion.forest_integrity_score}
              </p>
              <p className="text-[10px] capitalize text-sky-700">
                {fusion.integrity_grade ?? fusion.monitoring_mode ?? "SAR"}
              </p>
            </div>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary text-xs"
            disabled={scanFence.isPending}
            onClick={() => scanFence.mutate()}
          >
            {scanFence.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Scan className="h-3.5 w-3.5" />
            )}
            NDVI scan
          </button>
          <button
            type="button"
            className="btn-secondary text-xs"
            disabled={scanSar.isPending}
            onClick={() => scanSar.mutate()}
          >
            {scanSar.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Radar className="h-3.5 w-3.5" />
            )}
            SAR scan
          </button>
          <button
            type="button"
            className="btn-secondary text-xs text-rose-700"
            disabled={deleteFence.isPending}
            onClick={() => deleteFence.mutate()}
            title="Delete this site boundary"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        {scanFence.error ? (
          <p className="mt-2 text-xs text-rose-700">{errorMessage(scanFence.error)}</p>
        ) : null}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <section className="rounded-xl border border-stone-200 bg-stone-50/80 p-3 dark:border-stone-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Scene statistics
          </p>
          <div className="mt-2">
            <NdviStatsPanel
              latest={satelliteSeries?.latest}
              resolutionLabel="10 m polygon"
              size="default"
            />
          </div>
        </section>

        <section className="rounded-xl border border-stone-200 bg-stone-50/80 p-3 dark:border-stone-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Vegetation trend
          </p>
          <p className="mt-0.5 text-[11px] text-stone-500">Recent NDVI from stored scans</p>
          <div className="mt-2">
            <NdviSparkline points={trendPoints} />
          </div>
        </section>
      </div>
    </div>
  );
}
