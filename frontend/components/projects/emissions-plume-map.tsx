"use client";

import { useMemo } from "react";
import { APIProvider, Map, Marker, Polygon, Polyline } from "@vis.gl/react-google-maps";
import type { DispersionRunResult, EmissionSource, WorkArea } from "@/lib/api";

const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };

function geoJsonRingToPaths(boundary: { coordinates: number[][][] }): google.maps.LatLngLiteral[] {
  const ring = boundary.coordinates[0] ?? [];
  const open = ring.length > 1 ? ring.slice(0, -1) : ring;
  return open.map(([lng, lat]) => ({ lat, lng }));
}

function featureCollectionPaths(
  fc: Record<string, unknown> | undefined,
  kind: string,
): google.maps.LatLngLiteral[][] {
  if (!fc || fc.type !== "FeatureCollection" || !Array.isArray(fc.features)) return [];
  const paths: google.maps.LatLngLiteral[][] = [];
  for (const feature of fc.features as Array<Record<string, unknown>>) {
    const props = (feature.properties ?? {}) as Record<string, unknown>;
    if (props.kind !== kind) continue;
    const geom = feature.geometry as { type?: string; coordinates?: unknown };
    if (geom?.type === "Polygon" && Array.isArray(geom.coordinates)) {
      const ring = (geom.coordinates as number[][][])[0] ?? [];
      paths.push(ring.map(([lng, lat]) => ({ lat, lng })));
    }
  }
  return paths;
}

function contourPaths(plume: DispersionRunResult | null): google.maps.LatLngLiteral[][] {
  if (!plume?.contours?.length) return [];
  return plume.contours
    .map((c) => {
      const geom = c.geojson?.geometry as { coordinates?: number[][][] } | undefined;
      const ring = geom?.coordinates?.[0] ?? [];
      return ring.map(([lng, lat]) => ({ lat, lng }));
    })
    .filter((p) => p.length > 0);
}

function downwindAxis(plume: DispersionRunResult | null): google.maps.LatLngLiteral[] {
  const fc = plume?.downwind_impact;
  if (!fc || fc.type !== "FeatureCollection" || !Array.isArray(fc.features)) return [];
  for (const feature of fc.features as Array<Record<string, unknown>>) {
    const props = (feature.properties ?? {}) as Record<string, unknown>;
    if (props.kind !== "downwind_axis") continue;
    const geom = feature.geometry as { coordinates?: number[][] };
    const coords = geom?.coordinates ?? [];
    return coords.map(([lng, lat]) => ({ lat, lng }));
  }
  return [];
}

function sourceMarkers(
  plume: DispersionRunResult | null,
  sources: EmissionSource[],
): google.maps.LatLngLiteral[] {
  const fromPlume = featureCollectionPaths(plume?.inside_boundary, "source");
  if (fromPlume.length > 0) {
    return fromPlume.map((ring) => ring[0]).filter(Boolean);
  }
  return sources
    .filter((s) => s.geometry?.type === "Point" && Array.isArray(s.geometry.coordinates))
    .map((s) => {
      const [lng, lat] = s.geometry.coordinates as number[];
      return { lat, lng };
    });
}

export function EmissionsPlumeMap({
  workArea,
  sources,
  plume,
  roiGeojson,
  height = "360px",
}: {
  workArea: WorkArea;
  sources: EmissionSource[];
  plume: DispersionRunResult | null;
  roiGeojson?: Record<string, unknown> | null;
  height?: string;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const center = useMemo(() => {
    const paths = geoJsonRingToPaths(workArea.boundary);
    if (paths.length === 0) return DEFAULT_CENTER;
    const lat = paths.reduce((s, p) => s + p.lat, 0) / paths.length;
    const lng = paths.reduce((s, p) => s + p.lng, 0) / paths.length;
    return { lat, lng };
  }, [workArea.boundary]);

  const workAreaPaths = useMemo(() => geoJsonRingToPaths(workArea.boundary), [workArea.boundary]);
  const roiPaths = useMemo(() => {
    if (!roiGeojson || roiGeojson.type !== "Polygon") return [];
    return geoJsonRingToPaths(roiGeojson as WorkArea["boundary"]);
  }, [roiGeojson]);
  const plumeContours = useMemo(() => contourPaths(plume), [plume]);
  const axis = useMemo(() => downwindAxis(plume), [plume]);
  const markers = useMemo(() => sourceMarkers(plume, sources), [plume, sources]);

  if (!apiKey) {
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
        Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to view the plume map overlay.
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        defaultCenter={center}
        defaultZoom={11}
        mapTypeId="satellite"
        gestureHandling="greedy"
        disableDefaultUI
        style={{ width: "100%", height, borderRadius: "0.75rem" }}
      >
        {roiPaths.length > 0 ? (
          <Polygon
            paths={roiPaths}
            fillColor="#3b82f6"
            fillOpacity={0.08}
            strokeColor="#2563eb"
            strokeWeight={1}
            strokeOpacity={0.7}
          />
        ) : null}
        <Polygon
          paths={workAreaPaths}
          fillColor="#16a34a"
          fillOpacity={0.25}
          strokeColor="#15803d"
          strokeWeight={2}
        />
        {plumeContours.map((paths, idx) => (
          <Polygon
            key={`contour-${idx}`}
            paths={paths}
            fillColor="#f97316"
            fillOpacity={0.18}
            strokeColor="#ea580c"
            strokeWeight={1}
          />
        ))}
        {axis.length >= 2 ? (
          <Polyline path={axis} strokeColor="#fbbf24" strokeWeight={3} strokeOpacity={0.9} />
        ) : null}
        {markers.map((pos, idx) => (
          <Marker key={`src-${idx}`} position={pos} />
        ))}
      </Map>
    </APIProvider>
  );
}
