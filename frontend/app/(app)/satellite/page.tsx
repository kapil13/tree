"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTrustBanner } from "@/components/data-trust-banner";
import { PlantationFenceMap } from "@/components/plantation-fence-map";
import { BhoonidhiFenceCatalogPanel } from "@/components/satellite/bhoonidhi-fence-catalog-panel";
import { SarGroundPanel } from "@/components/satellite/sar-ground-panel";
import { bhoonidhi, plantationFences, trees } from "@/lib/api";

export default function SatellitePage() {
  const [selectedFenceId, setSelectedFenceId] = useState<string | null>(null);
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

  const items = treePage?.items ?? [];
  const verified = items.filter((t) => t.satellite_verified).length;
  const fences = fencePage?.items ?? [];
  const selectedFence = fences.find((f) => f.id === selectedFenceId) ?? null;

  useEffect(() => {
    if (!selectedFenceId && fences.length === 1) {
      setSelectedFenceId(fences[0]!.id);
    }
  }, [fences, selectedFenceId]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Satellite</h1>
      <p className="text-sm text-stone-600">
        Draw plantation fences for <strong>Sentinel-2 NDVI</strong> (Copernicus),{" "}
        <strong>SAR ground intelligence</strong> (NISAR-inspired L/S-band), and browse{" "}
        <strong>ISRO Bhoonidhi</strong> IRS / ResourceSat / EOS-06 scenes for each site.
      </p>
      <DataTrustBanner />

      {bhoonidhiStatus && (
        <div className="card text-sm">
          <div className="font-medium text-stone-800">Bhoonidhi (ISRO NRSC)</div>
          <p className="mt-1 text-stone-600">{bhoonidhiStatus.message}</p>
          {bhoonidhiStatus.configured ? (
            <p className="mt-2 text-xs text-stone-500">
              Catalog: {bhoonidhiStatus.default_collections.slice(0, 3).join(", ")}…
            </p>
          ) : (
            <p className="mt-2 text-xs text-amber-800">
              API credentials not configured yet — Bhoonidhi scene search is optional. SAR and NDVI
              still work without it.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Trees on map" value={items.length} />
        <Stat label="Satellite verified" value={verified} />
        <Stat label="Plantation fences" value={fences.length} />
        <Stat label="Pending tree scan" value={items.length - verified} />
      </div>

      <PlantationFenceMap
        mapType="satellite"
        height="65vh"
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
            <option value="">Select a site for SAR & Bhoonidhi panels…</option>
            {fences.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-sm text-stone-600">
            Draw a fence on the map above, then run <strong>Run SAR scan</strong> from the fence
            sidebar.
          </p>
        )}
        {selectedFence ? (
          <p className="mt-2 text-xs text-stone-500">
            Tip: you can also click a fence in the right sidebar on the map to select it.
          </p>
        ) : fences.length > 0 ? (
          <p className="mt-2 text-xs text-amber-800">
            Select a site to show the SAR ground panel and Bhoonidhi catalog below.
          </p>
        ) : null}
      </div>

      {selectedFence ? (
        <>
          <SarGroundPanel fenceId={selectedFence.id} />
          <BhoonidhiFenceCatalogPanel
            fenceId={selectedFence.id}
            fenceName={selectedFence.name}
            configured={bhoonidhiStatus?.configured ?? false}
          />
        </>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <div className="text-sm text-stone-600">{label}</div>
      <div className="text-2xl font-semibold text-forest-800">{value}</div>
    </div>
  );
}
