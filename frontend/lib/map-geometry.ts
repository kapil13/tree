/** Map viewport helpers for polygon boundaries (work areas / plantation fences). */

import type { MapLatLng } from "@/lib/map-defaults";

export type GeoJsonPolygon = {
  type: "Polygon";
  coordinates: number[][][];
};

export function geoJsonToPaths(boundary: GeoJsonPolygon): MapLatLng[] {
  const ring = boundary.coordinates[0] ?? [];
  const open = ring.length > 1 ? ring.slice(0, -1) : ring;
  return open.map(([lng, lat]) => ({ lat, lng }));
}

export function centroidFromPaths(paths: MapLatLng[]): MapLatLng | null {
  if (!paths.length) return null;
  return {
    lat: paths.reduce((s, p) => s + p.lat, 0) / paths.length,
    lng: paths.reduce((s, p) => s + p.lng, 0) / paths.length,
  };
}

/** Approximate Google Maps zoom to fit a polygon bounding box. */
export function zoomForPaths(paths: MapLatLng[]): number {
  if (!paths.length) return 13;
  const lats = paths.map((p) => p.lat);
  const lngs = paths.map((p) => p.lng);
  const latSpan = Math.max(0.002, Math.max(...lats) - Math.min(...lats));
  const lngSpan = Math.max(0.002, Math.max(...lngs) - Math.min(...lngs));
  const span = Math.max(latSpan, lngSpan);
  if (span > 2) return 8;
  if (span > 1) return 9;
  if (span > 0.5) return 10;
  if (span > 0.25) return 11;
  if (span > 0.12) return 12;
  if (span > 0.06) return 13;
  if (span > 0.03) return 14;
  if (span > 0.015) return 15;
  return 16;
}

export function daysSinceIso(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}
