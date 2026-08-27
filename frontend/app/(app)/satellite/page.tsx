"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { DataTrustBanner } from "@/components/data-trust-banner";
import { PlantationFenceMap } from "@/components/plantation-fence-map";
import { BhoonidhiFenceCatalogPanel } from "@/components/satellite/bhoonidhi-fence-catalog-panel";
import { SarGroundPanel } from "@/components/satellite/sar-ground-panel";
import { PageHeader } from "@/components/ui/page-header";
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

  return (
    <div className="space-y-5">
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

      <DataTrustBanner compact />

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-stone-900">1. Draw or select a site</h2>
          <p className="mt-0.5 text-sm text-stone-600">
            Start by drawing a fence on the map, or pick an existing plantation site. Scans run on the
            selected area.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Trees on map" value={items.length} />
          <Stat label="Satellite verified" value={verified} />
          <Stat label="Plantation fences" value={fences.length} />
        </div>

        <PlantationFenceMap
          mapType="satellite"
          height="60vh"
          selectedFenceId={selectedFenceId}
          onFenceSelect={setSelectedFenceId}
        />

        <div className="card">
          <label className="label">Selected plantation site</label>
          {fences.length > 0 ? (
            <select
              className="input max-w-md"
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
          {selectedFence ? (
            <p className="mt-2 text-xs text-stone-500">
              Tip: you can also click a fence in the map sidebar to select it.
            </p>
          ) : fences.length > 0 ? (
            <p className="mt-2 text-xs text-amber-800">
              Select a site to unlock NDVI details and advanced tools below.
            </p>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-stone-900">2. Greenness (NDVI)</h2>
          <p className="mt-0.5 text-sm text-stone-600">
            Primary check for vegetation health. Use <strong>Run NDVI</strong> / satellite scan from
            the fence sidebar on the map once a site is selected.
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
          <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-center text-sm text-stone-600">
            Select or draw a fence above to see greenness for that site.
          </div>
        )}
      </section>

      <details className="group rounded-xl border border-stone-200 bg-white open:shadow-sm dark:border-stone-700 dark:bg-stone-950">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-stone-800 dark:text-stone-100">
          <span>Advanced — radar (SAR) & ISRO catalog</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-stone-400 transition group-open:rotate-180" />
        </summary>
        <div className="space-y-4 border-t border-stone-100 px-4 py-4 dark:border-stone-800">
          <p className="text-sm text-stone-600">
            Optional tools for cloud cover, monsoon moisture, and Indian satellite scene search.
            Most day-to-day monitoring only needs NDVI above.
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
              ISRO catalog search is optional and not configured on this server. NDVI and radar still
              work without it.
            </p>
          ) : null}
        </div>
      </details>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/80 px-4 py-3 dark:border-stone-700 dark:bg-stone-900/40">
      <div className="text-sm text-stone-600">{label}</div>
      <div className="text-2xl font-semibold text-forest-800">{value}</div>
    </div>
  );
}
