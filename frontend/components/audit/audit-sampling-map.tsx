"use client";

import { useMemo } from "react";
import { APIProvider, Map, Marker, Polygon } from "@vis.gl/react-google-maps";
import {
  type AuditBoundary,
  type AuditSamplingPlot,
  geoJsonRingToPaths,
  plotLatLng,
} from "@/lib/audit-field-visit";
import { FALLBACK_MAP_CENTER } from "@/lib/map-defaults";

function plotMarkerIcon(visited: boolean): string {
  const color = visited ? "#16a34a" : "#ea580c";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28">
    <circle cx="14" cy="14" r="11" fill="${color}" stroke="white" stroke-width="2"/>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function AuditSamplingMap({
  boundaries,
  plots,
  height = "320px",
}: {
  boundaries: AuditBoundary[];
  plots: AuditSamplingPlot[];
  height?: string;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const boundaryPaths = useMemo(
    () =>
      boundaries.map((b) => ({
        id: b.id,
        name: b.name,
        paths: geoJsonRingToPaths(b.boundary),
      })),
    [boundaries],
  );

  const plotMarkers = useMemo(
    () =>
      plots
        .map((plot) => {
          const pos = plotLatLng(plot);
          if (!pos) return null;
          return {
            plot,
            position: pos,
            visited: plot.status === "visited",
          };
        })
        .filter(Boolean) as Array<{
        plot: AuditSamplingPlot;
        position: { lat: number; lng: number };
        visited: boolean;
      }>,
    [plots],
  );

  const center = useMemo(() => {
    const points = [
      ...boundaryPaths.flatMap((b) => b.paths),
      ...plotMarkers.map((m) => m.position),
    ];
    if (points.length === 0) return FALLBACK_MAP_CENTER;
    const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
    const lng = points.reduce((s, p) => s + p.lng, 0) / points.length;
    return { lat, lng };
  }, [boundaryPaths, plotMarkers]);

  if (!apiKey) {
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
        Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to view sample plots on the audit boundary map.
      </div>
    );
  }

  if (plots.length === 0) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200" style={{ height }}>
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={center}
          defaultZoom={12}
          mapTypeId="satellite"
          gestureHandling="greedy"
          disableDefaultUI
          style={{ width: "100%", height: "100%" }}
        >
          {boundaryPaths.map((b) =>
            b.paths.length > 0 ? (
              <Polygon
                key={b.id}
                paths={b.paths}
                fillColor="#22c55e"
                fillOpacity={0.08}
                strokeColor="#15803d"
                strokeWeight={2}
              />
            ) : null,
          )}
          {plotMarkers.map(({ plot, position, visited }) => (
            <Marker
              key={plot.id}
              position={position}
              title={`${plot.plot_code} (${visited ? "visited" : "due"})`}
              icon={plotMarkerIcon(visited)}
            />
          ))}
        </Map>
      </APIProvider>
    </div>
  );
}
