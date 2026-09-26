"use client";

import { Satellite } from "lucide-react";
import { PestIntelPanel } from "@/components/pest-intel-panel";
import { PlantationNdviPreview } from "@/components/plantation-ndvi-preview";
import { SatelliteHealthPanel } from "@/components/satellite-health-panel";
import { ScanHistoryGrid } from "@/components/satellite/scan-history-grid";
import { SarGroundPanel } from "@/components/satellite/sar-ground-panel";
import { BhoonidhiFenceCatalogPanel } from "@/components/satellite/bhoonidhi-fence-catalog-panel";
import { WeatherForecastPanel } from "@/components/weather-forecast";
import type { PlantationFence } from "@/lib/api";

type Props = {
  fence: PlantationFence;
  ndviRefresh: number;
  bhoonidhiConfigured?: boolean;
};

export function SatelliteSiteDetailSections({
  fence,
  ndviRefresh,
  bhoonidhiConfigured = false,
}: Props) {
  return (
    <div className="space-y-4">
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
            className="min-h-[240px]"
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900 lg:col-span-1">
          <SatelliteHealthPanel kind="fence" targetId={fence.id} />
        </section>
        <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900 lg:col-span-1">
          <SarGroundPanel fenceId={fence.id} compact />
        </section>
        <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900 lg:col-span-1 xl:col-span-1">
          <WeatherForecastPanel fenceId={fence.id} fenceName={fence.name} variant="expanded" />
        </section>
      </div>

      <ScanHistoryGrid fenceId={fence.id} title="Scan history" />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <PestIntelPanel kind="work-area" targetId={fence.id} />
        </section>
        {bhoonidhiConfigured ? (
          <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <BhoonidhiFenceCatalogPanel fenceId={fence.id} fenceName={fence.name} configured />
          </section>
        ) : null}
      </div>
    </div>
  );
}
