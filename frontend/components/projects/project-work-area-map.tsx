"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  APIProvider,
  Map,
  Polygon,
  Polyline,
  useMap,
} from "@vis.gl/react-google-maps";
import {
  errorMessage,
  plantingProjects,
  type GeoJsonLineString,
  type GeoJsonPolygon,
  type WorkArea,
} from "@/lib/api";
import { estimatePolygonAreaHa, formatAreaHa } from "@/lib/geo";

const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };

function pathsToGeoJson(paths: google.maps.LatLngLiteral[]): GeoJsonPolygon {
  const ring = paths.map((p) => [p.lng, p.lat]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) ring.push(first);
  return { type: "Polygon", coordinates: [ring] };
}

function lineToGeoJson(paths: google.maps.LatLngLiteral[]): GeoJsonLineString {
  return {
    type: "LineString",
    coordinates: paths.map((p) => [p.lng, p.lat]),
  };
}

function geoJsonToPaths(boundary: GeoJsonPolygon): google.maps.LatLngLiteral[] {
  const ring = boundary.coordinates[0] ?? [];
  const open = ring.length > 1 ? ring.slice(0, -1) : ring;
  return open.map(([lng, lat]) => ({ lat, lng }));
}

function DrawingLayer({
  enabled,
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

  return null;
}

type Props = {
  projectId: string;
  workAreas: WorkArea[];
  height?: string;
};

export function ProjectWorkAreaMap({ projectId, workAreas, height = "55vh" }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const qc = useQueryClient();
  const [geometryType, setGeometryType] = useState<"polygon" | "corridor">("polygon");
  const [drawMode, setDrawMode] = useState(false);
  const [draftPaths, setDraftPaths] = useState<google.maps.LatLngLiteral[]>([]);
  const [pendingName, setPendingName] = useState("");
  const [bufferM, setBufferM] = useState("15");
  const [segmentCode, setSegmentCode] = useState("");
  const [chainageStart, setChainageStart] = useState("");
  const [chainageEnd, setChainageEnd] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const center = useMemo(() => {
    if (workAreas.length) {
      const all = workAreas.flatMap((w) => geoJsonToPaths(w.boundary));
      if (all.length) {
        return {
          lat: all.reduce((s, p) => s + p.lat, 0) / all.length,
          lng: all.reduce((s, p) => s + p.lng, 0) / all.length,
        };
      }
    }
    return DEFAULT_CENTER;
  }, [workAreas]);

  const createArea = useMutation({
    mutationFn: () => {
      const name = pendingName.trim();
      if (!name) throw new Error("Name required");
      if (geometryType === "polygon") {
        if (draftPaths.length < 3) throw new Error("Draw at least 3 points");
        return plantingProjects.createWorkArea(projectId, {
          name,
          geometry_type: "polygon",
          boundary: pathsToGeoJson(draftPaths),
          segment_code: segmentCode || undefined,
          chainage_start_km: chainageStart ? Number(chainageStart) : undefined,
          chainage_end_km: chainageEnd ? Number(chainageEnd) : undefined,
        });
      }
      if (draftPaths.length < 2) throw new Error("Draw at least 2 points for corridor");
      return plantingProjects.createWorkArea(projectId, {
        name,
        geometry_type: "corridor",
        centerline: lineToGeoJson(draftPaths),
        buffer_m: Number(bufferM) || 15,
        segment_code: segmentCode || undefined,
        chainage_start_km: chainageStart ? Number(chainageStart) : undefined,
        chainage_end_km: chainageEnd ? Number(chainageEnd) : undefined,
      });
    },
    onSuccess: async (area) => {
      setDraftPaths([]);
      setPendingName("");
      setDrawMode(false);
      setSelectedId(area.id);
      await qc.invalidateQueries({ queryKey: ["project-work-areas", projectId] });
      await qc.invalidateQueries({ queryKey: ["planting-project", projectId] });
    },
  });

  const handleAddPoint = useCallback((pt: google.maps.LatLngLiteral) => {
    setDraftPaths((prev) => [...prev, pt]);
  }, []);

  if (!apiKey) {
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-100 p-6 text-center text-sm text-stone-600">
        Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to draw work areas.
      </div>
    );
  }

  const draftAreaHa =
    geometryType === "polygon" && draftPaths.length >= 3
      ? estimatePolygonAreaHa(draftPaths)
      : 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="input w-auto text-sm"
          value={geometryType}
          onChange={(e) => {
            setGeometryType(e.target.value as "polygon" | "corridor");
            setDraftPaths([]);
          }}
        >
          <option value="polygon">Polygon (block / green belt)</option>
          <option value="corridor">Corridor (highway / canal line)</option>
        </select>
        <button
          type="button"
          className={drawMode ? "btn-primary" : "btn-secondary"}
          onClick={() => {
            setDrawMode((v) => !v);
            setDraftPaths([]);
          }}
        >
          {drawMode ? "Click map to add points" : "Draw work area"}
        </button>
        {drawMode && (
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
        )}
        {geometryType === "polygon" && draftPaths.length >= 2 && (
          <span className="text-xs text-stone-600">
            {draftPaths.length} pts · {formatAreaHa(draftAreaHa)}
          </span>
        )}
        {geometryType === "corridor" && draftPaths.length >= 1 && (
          <span className="text-xs text-stone-600">{draftPaths.length} line points</span>
        )}
      </div>

      {(drawMode && draftPaths.length >= (geometryType === "polygon" ? 3 : 2)) ||
      (!drawMode && draftPaths.length >= (geometryType === "polygon" ? 3 : 2)) ? (
        <div className="card grid gap-3 md:grid-cols-2">
          <div>
            <label className="kpi-label">Work area name</label>
            <input
              className="input mt-1"
              placeholder="e.g. NH-44 LHS km 12–18"
              value={pendingName}
              onChange={(e) => setPendingName(e.target.value)}
            />
          </div>
          <div>
            <label className="kpi-label">Segment code (optional)</label>
            <input
              className="input mt-1"
              placeholder="LHS / Block-A"
              value={segmentCode}
              onChange={(e) => setSegmentCode(e.target.value)}
            />
          </div>
          {geometryType === "corridor" && (
            <div>
              <label className="kpi-label">Buffer each side (m)</label>
              <input
                className="input mt-1"
                type="number"
                min={1}
                max={500}
                value={bufferM}
                onChange={(e) => setBufferM(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="kpi-label">Chainage start (km)</label>
            <input
              className="input mt-1"
              placeholder="12.000"
              value={chainageStart}
              onChange={(e) => setChainageStart(e.target.value)}
            />
          </div>
          <div>
            <label className="kpi-label">Chainage end (km)</label>
            <input
              className="input mt-1"
              placeholder="18.500"
              value={chainageEnd}
              onChange={(e) => setChainageEnd(e.target.value)}
            />
          </div>
          <div className="flex items-end md:col-span-2">
            <button
              type="button"
              className="btn-primary"
              disabled={!pendingName.trim() || createArea.isPending}
              onClick={() => createArea.mutate()}
            >
              {createArea.isPending ? "Saving…" : "Save work area"}
            </button>
          </div>
          {createArea.error && (
            <p className="text-sm text-rose-700 md:col-span-2">{errorMessage(createArea.error)}</p>
          )}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-stone-200" style={{ height }}>
        <APIProvider apiKey={apiKey}>
          <Map
            defaultCenter={center}
            defaultZoom={13}
            mapTypeId="satellite"
            gestureHandling="greedy"
            style={{ width: "100%", height: "100%" }}
          >
            <DrawingLayer enabled={drawMode} draftPaths={draftPaths} onAddPoint={handleAddPoint} />

            {draftPaths.length > 0 && geometryType === "polygon" && (
              <Polygon
                paths={draftPaths}
                fillColor="#16a34a"
                fillOpacity={0.2}
                strokeColor="#15803d"
                strokeWeight={2}
              />
            )}
            {draftPaths.length > 0 && geometryType === "corridor" && (
              <Polyline path={draftPaths} strokeColor="#15803d" strokeWeight={3} />
            )}

            {workAreas.map((area) => {
              const paths = geoJsonToPaths(area.boundary);
              const active = area.id === selectedId;
              return (
                <Polygon
                  key={area.id}
                  paths={paths}
                  fillColor={active ? "#16a34a" : "#22c55e"}
                  fillOpacity={active ? 0.35 : 0.2}
                  strokeColor={active ? "#14532d" : "#15803d"}
                  strokeWeight={active ? 3 : 2}
                  onClick={() => setSelectedId(area.id)}
                />
              );
            })}
          </Map>
        </APIProvider>
      </div>

      {workAreas.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {workAreas.map((area) => (
            <li
              key={area.id}
              className={`rounded-lg border p-3 text-sm ${
                selectedId === area.id ? "border-forest-500 bg-forest-50" : "border-stone-200"
              }`}
            >
              <button type="button" className="w-full text-left" onClick={() => setSelectedId(area.id)}>
                <div className="font-medium">{area.name}</div>
                <div className="text-xs text-stone-500">
                  {area.geometry_type} · {area.area_ha != null ? formatAreaHa(area.area_ha) : "—"} ·{" "}
                  {area.tree_count} trees
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
