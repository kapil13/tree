"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  APIProvider,
  Map,
  Marker,
  Polygon,
  useMap,
} from "@vis.gl/react-google-maps";
import { Loader2, Scan, Trash2 } from "lucide-react";
import {
  plantationFences,
  trees,
  errorMessage,
  type PlantationFence,
  type Tree,
} from "@/lib/api";
import { PlantationNdviPreview } from "@/components/plantation-ndvi-preview";

const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };

const HEALTH_COLOR: Record<string, string> = {
  healthy: "#16a34a",
  moderate: "#f59e0b",
  unhealthy: "#dc2626",
};

function markerIcon(color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20">
    <circle cx="10" cy="10" r="6" fill="${color}" stroke="white" stroke-width="2"/>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function pathsToGeoJson(paths: google.maps.LatLngLiteral[]): {
  type: "Polygon";
  coordinates: number[][][];
} {
  const ring = paths.map((p) => [p.lng, p.lat]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push(first);
  }
  return { type: "Polygon", coordinates: [ring] };
}

function geoJsonToPaths(boundary: PlantationFence["boundary"]): google.maps.LatLngLiteral[] {
  const ring = boundary.coordinates[0] ?? [];
  const open = ring.length > 1 ? ring.slice(0, -1) : ring;
  return open.map(([lng, lat]) => ({ lat, lng }));
}

function FenceDrawingLayer({
  enabled,
  draftPaths,
  onAddPoint,
}: {
  enabled: boolean;
  draftPaths: google.maps.LatLngLiteral[];
  onAddPoint: (pt: google.maps.LatLngLiteral) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !enabled) return;
    const listener = map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      onAddPoint({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    });
    return () => listener.remove();
  }, [map, enabled, onAddPoint]);

  if (!draftPaths.length) return null;

  return (
    <Polygon
      paths={draftPaths}
      fillColor="#16a34a"
      fillOpacity={0.2}
      strokeColor="#15803d"
      strokeWeight={2}
    />
  );
}

type Props = {
  mapType?: "roadmap" | "satellite" | "hybrid";
  height?: string;
  className?: string;
};

export function PlantationFenceMap({
  mapType = "satellite",
  height = "65vh",
  className = "",
}: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ndviRefresh, setNdviRefresh] = useState(0);
  const [drawMode, setDrawMode] = useState(false);
  const [draftPaths, setDraftPaths] = useState<google.maps.LatLngLiteral[]>([]);
  const [pendingName, setPendingName] = useState("");
  const [pendingPaths, setPendingPaths] = useState<google.maps.LatLngLiteral[] | null>(null);

  const { data: fencePage, isLoading: fencesLoading } = useQuery({
    queryKey: ["plantation-fences"],
    queryFn: () => plantationFences.list(),
  });

  const { data: treePage } = useQuery({
    queryKey: ["trees-map"],
    queryFn: () => trees.list({ page_size: 200 }),
  });

  const fences = fencePage?.items ?? [];
  const treeItems = treePage?.items ?? [];

  const center = useMemo(() => {
    if (fences.length) {
      const all = fences.flatMap((f) => geoJsonToPaths(f.boundary));
      if (all.length) {
        return {
          lat: all.reduce((s, p) => s + p.lat, 0) / all.length,
          lng: all.reduce((s, p) => s + p.lng, 0) / all.length,
        };
      }
    }
    if (treeItems.length) {
      return {
        lat: treeItems.reduce((s, t) => s + t.latitude, 0) / treeItems.length,
        lng: treeItems.reduce((s, t) => s + t.longitude, 0) / treeItems.length,
      };
    }
    return DEFAULT_CENTER;
  }, [fences, treeItems]);

  const scanFence = useMutation({
    mutationFn: (id: string) => plantationFences.scan(id),
    onSuccess: () => {
      setNdviRefresh((n) => n + 1);
      qc.invalidateQueries({ queryKey: ["plantation-fences"] });
    },
  });

  const createFence = useMutation({
    mutationFn: (payload: { name: string; boundary: PlantationFence["boundary"] }) =>
      plantationFences.create(payload),
    onSuccess: async (fence) => {
      setPendingPaths(null);
      setPendingName("");
      setDrawMode(false);
      setSelectedId(fence.id);
      await qc.invalidateQueries({ queryKey: ["plantation-fences"] });
      scanFence.mutate(fence.id);
    },
  });

  const deleteFence = useMutation({
    mutationFn: (id: string) => plantationFences.remove(id),
    onSuccess: () => {
      setSelectedId(null);
      qc.invalidateQueries({ queryKey: ["plantation-fences"] });
    },
  });

  const handleAddPoint = useCallback((pt: google.maps.LatLngLiteral) => {
    if (!drawMode) return;
    setDraftPaths((prev) => [...prev, pt]);
  }, [drawMode]);

  const finishDrawing = () => {
    if (draftPaths.length < 3) return;
    setPendingPaths(draftPaths);
    setDraftPaths([]);
    setDrawMode(false);
  };

  const submitFence = () => {
    if (!pendingPaths?.length || !pendingName.trim()) return;
    createFence.mutate({
      name: pendingName.trim(),
      boundary: pathsToGeoJson(pendingPaths),
    });
  };

  if (!apiKey) {
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-100 p-8 text-center text-stone-600">
        Set <code className="font-mono text-sm">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in{" "}
        <code className="font-mono text-sm">frontend/.env.local</code>
      </div>
    );
  }

  const selected = fences.find((f) => f.id === selectedId) ?? null;

  return (
    <div className={`grid gap-4 lg:grid-cols-[1fr_320px] ${className}`}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={drawMode ? "btn-primary" : "btn-secondary"}
            onClick={() => {
              setDrawMode((v) => !v);
              setDraftPaths([]);
            }}
          >
            {drawMode ? "Click map to add corners" : "Draw plantation fence"}
          </button>
          {drawMode && (
            <>
              <button
                type="button"
                className="btn-secondary"
                disabled={draftPaths.length < 3}
                onClick={finishDrawing}
              >
                Finish polygon ({draftPaths.length} pts)
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setDraftPaths([]);
                  setDrawMode(false);
                }}
              >
                Cancel
              </button>
            </>
          )}
          <span className="text-xs text-stone-500">
            Click corners on the map to outline your plantation. NDVI uses Copernicus Sentinel-2
            (10 m).
          </span>
        </div>

        {pendingPaths && (
          <div className="card flex flex-wrap items-end gap-3">
            <div className="flex-1">
              <label className="kpi-label">Fence name</label>
              <input
                className="input mt-1"
                placeholder="e.g. North block"
                value={pendingName}
                onChange={(e) => setPendingName(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn-primary"
              disabled={!pendingName.trim() || createFence.isPending}
              onClick={submitFence}
            >
              {createFence.isPending ? "Saving…" : "Save fence & scan NDVI"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setPendingPaths(null);
                setPendingName("");
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {createFence.error && (
          <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage(createFence.error)}
          </div>
        )}

        <div
          className="overflow-hidden rounded-xl border border-stone-200"
          style={{ height }}
        >
          <APIProvider apiKey={apiKey}>
            <Map
              defaultCenter={center}
              defaultZoom={14}
              mapTypeId={mapType}
              gestureHandling="greedy"
              fullscreenControl
              mapTypeControl
              streetViewControl={false}
              style={{ width: "100%", height: "100%" }}
            >
              <FenceDrawingLayer
                enabled={drawMode}
                draftPaths={draftPaths}
                onAddPoint={handleAddPoint}
              />

              {fences.map((fence) => {
                const paths = geoJsonToPaths(fence.boundary);
                const active = fence.id === selectedId;
                return (
                  <Polygon
                    key={fence.id}
                    paths={paths}
                    fillColor={active ? "#16a34a" : "#22c55e"}
                    fillOpacity={active ? 0.35 : 0.2}
                    strokeColor={active ? "#14532d" : "#15803d"}
                    strokeWeight={active ? 3 : 2}
                    onClick={() => setSelectedId(fence.id)}
                  />
                );
              })}

              {treeItems.map((tree: Tree) => (
                <Marker
                  key={tree.id}
                  position={{ lat: tree.latitude, lng: tree.longitude }}
                  icon={markerIcon(HEALTH_COLOR[tree.current_health] ?? HEALTH_COLOR.healthy)}
                />
              ))}
            </Map>
          </APIProvider>
        </div>
      </div>

      <aside className="card max-h-[80vh] space-y-3 overflow-y-auto">
        <h2 className="text-sm font-medium">Plantation fences</h2>
        {fencesLoading ? (
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : fences.length === 0 ? (
          <p className="text-sm text-stone-500">
            No fences yet. Click &quot;Draw plantation fence&quot; and outline your plantation on
            the map.
          </p>
        ) : (
          <ul className="space-y-4">
            {fences.map((fence) => (
              <li
                key={fence.id}
                className={`rounded-lg border p-3 ${
                  selectedId === fence.id
                    ? "border-forest-500 bg-forest-50"
                    : "border-stone-200"
                }`}
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setSelectedId(fence.id)}
                >
                  <div className="font-medium">{fence.name}</div>
                  <div className="text-xs text-stone-500">
                    {fence.area_ha != null ? `${fence.area_ha.toFixed(2)} ha` : "—"}
                    {fence.latest_ndvi_mean != null &&
                      ` · NDVI ${fence.latest_ndvi_mean.toFixed(2)}`}
                  </div>
                </button>

                {(selectedId === fence.id || fences.length === 1) && (
                  <div className="mt-3 space-y-2">
                    <PlantationNdviPreview
                      fenceId={fence.id}
                      ndvi={fence.latest_ndvi_mean ?? undefined}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn-secondary flex-1 text-xs"
                        disabled={scanFence.isPending}
                        onClick={() => scanFence.mutate(fence.id)}
                      >
                        <Scan className="h-3 w-3" />
                        {scanFence.isPending ? "Scanning…" : "Rescan NDVI"}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary text-xs text-rose-700"
                        disabled={deleteFence.isPending}
                        onClick={() => deleteFence.mutate(fence.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
