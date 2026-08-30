"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Scan, Satellite, Trash2 } from "lucide-react";
import { NdviStatsPanel } from "@/components/ndvi-stats-panel";
import { PestIntelPanel } from "@/components/pest-intel-panel";
import { PlantationNdviPreview } from "@/components/plantation-ndvi-preview";
import { SatelliteHealthPanel } from "@/components/satellite-health-panel";
import { SarGroundPanel } from "@/components/satellite/sar-ground-panel";
import { BhoonidhiFenceCatalogPanel } from "@/components/satellite/bhoonidhi-fence-catalog-panel";
import { WeatherForecastPanel } from "@/components/weather-forecast";
import { errorMessage, plantationFences, type PlantationFence } from "@/lib/api";
import { formatAreaHa, FENCE_AREA_WARN_HA } from "@/lib/geo";
import { daysSinceIso } from "@/lib/map-geometry";
import { cn } from "@/lib/cn";

type Props = {
  fence: PlantationFence;
  ndviRefresh: number;
  onScanComplete?: () => void;
  onDelete?: () => void;
  bhoonidhiConfigured?: boolean;
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

export function SatelliteSiteDetailPanel({
  fence,
  ndviRefresh,
  onScanComplete,
  onDelete,
  bhoonidhiConfigured = false,
}: Props) {
  const qc = useQueryClient();
  const scanDays = daysSinceIso(fence.last_satellite_at);
  const freshness = scanFreshnessLabel(scanDays);

  const { data: satelliteSeries } = useQuery({
    queryKey: ["fence-sat", fence.id],
    queryFn: () => plantationFences.satellite(fence.id),
  });

  const scanFence = useMutation({
    mutationFn: () => plantationFences.scan(fence.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plantation-fences"] });
      qc.invalidateQueries({ queryKey: ["fence-sat", fence.id] });
      qc.invalidateQueries({ queryKey: ["satellite-health", "fence", fence.id] });
      onScanComplete?.();
    },
  });

  const deleteFence = useMutation({
    mutationFn: () => plantationFences.remove(fence.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plantation-fences"] });
      onDelete?.();
    },
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-stone-200/80 bg-white px-5 py-4 dark:border-stone-800 dark:bg-stone-950">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-800">
              Selected site
            </p>
            <h2 className="mt-1 truncate text-xl font-semibold text-stone-900 dark:text-stone-50">
              {fence.name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-stone-600">
              <span>{fence.area_ha != null ? formatAreaHa(fence.area_ha) : "Area —"}</span>
              {(fence.area_ha ?? 0) > FENCE_AREA_WARN_HA && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                  Large block
                </span>
              )}
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", freshness.tone)}>
                {freshness.label}
              </span>
            </div>
          </div>
          <div
            className={cn(
              "shrink-0 rounded-2xl bg-gradient-to-br from-emerald-50 to-lime-50 px-4 py-3 text-right ring-1 ring-emerald-100",
            )}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Mean NDVI</p>
            <p className={cn("text-3xl font-bold tabular-nums", ndviTone(fence.latest_ndvi_mean))}>
              {fence.latest_ndvi_mean != null ? fence.latest_ndvi_mean.toFixed(2) : "—"}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary"
            disabled={scanFence.isPending}
            onClick={() => scanFence.mutate()}
          >
            {scanFence.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Scan className="h-4 w-4" />
            )}
            {scanFence.isPending ? "Running NDVI scan…" : "Run NDVI scan"}
          </button>
          <button
            type="button"
            className="btn-secondary text-rose-700"
            disabled={deleteFence.isPending}
            onClick={() => deleteFence.mutate()}
            title="Delete this site boundary"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        {scanFence.error && (
          <p className="mt-2 text-sm text-rose-700">{errorMessage(scanFence.error)}</p>
        )}
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <div className="border-b border-stone-100 px-4 py-3 dark:border-stone-800">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-stone-50">
              <Satellite className="h-4 w-4 text-emerald-600" />
              NDVI greenness map
            </h3>
            <p className="mt-0.5 text-xs text-stone-500">
              Sentinel-2 false colour · 10 m resolution · polygon mean
            </p>
          </div>
          <div className="p-4">
            <PlantationNdviPreview
              fenceId={fence.id}
              ndvi={fence.latest_ndvi_mean ?? undefined}
              refreshKey={ndviRefresh}
              className="min-h-[220px]"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-50">Vegetation indices</h3>
          <p className="mt-0.5 text-xs text-stone-500">Latest scene statistics for this boundary</p>
          <div className="mt-4">
            <NdviStatsPanel latest={satelliteSeries?.latest} resolutionLabel="10 m polygon" size="lg" />
          </div>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <WeatherForecastPanel fenceId={fence.id} fenceName={fence.name} variant="expanded" />
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <SatelliteHealthPanel kind="fence" targetId={fence.id} />
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <SarGroundPanel fenceId={fence.id} />
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <PestIntelPanel kind="work-area" targetId={fence.id} />
        </section>

        {bhoonidhiConfigured && (
          <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <BhoonidhiFenceCatalogPanel fenceId={fence.id} fenceName={fence.name} configured />
          </section>
        )}
      </div>
    </div>
  );
}
