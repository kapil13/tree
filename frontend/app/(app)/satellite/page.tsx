"use client";

import { useQuery } from "@tanstack/react-query";
import { TreesMap } from "@/components/trees-map";
import { trees } from "@/lib/api";

export default function SatellitePage() {
  const { data } = useQuery({
    queryKey: ["trees-map"],
    queryFn: () => trees.list({ page_size: 200 }),
  });

  const items = data?.items ?? [];
  const verified = items.filter((t) => t.satellite_verified).length;
  const pending = items.length - verified;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Satellite</h1>
      <p className="text-sm text-stone-600">
        Plantation view on Google satellite imagery. Sentinel-2 / Landsat NDVI scans run
        monthly per tree — open a tree for its time-series chart.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Trees on map" value={items.length} />
        <Stat label="Satellite verified" value={verified} />
        <Stat label="Pending scan" value={pending} />
      </div>

      <TreesMap mapType="satellite" height="65vh" />
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
