"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { APIProvider, Map, Polygon, useMap } from "@vis.gl/react-google-maps";
import { MapPin, Trash2 } from "lucide-react";
import { type AuditBoundary, geoJsonRingToPaths } from "@/lib/audit-field-visit";
import { estimatePolygonAreaHa, formatAreaHa } from "@/lib/geo";
import { FALLBACK_MAP_CENTER } from "@/lib/map-defaults";

function pathsToGeoJson(paths: google.maps.LatLngLiteral[]): {
  type: "Polygon";
  coordinates: number[][][];
} {
  const ring = paths.map((p) => [p.lng, p.lat]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
    ring.push(first);
  }
  return { type: "Polygon", coordinates: [ring] };
}

function DrawingLayer({
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

export function AuditBoundaryDrawMap({
  boundaries,
  exclusions = [],
  mode = "boundary",
  disabled = false,
  onSaveBoundary,
  onSaveExclusion,
}: {
  boundaries: AuditBoundary[];
  exclusions?: Array<{
    id: string;
    name: string;
    boundary: { type: "Polygon"; coordinates: number[][][] };
  }>;
  mode?: "boundary" | "exclusion";
  disabled?: boolean;
  onSaveBoundary?: (payload: {
    name: string;
    boundary: { type: "Polygon"; coordinates: number[][][] };
    area_ha_claimed?: number;
  }) => Promise<void>;
  onSaveExclusion?: (payload: {
    name: string;
    exclusion_type: string;
    boundary: { type: "Polygon"; coordinates: number[][][] };
  }) => Promise<void>;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [drawMode, setDrawMode] = useState(false);
  const [draftPaths, setDraftPaths] = useState<google.maps.LatLngLiteral[]>([]);
  const [pendingName, setPendingName] = useState("");
  const [exclusionType, setExclusionType] = useState("road");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const draftAreaHa = useMemo(() => estimatePolygonAreaHa(draftPaths), [draftPaths]);

  const center = useMemo(() => {
    const points = [
      ...boundaries.flatMap((b) => geoJsonRingToPaths(b.boundary)),
      ...exclusions.flatMap((e) => geoJsonRingToPaths(e.boundary)),
      ...draftPaths,
    ];
    if (points.length === 0) return FALLBACK_MAP_CENTER;
    const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
    const lng = points.reduce((s, p) => s + p.lng, 0) / points.length;
    return { lat, lng };
  }, [boundaries, exclusions, draftPaths]);

  const onAddPoint = useCallback((pt: google.maps.LatLngLiteral) => {
    setDraftPaths((prev) => [...prev, pt]);
  }, []);

  async function handleSave() {
    if (draftPaths.length < 3) {
      setError("Draw at least 3 points to close a polygon.");
      return;
    }
    const name = pendingName.trim() || (mode === "exclusion" ? "Exclusion" : "Block");
    setSaving(true);
    setError(null);
    try {
      const boundary = pathsToGeoJson(draftPaths);
      if (mode === "exclusion") {
        await onSaveExclusion?.({
          name,
          exclusion_type: exclusionType,
          boundary,
        });
      } else {
        await onSaveBoundary?.({
          name,
          boundary,
          area_ha_claimed: draftAreaHa > 0 ? Math.round(draftAreaHa * 100) / 100 : undefined,
        });
      }
      setDraftPaths([]);
      setPendingName("");
      setDrawMode(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save polygon.");
    } finally {
      setSaving(false);
    }
  }

  if (!apiKey) {
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
        Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to draw boundaries on the map.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          <span className="text-stone-600">Name</span>
          <input
            className="input mt-1 min-w-[180px]"
            value={pendingName}
            onChange={(e) => setPendingName(e.target.value)}
            placeholder={mode === "exclusion" ? "Road buffer" : "Compartment A"}
            disabled={disabled || saving}
          />
        </label>
        {mode === "exclusion" && (
          <label className="block text-sm">
            <span className="text-stone-600">Type</span>
            <select
              className="input mt-1"
              value={exclusionType}
              onChange={(e) => setExclusionType(e.target.value)}
              disabled={disabled || saving}
            >
              <option value="road">Road</option>
              <option value="building">Building</option>
              <option value="water">Water</option>
              <option value="other">Other</option>
            </select>
          </label>
        )}
        <button
          type="button"
          className="btn-secondary"
          disabled={disabled || saving}
          onClick={() => {
            setDrawMode((v) => !v);
            setError(null);
          }}
        >
          {drawMode ? "Stop drawing" : "Draw on map"}
        </button>
        {draftPaths.length > 0 && (
          <>
            <button
              type="button"
              className="btn-primary"
              disabled={disabled || saving}
              onClick={() => void handleSave()}
            >
              Save polygon
            </button>
            <button
              type="button"
              className="btn-secondary inline-flex items-center gap-1"
              disabled={disabled || saving}
              onClick={() => setDraftPaths([])}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Clear
            </button>
            <span className="text-xs text-stone-500">
              {draftPaths.length} points · {formatAreaHa(draftAreaHa)}
            </span>
          </>
        )}
      </div>
      {error && <p className="text-sm text-rose-700">{error}</p>}
      <div className="overflow-hidden rounded-xl border border-stone-200" style={{ height: "360px" }}>
        <APIProvider apiKey={apiKey}>
          <Map
            defaultCenter={center}
            defaultZoom={12}
            mapTypeId="satellite"
            gestureHandling="greedy"
            disableDefaultUI
            style={{ width: "100%", height: "100%" }}
          >
            <DrawingLayer enabled={drawMode && !disabled} draftPaths={draftPaths} onAddPoint={onAddPoint} />
            {boundaries.map((b) => {
              const paths = geoJsonRingToPaths(b.boundary);
              if (!paths.length) return null;
              return (
                <Polygon
                  key={b.id}
                  paths={paths}
                  fillColor="#22c55e"
                  fillOpacity={0.1}
                  strokeColor="#15803d"
                  strokeWeight={2}
                />
              );
            })}
            {exclusions.map((e) => {
              const paths = geoJsonRingToPaths(e.boundary);
              if (!paths.length) return null;
              return (
                <Polygon
                  key={e.id}
                  paths={paths}
                  fillColor="#ef4444"
                  fillOpacity={0.25}
                  strokeColor="#b91c1c"
                  strokeWeight={2}
                />
              );
            })}
          </Map>
        </APIProvider>
      </div>
      {drawMode && (
        <p className="flex items-center gap-1.5 text-xs text-stone-500">
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          Click the map to add polygon vertices. Save when finished.
        </p>
      )}
    </div>
  );
}
