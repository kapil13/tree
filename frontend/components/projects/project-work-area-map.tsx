"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Undo2 } from "lucide-react";
import {
  APIProvider,
  Map,
  Polygon,
  Polyline,
  useMap,
} from "@vis.gl/react-google-maps";
import { MapLocationSearch } from "@/components/map/map-location-search";
import { MapViewportController } from "@/components/map/map-viewport-controller";
import {
  errorMessage,
  plantingProjects,
  type GeoJsonLineString,
  type GeoJsonPolygon,
  type WorkArea,
} from "@/lib/api";
import { estimatePolygonAreaHa, formatAreaHa } from "@/lib/geo";
import {
  DEFAULT_MAP_ZOOM,
  FALLBACK_MAP_CENTER,
  LOCATION_MAP_ZOOM,
  type MapLatLng,
} from "@/lib/map-defaults";
import { useMapGeolocation } from "@/lib/use-map-geolocation";

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

function lineGeoJsonToPaths(line: GeoJsonLineString): google.maps.LatLngLiteral[] {
  return line.coordinates.map(([lng, lat]) => ({ lat, lng }));
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
  /** Start in draw mode (e.g. after creating a project). */
  autoDraw?: boolean;
  /** Default geometry when no work areas exist yet. */
  defaultGeometryType?: "polygon" | "corridor";
};

export function ProjectWorkAreaMap({
  projectId,
  workAreas,
  height = "55vh",
  autoDraw = false,
  defaultGeometryType = "polygon",
}: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const qc = useQueryClient();
  const { locate, locating, error: locationError, clearError } = useMapGeolocation();

  const [geometryType, setGeometryType] = useState<"polygon" | "corridor">(defaultGeometryType);
  const [drawMode, setDrawMode] = useState(autoDraw);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftPaths, setDraftPaths] = useState<google.maps.LatLngLiteral[]>([]);
  const [pendingName, setPendingName] = useState("");
  const [bufferM, setBufferM] = useState("15");
  const [segmentCode, setSegmentCode] = useState("");
  const [chainageStart, setChainageStart] = useState("");
  const [chainageEnd, setChainageEnd] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<MapLatLng>(FALLBACK_MAP_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_MAP_ZOOM);
  const [panKey, setPanKey] = useState(0);
  const [geoInitialized, setGeoInitialized] = useState(false);

  const selectedArea = workAreas.find((a) => a.id === selectedId) ?? null;
  const isEditing = Boolean(editingId);

  const workAreaCenter = useMemo(() => {
    if (!workAreas.length) return null;
    const all = workAreas.flatMap((w) => geoJsonToPaths(w.boundary));
    if (!all.length) return null;
    return {
      lat: all.reduce((s, p) => s + p.lat, 0) / all.length,
      lng: all.reduce((s, p) => s + p.lng, 0) / all.length,
    };
  }, [workAreas]);

  useEffect(() => {
    if (workAreaCenter) {
      setMapCenter(workAreaCenter);
      setMapZoom(DEFAULT_MAP_ZOOM);
    }
  }, [workAreaCenter]);

  useEffect(() => {
    if (workAreas.length || geoInitialized) return;
    let cancelled = false;
    void (async () => {
      const result = await locate();
      if (cancelled) return;
      if (result) {
        setMapCenter(result.center);
        setMapZoom(LOCATION_MAP_ZOOM);
        setPanKey((k) => k + 1);
      }
      setGeoInitialized(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [workAreas.length, geoInitialized, locate]);

  useEffect(() => {
    if (autoDraw) setDrawMode(true);
  }, [autoDraw]);

  const goToLocation = useCallback((center: MapLatLng) => {
    clearError();
    setMapCenter(center);
    setMapZoom(LOCATION_MAP_ZOOM);
    setPanKey((k) => k + 1);
  }, [clearError]);

  const handleLocate = useCallback(async () => {
    const result = await locate();
    if (result) goToLocation(result.center);
  }, [locate, goToLocation]);

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["project-work-areas", projectId] });
    await qc.invalidateQueries({ queryKey: ["planting-project", projectId] });
  };

  const resetForm = () => {
    setDraftPaths([]);
    setPendingName("");
    setSegmentCode("");
    setChainageStart("");
    setChainageEnd("");
    setBufferM("15");
    setDrawMode(false);
    setEditingId(null);
    setFormError(null);
  };

  const minPoints = geometryType === "polygon" ? 3 : 2;

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
      resetForm();
      setSelectedId(area.id);
      await invalidate();
    },
    onError: (err) => setFormError(errorMessage(err)),
  });

  const updateArea = useMutation({
    mutationFn: () => {
      if (!editingId) throw new Error("No work area selected");
      const name = pendingName.trim();
      if (!name) throw new Error("Name required");
      const payload: Parameters<typeof plantingProjects.updateWorkArea>[2] = {
        name,
        segment_code: segmentCode || undefined,
        chainage_start_km: chainageStart ? Number(chainageStart) : undefined,
        chainage_end_km: chainageEnd ? Number(chainageEnd) : undefined,
      };
      if (draftPaths.length >= minPoints) {
        payload.geometry_type = geometryType;
        if (geometryType === "polygon") {
          payload.boundary = pathsToGeoJson(draftPaths);
        } else {
          payload.centerline = lineToGeoJson(draftPaths);
          payload.buffer_m = Number(bufferM) || 15;
        }
      }
      return plantingProjects.updateWorkArea(projectId, editingId, payload);
    },
    onSuccess: async (area) => {
      resetForm();
      setSelectedId(area.id);
      await invalidate();
    },
    onError: (err) => setFormError(errorMessage(err)),
  });

  const deleteArea = useMutation({
    mutationFn: (workAreaId: string) => plantingProjects.deleteWorkArea(projectId, workAreaId),
    onSuccess: async () => {
      resetForm();
      setSelectedId(null);
      await invalidate();
    },
    onError: (err) => setFormError(errorMessage(err)),
  });

  const handleAddPoint = useCallback((pt: google.maps.LatLngLiteral) => {
    setDraftPaths((prev) => [...prev, pt]);
  }, []);

  function startEdit(area: WorkArea) {
    setEditingId(area.id);
    setSelectedId(area.id);
    setGeometryType(area.geometry_type === "corridor" ? "corridor" : "polygon");
    setPendingName(area.name);
    setSegmentCode(area.segment_code || "");
    setChainageStart(area.chainage_start_km != null ? String(area.chainage_start_km) : "");
    setChainageEnd(area.chainage_end_km != null ? String(area.chainage_end_km) : "");
    setBufferM(area.buffer_m != null ? String(area.buffer_m) : "15");
    if (area.geometry_type === "corridor" && area.centerline) {
      setDraftPaths(lineGeoJsonToPaths(area.centerline));
    } else {
      setDraftPaths(geoJsonToPaths(area.boundary));
    }
    setDrawMode(false);
    setFormError(null);
  }

  function startRedraw() {
    setDrawMode(true);
    setDraftPaths([]);
    setFormError(null);
  }

  function undoLastPoint() {
    setDraftPaths((prev) => prev.slice(0, -1));
  }

  function finishDrawing() {
    if (draftPaths.length < minPoints) return;
    setDrawMode(false);
  }

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

  const showSaveForm =
    (!drawMode && draftPaths.length >= minPoints) ||
    (isEditing && pendingName.trim());

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {!isEditing ? (
          <>
            <select
              className="input w-auto text-sm"
              value={geometryType}
              onChange={(e) => {
                setGeometryType(e.target.value as "polygon" | "corridor");
                setDraftPaths([]);
              }}
              disabled={drawMode}
            >
              <option value="polygon">Polygon (block / green belt)</option>
              <option value="corridor">Corridor (highway / canal line)</option>
            </select>
            <button
              type="button"
              className={drawMode ? "btn-primary" : "btn-secondary"}
              onClick={() => {
                if (drawMode) {
                  setDrawMode(false);
                  setDraftPaths([]);
                  setEditingId(null);
                } else {
                  setDrawMode(true);
                  setDraftPaths([]);
                  setEditingId(null);
                }
              }}
            >
              {drawMode ? "Click map to add points" : "Draw work area"}
            </button>
          </>
        ) : (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
            Editing: {pendingName}
          </span>
        )}
        {drawMode && (
          <>
            <button
              type="button"
              className="btn-secondary"
              disabled={draftPaths.length < minPoints}
              onClick={finishDrawing}
            >
              {geometryType === "polygon"
                ? `Finish polygon (${draftPaths.length} pts)`
                : `Finish line (${draftPaths.length} pts)`}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={draftPaths.length === 0}
              onClick={undoLastPoint}
              title="Undo last point"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Undo
            </button>
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Cancel
            </button>
          </>
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

      {selectedArea && !drawMode && !isEditing && (
        <div className="card flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">{selectedArea.name}</p>
            <p className="text-xs text-stone-500">
              {selectedArea.geometry_type} ·{" "}
              {selectedArea.area_ha != null ? formatAreaHa(selectedArea.area_ha) : "—"} ·{" "}
              {selectedArea.tree_count} trees
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary text-xs" onClick={() => startEdit(selectedArea)}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
            {selectedArea.tree_count === 0 && (
              <button
                type="button"
                className="btn-secondary text-xs text-rose-700"
                disabled={deleteArea.isPending}
                onClick={() => {
                  if (window.confirm(`Delete work area "${selectedArea.name}"?`)) {
                    deleteArea.mutate(selectedArea.id);
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            )}
          </div>
        </div>
      )}

      {showSaveForm && (
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
          {isEditing && (
            <div className="flex items-end md:col-span-2">
              <button type="button" className="btn-secondary" onClick={startRedraw}>
                Redraw boundary on map
              </button>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 md:col-span-2">
            <button
              type="button"
              className="btn-primary"
              disabled={!pendingName.trim() || createArea.isPending || updateArea.isPending}
              onClick={() => (isEditing ? updateArea.mutate() : createArea.mutate())}
            >
              {createArea.isPending || updateArea.isPending
                ? "Saving…"
                : isEditing
                  ? "Save changes"
                  : "Save work area"}
            </button>
            {isEditing && (
              <button type="button" className="btn-secondary" onClick={resetForm}>
                Cancel edit
              </button>
            )}
            {!isEditing && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setDraftPaths([]);
                  setDrawMode(true);
                }}
              >
                Redraw
              </button>
            )}
          </div>
          {formError && <p className="text-sm text-rose-700 md:col-span-2">{formError}</p>}
        </div>
      )}

      <div className="relative overflow-hidden rounded-xl border border-stone-200" style={{ height }}>
        <APIProvider apiKey={apiKey}>
          <Map
            defaultCenter={mapCenter}
            defaultZoom={mapZoom}
            mapTypeId="satellite"
            gestureHandling="greedy"
            style={{ width: "100%", height: "100%" }}
          >
            <MapViewportController center={mapCenter} zoom={mapZoom} panKey={panKey} />
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
              const centerlinePaths =
                area.geometry_type === "corridor" && area.centerline
                  ? lineGeoJsonToPaths(area.centerline)
                  : null;
              return (
                <span key={area.id}>
                  <Polygon
                    paths={paths}
                    fillColor={active ? "#16a34a" : "#22c55e"}
                    fillOpacity={active ? 0.35 : 0.2}
                    strokeColor={active ? "#14532d" : "#15803d"}
                    strokeWeight={active ? 3 : 2}
                    onClick={() => {
                      setSelectedId(area.id);
                      if (!isEditing) setFormError(null);
                    }}
                  />
                  {centerlinePaths && (
                    <Polyline
                      path={centerlinePaths}
                      strokeColor={active ? "#f59e0b" : "#d97706"}
                      strokeWeight={active ? 4 : 2}
                    />
                  )}
                </span>
              );
            })}
          </Map>
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-3">
            <MapLocationSearch
              onSelect={goToLocation}
              onLocate={handleLocate}
              locating={locating}
              locationError={locationError}
            />
          </div>
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
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setSelectedId(area.id)}
              >
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
