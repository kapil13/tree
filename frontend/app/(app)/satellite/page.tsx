"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PlantationFenceMap } from "@/components/plantation-fence-map";
import { BhoonidhiFenceCatalogPanel } from "@/components/satellite/bhoonidhi-fence-catalog-panel";
import { bhoonidhi, plantationFences, trees } from "@/lib/api";

export default function SatellitePage() {
  const [selectedFenceId, setSelectedFenceId] = useState("");
  const { data: treePage } = useQuery({
    queryKey: ["trees-map"],
    queryFn: () => trees.list({ page_size: 200 }),
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
  const selectedFence = fences.find((f) => f.id === selectedFenceId);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Satellite</h1>
      <p className="text-sm text-stone-600">
        Draw plantation fences for <strong>Sentinel-2 NDVI</strong> (Copernicus) and browse{" "}
        <strong>ISRO Bhoonidhi</strong> IRS / ResourceSat / EOS-06 scenes for each site.
      </p>

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
              Email {bhoonidhiStatus.registration_email} with your VPS public IP to enable API access.
            </p>
          )}
        </div>
      )}

      {fences.length > 0 && (
        <div className="card">
          <label className="label">Plantation site for Bhoonidhi catalog</label>
          <select
            className="input max-w-md"
            value={selectedFenceId}
            onChange={(e) => setSelectedFenceId(e.target.value)}
          >
            <option value="">Select a site to browse ISRO scenes…</option>
            {fences.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedFence && bhoonidhiStatus?.configured && (
        <BhoonidhiFenceCatalogPanel fenceId={selectedFence.id} fenceName={selectedFence.name} />
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Trees on map" value={items.length} />
        <Stat label="Satellite verified" value={verified} />
        <Stat label="Plantation fences" value={fences.length} />
        <Stat label="Pending tree scan" value={items.length - verified} />
      </div>

      <PlantationFenceMap mapType="satellite" height="65vh" />
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
