"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  APIProvider,
  InfoWindow,
  Map,
  Marker,
} from "@vis.gl/react-google-maps";
import { trees, type Tree } from "@/lib/api";

const HEALTH_COLOR: Record<string, string> = {
  healthy: "#16a34a",
  moderate: "#f59e0b",
  unhealthy: "#dc2626",
};

const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };

function markerIcon(color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">
    <circle cx="12" cy="12" r="8" fill="${color}" stroke="white" stroke-width="2"/>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function treeColor(tree: Tree): string {
  return HEALTH_COLOR[tree.current_health] ?? HEALTH_COLOR.healthy;
}

type TreesMapProps = {
  mapType?: "roadmap" | "satellite" | "hybrid";
  height?: string;
  className?: string;
};

export function TreesMap({
  mapType = "roadmap",
  height = "70vh",
  className = "",
}: TreesMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [selected, setSelected] = useState<Tree | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["trees-map"],
    queryFn: () => trees.list({ page_size: 500 }),
  });

  const center = useMemo(() => {
    const items = data?.items;
    if (!items?.length) return DEFAULT_CENTER;
    const lat =
      items.reduce((sum, t) => sum + t.latitude, 0) / items.length;
    const lng =
      items.reduce((sum, t) => sum + t.longitude, 0) / items.length;
    return { lat, lng };
  }, [data]);

  if (!apiKey) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-stone-200 bg-stone-100 p-8 text-center text-stone-600 ${className}`}
        style={{ height }}
      >
        <p>
          Set{" "}
          <code className="font-mono text-sm">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>{" "}
          in <code className="font-mono text-sm">frontend/.env.local</code>
        </p>
        <p className="text-sm text-stone-500">
          Then rebuild the frontend:{" "}
          <code className="font-mono">make fix-frontend</code>{" "}
          (Docker bakes this key in at build time — restarting alone is not enough)
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-stone-200 bg-stone-100 text-stone-600 ${className}`}
        style={{ height }}
      >
        Loading trees…
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-700 ${className}`}
        style={{ height }}
      >
        Failed to load trees for the map. Are you signed in?
      </div>
    );
  }

  const items = data?.items ?? [];

  return (
    <div
      className={`overflow-hidden rounded-xl border border-stone-200 ${className}`}
      style={{ height }}
    >
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={center}
          defaultZoom={items.length ? 12 : 11}
          mapTypeId={mapType}
          gestureHandling="greedy"
          fullscreenControl
          mapTypeControl={mapType !== "roadmap"}
          streetViewControl={false}
          style={{ width: "100%", height: "100%" }}
        >
          {items.map((tree) => (
            <Marker
              key={tree.id}
              position={{ lat: tree.latitude, lng: tree.longitude }}
              title={tree.species_text || tree.public_code}
              icon={markerIcon(treeColor(tree))}
              onClick={() => setSelected(tree)}
            />
          ))}

          {selected && (
            <InfoWindow
              position={{
                lat: selected.latitude,
                lng: selected.longitude,
              }}
              onCloseClick={() => setSelected(null)}
            >
              <div className="min-w-[160px] space-y-1 text-sm text-stone-800">
                <div className="font-semibold">
                  {selected.species_text || "Unknown species"}
                </div>
                <div className="text-stone-500">{selected.public_code}</div>
                <div>
                  Carbon: {Number(selected.current_carbon_kg).toFixed(1)} kg
                </div>
                <div>
                  Satellite: {selected.satellite_verified ? "Verified" : "Pending"}
                </div>
                <Link
                  href={`/trees/${selected.id}`}
                  className="inline-block text-forest-700 underline"
                >
                  View tree →
                </Link>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>
    </div>
  );
}
