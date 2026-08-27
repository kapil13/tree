"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Satellite as SatelliteIcon, ShieldCheck } from "lucide-react";
import { DataTrustBanner } from "@/components/data-trust-banner";
import { PlantationFenceMap } from "@/components/plantation-fence-map";
import { BhoonidhiFenceCatalogPanel } from "@/components/satellite/bhoonidhi-fence-catalog-panel";
import { SarGroundPanel } from "@/components/satellite/sar-ground-panel";
import {
  CommandCenterEvidence,
  satelliteOperationalStatus,
} from "@/components/dashboard/command-center-shell";
import { fmtNum } from "@/components/dashboard/format";
import { FilterBar, FilterField, MetricGrid, OperationalStatusBar, PageHeader } from "@/components/ui";
import { TrustChip, trustToneFromProvider } from "@/components/ui/trust-chip";
import { bhoonidhi, plantationFences, sar, trees } from "@/lib/api";

export default function SatellitePage() {
  const searchParams = useSearchParams();
  const fenceFromUrl = searchParams.get("fence");
  const [selectedFenceId, setSelectedFenceId] = useState<string | null>(fenceFromUrl);
  const { data: treePage } = useQuery({
    queryKey: ["trees-map"],
    queryFn: () => trees.list({ page_size: 100 }),
  });
  const { data: fencePage } = useQuery({
    queryKey: ["plantation-fences"],
    queryFn: () => plantationFences.list(),
  });
  const { data: bhoonidhiStatus } = useQuery({
    queryKey: ["bhoonidhi-status"],
    queryFn: bhoonidhi.status,
  });
  const { data: sarStatus } = useQuery({
    queryKey: ["sar-status"],
    queryFn: () => sar.status(),
    retry: false,
  });

  const items = treePage?.items ?? [];
  const verified = items.filter((t) => t.satellite_verified).length;
  const fences = fencePage?.items ?? [];
  const selectedFence = fences.find((f) => f.id === selectedFenceId) ?? null;

  const ndviTrust = trustToneFromProvider(
    // Fence NDVI uses Copernicus / Sentinel when live; estimate otherwise via integrations banner.
    verified > 0 ? "live" : undefined,
  );
  const sarTrust = trustToneFromProvider(sarStatus?.live_data_provider ?? sarStatus?.sar_provider);
  const bhoonidhiTrust = bhoonidhiStatus?.configured
    ? { tone: "live" as const, label: "Catalog live" }
    : { tone: "stub" as const, label: "Optional" };

  useEffect(() => {
    if (fenceFromUrl) {
      setSelectedFenceId(fenceFromUrl);
    }
  }, [fenceFromUrl]);

  useEffect(() => {
    if (!selectedFenceId && fences.length === 1) {
      setSelectedFenceId(fences[0]!.id);
    }
  }, [fences, selectedFenceId]);

  const staleSites = useMemo(
    () =>
      fences.filter((f) => {
        if (!f.last_satellite_at) return true;
        const days = (Date.now() - new Date(f.last_satellite_at).getTime()) / (1000 * 60 * 60 * 24);
        return days >= 14;
      }).length,
    [fences],
  );

  const satStatus = satelliteOperationalStatus({
    fenceCount: fences.length,
    siteSelected: Boolean(selectedFence),
    ndviValue: selectedFence?.latest_ndvi_mean,
    verifiedTrees: verified,
    staleSites,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        purpose="Intelligence · Earth observation"
        title="Satellite monitoring"
        description="Select a work area, interpret canopy health first, then open radar or catalog tools for deeper investigation."
        breadcrumbs={[{ label: "Intelligence" }, { label: "Satellite" }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <TrustChip tone={ndviTrust.tone} label={`NDVI · ${verified > 0 ? "Active" : "Ready"}`} />
            <TrustChip tone={sarTrust.tone} label={`Radar · ${sarTrust.label}`} />
            <TrustChip tone={bhoonidhiTrust.tone} label={`ISRO · ${bhoonidhiTrust.label}`} />
          </div>
        }
      />

      <OperationalStatusBar
        tone={satStatus.tone}
        label={satStatus.label}
        summary={satStatus.summary}
        icon={satStatus.tone === "healthy" ? ShieldCheck : SatelliteIcon}
      />

      <MetricGrid
        columns={3}
        metrics={[
          { label: "Trees on map", value: fmtNum(items.length), hint: "Registered with GPS" },
          {
            label: "Satellite verified",
            value: fmtNum(verified),
            hint: items.length ? `${Math.round((verified / items.length) * 100)}% of mapped` : "—",
            tone: verified > 0 ? "positive" : "default",
          },
          {
            label: "Plantation sites",
            value: fmtNum(fences.length),
            hint: staleSites > 0 ? `${staleSites} need rescan` : "All current",
            tone: staleSites > 0 ? "warning" : "default",
          },
        ]}
      />

      <DataTrustBanner compact />

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-50">Site map & selection</h2>
          <p className="mt-0.5 text-sm text-stone-600">
            Draw a fence on the map, or pick an existing plantation site. Scans run on the selected area.
          </p>
        </div>

        <PlantationFenceMap
          mapType="satellite"
          height="60vh"
          selectedFenceId={selectedFenceId}
          onFenceSelect={setSelectedFenceId}
        />

        <FilterBar>
          <FilterField label="Selected plantation site" htmlFor="satellite-fence">
            {fences.length > 0 ? (
              <select
                id="satellite-fence"
                className="input w-full max-w-md"
                value={selectedFenceId ?? ""}
                onChange={(e) => setSelectedFenceId(e.target.value || null)}
              >
                <option value="">Select a site…</option>
                {fences.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-stone-600">
                Draw a fence on the map above, then run a greenness scan from the fence sidebar.
              </p>
            )}
          </FilterField>
        </FilterBar>

        {selectedFence ? (
          <p className="text-xs text-stone-500">
            Tip: you can also click a fence in the map sidebar to select it.
          </p>
        ) : fences.length > 0 ? (
          <p className="text-xs text-amber-800">
            Select a site to unlock NDVI details and advanced tools below.
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-50">Greenness (NDVI)</h2>
          <p className="mt-0.5 text-sm text-stone-600">
            Primary check for vegetation health. Use Run NDVI / satellite scan from the fence sidebar once a site is selected.
          </p>
        </div>
        {selectedFence ? (
          <div className="rounded-xl border border-forest-200 bg-forest-50/50 px-4 py-3 text-sm text-forest-900 dark:border-forest-900 dark:bg-forest-950/30 dark:text-forest-100">
            Site <strong>{selectedFence.name}</strong> selected
            {selectedFence.latest_ndvi_mean != null
              ? ` · latest NDVI ${selectedFence.latest_ndvi_mean.toFixed(2)}`
              : " · no NDVI yet — run a scan from the map sidebar"}
            .
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-center text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-900/40">
            Select or draw a fence above to see greenness for that site.
          </div>
        )}
      </section>

      <CommandCenterEvidence
        title="Advanced — radar (SAR) & ISRO catalog"
        description="Cloud cover, monsoon moisture, and Indian satellite scene search"
      >
        <p className="text-sm text-stone-600">
          Optional tools for deeper investigation. Most day-to-day monitoring only needs NDVI above.
        </p>

        {selectedFence ? (
          <>
            <SarGroundPanel fenceId={selectedFence.id} />
            <BhoonidhiFenceCatalogPanel
              fenceId={selectedFence.id}
              fenceName={selectedFence.name}
              configured={bhoonidhiStatus?.configured ?? false}
            />
          </>
        ) : (
          <p className="text-sm text-stone-500">
            Select a plantation site first to open radar scans and the ISRO Bhoonidhi catalog.
          </p>
        )}

        {bhoonidhiStatus && !bhoonidhiStatus.configured ? (
          <p className="text-xs text-amber-800">
            ISRO catalog search is optional and not configured on this server. NDVI and radar still work without it.
          </p>
        ) : null}
      </CommandCenterEvidence>
    </div>
  );
}
