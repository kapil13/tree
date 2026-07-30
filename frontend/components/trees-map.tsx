"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  APIProvider,
  InfoWindow,
  Map,
  Marker,
  useMap,
} from "@vis.gl/react-google-maps";
import { trees, errorMessage, type Tree } from "@/lib/api";

const HEALTH_COLOR: Record<string, string> = {
  healthy: "#16a34a",
  moderate: "#f59e0b",
  unhealthy: "#dc2626",
};

const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };
const CLUSTER_ZOOM_THRESHOLD = 13;

function markerIcon(color: string, size = 24): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="${color}" stroke="white" stroke-width="2"/>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function clusterIcon(count: number): string {
  const size = count > 99 ? 44 : count > 9 ? 38 : 32;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="#166534" fill-opacity="0.9" stroke="white" stroke-width="2"/>
    <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="${size > 38 ? 13 : 12}" font-family="system-ui,sans-serif" font-weight="700">${count > 999 ? "999+" : count}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function treeColor(tree: Tree): string {
  return HEALTH_COLOR[tree.current_health] ?? HEALTH_COLOR.healthy;
}

type BBox = { minLon: number; minLat: number; maxLon: number; maxLat: number };

function boundsToBbox(bounds: google.maps.LatLngBounds): BBox {
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  return {
    minLon: sw.lng(),
    minLat: sw.lat(),
    maxLon: ne.lng(),
    maxLat: ne.lat(),
  };
}

type Cluster = {
  id: string;
  lat: number;
  lng: number;
  count: number;
  trees: Tree[];
};

/** Grid clustering — keeps map usable at portfolio scale without extra deps. */
function clusterTrees(items: Tree[], zoom: number): Cluster[] {
  if (zoom >= CLUSTER_ZOOM_THRESHOLD || items.length <= 40) {
    return items.map((t) => ({
      id: t.id,
      lat: t.latitude,
      lng: t.longitude,
      count: 1,
      trees: [t],
    }));
  }
  // Coarser cells when zoomed out
  const cell = zoom >= 11 ? 0.04 : zoom >= 9 ? 0.12 : zoom >= 7 ? 0.35 : 0.8;
  const buckets = new globalThis.Map<string, Tree[]>();
  for (const t of items) {
    const key = `${Math.floor(t.latitude / cell)}_${Math.floor(t.longitude / cell)}`;
    const list = buckets.get(key) ?? [];
    list.push(t);
    buckets.set(key, list);
  }
  return Array.from(buckets.entries()).map(([key, group]: [string, Tree[]]) => {
    const lat = group.reduce((s: number, tree: Tree) => s + tree.latitude, 0) / group.length;
    const lng = group.reduce((s: number, tree: Tree) => s + tree.longitude, 0) / group.length;
    return { id: key, lat, lng, count: group.length, trees: group };
  });
}

type TreesMapProps = {
  mapType?: "roadmap" | "satellite" | "hybrid";
  height?: string;
  className?: string;
};

function MapViewportSync({
  onBounds,
}: {
  onBounds: (bbox: BBox, zoom: number) => void;
}) {
  const map = useMap();

  const emit = useCallback(() => {
    if (!map) return;
    const bounds = map.getBounds();
    if (!bounds) return;
    onBounds(boundsToBbox(bounds), map.getZoom() ?? 12);
  }, [map, onBounds]);

  useEffect(() => {
    if (!map) return;
    const listener = map.addListener("idle", emit);
    const t = window.setTimeout(emit, 300);
    return () => {
      window.clearTimeout(t);
      google.maps.event.removeListener(listener);
    };
  }, [map, emit]);

  return null;
}

export function TreesMap({
  mapType = "roadmap",
  height = "70vh",
  className = "",
}: TreesMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [selected, setSelected] = useState<Tree | null>(null);
  const [bbox, setBbox] = useState<BBox | null>(null);
  const [zoom, setZoom] = useState(12);

  const onBounds = useCallback((next: BBox, nextZoom: number) => {
    setBbox(next);
    setZoom(nextZoom);
  }, []);

  const bboxKey = bbox
    ? `${bbox.minLon.toFixed(3)},${bbox.minLat.toFixed(3)},${bbox.maxLon.toFixed(3)},${bbox.maxLat.toFixed(3)}`
    : "init";

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["trees-map", bboxKey],
    queryFn: () =>
      trees.list({
        page_size: 500,
        bbox: bbox
          ? `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`
          : undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? items.length;
  const clusters = useMemo(() => clusterTrees(items, zoom), [items, zoom]);

  const center = useMemo(() => {
    if (!items.length) return DEFAULT_CENTER;
    const lat = items.reduce((sum, t) => sum + t.latitude, 0) / items.length;
    const lng = items.reduce((sum, t) => sum + t.longitude, 0) / items.length;
    return { lat, lng };
  }, [items]);

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
      </div>
    );
  }

  if (error && !data) {
    return (
      <div
        className={`rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-700 ${className}`}
        style={{ height }}
      >
        <p className="font-medium">Failed to load trees for the map.</p>
        <p className="mt-1 text-sm">{errorMessage(error)}</p>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-stone-200 ${className}`}
      style={{ height }}
    >
      <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-lg border border-stone-200/80 bg-white/95 px-3 py-1.5 text-xs text-stone-700 shadow-sm backdrop-blur">
        {isLoading && !data ? (
          "Loading trees…"
        ) : (
          <>
            Showing <span className="font-semibold">{items.length}</span>
            {total > items.length ? (
              <>
                {" "}
                of <span className="font-semibold">{total}</span> in view
              </>
            ) : (
              <> trees</>
            )}
            {zoom < CLUSTER_ZOOM_THRESHOLD && clusters.some((c) => c.count > 1) ? (
              <span className="text-stone-500"> · clustered</span>
            ) : null}
            {isFetching ? <span className="text-stone-400"> · updating</span> : null}
          </>
        )}
      </div>

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
          <MapViewportSync onBounds={onBounds} />

          {clusters.map((cluster) =>
            cluster.count === 1 ? (
              <Marker
                key={cluster.id}
                position={{ lat: cluster.lat, lng: cluster.lng }}
                title={cluster.trees[0].species_text || cluster.trees[0].public_code}
                icon={markerIcon(treeColor(cluster.trees[0]))}
                onClick={() => setSelected(cluster.trees[0])}
              />
            ) : (
              <Marker
                key={cluster.id}
                position={{ lat: cluster.lat, lng: cluster.lng }}
                title={`${cluster.count} trees`}
                icon={clusterIcon(cluster.count)}
                onClick={() => {
                  // Pick healthiest-looking sample for info, or first
                  setSelected(cluster.trees[0]);
                }}
              />
            ),
          )}

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
