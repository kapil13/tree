"use client";

import { useQuery } from "@tanstack/react-query";
import { PlantationFenceMap } from "@/components/plantation-fence-map";
import { plantationFences, trees } from "@/lib/api";

export default function SatellitePage() {
  const { data: treePage } = useQuery({
    queryKey: ["trees-map"],
    queryFn: () => trees.list({ page_size: 200 }),
  });
  const { data: fencePage } = useQuery({
    queryKey: ["plantation-fences"],
    queryFn: () => plantationFences.list(),
  });

  const items = treePage?.items ?? [];
  const verified = items.filter((t) => t.satellite_verified).length;
  const fences = fencePage?.items ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Satellite</h1>
      <p className="text-sm text-stone-600">
        Draw plantation fences on the map for Sentinel-2 NDVI, and view a 5-day weather
        forecast for each fenced area.
      </p>

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
