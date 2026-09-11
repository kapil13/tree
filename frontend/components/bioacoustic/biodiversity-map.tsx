"use client";

import { useMemo } from "react";
import { APIProvider, Map, Marker, Polygon } from "@vis.gl/react-google-maps";
import { geoJsonRingToPaths } from "@/lib/audit-field-visit";
import { FALLBACK_MAP_CENTER } from "@/lib/map-defaults";

type GeoFeature = {
  type: "Feature";
  geometry: { type: string; coordinates: number[] | number[][][] };
  properties: Record<string, unknown>;
};

export type BiodiversityMapLayer = {
  type: "FeatureCollection";
  features: GeoFeature[];
};

const TIER_COLORS: Record<string, string> = {
  accepted: "#15803d",
  probable: "#b45309",
  review_required: "#b91c1c",
  mixed: "#78716c",
  pending: "#a8a29e",
};

function tierMarkerIcon(color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">
    <circle cx="12" cy="12" r="9" fill="${color}" stroke="white" stroke-width="2"/>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function BiodiversityMap({
  layer,
  height = "320px",
}: {
  layer: BiodiversityMapLayer | undefined;
  height?: string;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const { boundaries, points, center } = useMemo(() => {
    const features = layer?.features ?? [];
    const boundaryFeatures = features.filter((f) => f.properties.kind === "fence_boundary");
    const pointFeatures = features.filter((f) => f.properties.kind === "recording");

    const boundaries = boundaryFeatures.map((f) => {
      const geom = f.geometry as { type: "Polygon"; coordinates: number[][][] };
      return {
        id: String(f.properties.fence_id ?? ""),
        name: String(f.properties.fence_name ?? "Site"),
        paths: geoJsonRingToPaths(geom),
      };
    });

    const points = pointFeatures.map((f) => {
      const coords = f.geometry.coordinates as number[];
      const tier = String(f.properties.dominant_tier ?? "pending");
      const color = TIER_COLORS[tier] ?? TIER_COLORS.pending;
      return {
        id: String(f.properties.recording_id ?? ""),
        position: { lat: coords[1], lng: coords[0] },
        tier,
        color,
        confidence: f.properties.biodiversity_confidence_score as number | null,
        status: String(f.properties.status ?? ""),
      };
    });

    const allCoords = [
      ...boundaries.flatMap((b) => b.paths),
      ...points.map((p) => p.position),
    ];
    const center =
      allCoords.length > 0
        ? {
            lat: allCoords.reduce((s, p) => s + p.lat, 0) / allCoords.length,
            lng: allCoords.reduce((s, p) => s + p.lng, 0) / allCoords.length,
          }
        : FALLBACK_MAP_CENTER;

    return { boundaries, points, center };
  }, [layer]);

  if (!apiKey) {
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
        Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to view recording points and site boundaries.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200" style={{ height }}>
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={center}
          defaultZoom={14}
          mapTypeId="satellite"
          gestureHandling="greedy"
          disableDefaultUI
          style={{ width: "100%", height: "100%" }}
        >
          {boundaries.map((b) =>
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
          {points.map((p) => (
            <Marker
              key={p.id}
              position={p.position}
              title={`${p.tier} · ${p.status}${p.confidence != null ? ` · ${Math.round(p.confidence)}` : ""}`}
              icon={tierMarkerIcon(p.color)}
            />
          ))}
        </Map>
      </APIProvider>
      <div className="border-t border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-600">
        {points.length} recording point{points.length === 1 ? "" : "s"} · tier colors: accepted (green),
        probable (amber), review required (red)
      </div>
    </div>
  );
}
