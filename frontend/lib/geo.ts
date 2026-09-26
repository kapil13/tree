/** Rough geodesic polygon area (hectares) for map-drawn fences. */

export type LatLng = { lat: number; lng: number };

export function estimatePolygonAreaHa(points: LatLng[]): number {
  if (points.length < 3) return 0;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6_371_000;
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const lat1 = toRad(points[i].lat);
    const lat2 = toRad(points[j].lat);
    const dLng = toRad(points[j].lng - points[i].lng);
    total += dLng * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  return Math.abs((total * R * R) / 2) / 10_000;
}

export function polygonBBoxKm(points: LatLng[]): { widthKm: number; heightKm: number } {
  if (!points.length) return { widthKm: 0, heightKm: 0 };
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const midLat = (minLat + maxLat) / 2;
  const cosLat = Math.max(0.1, Math.cos((midLat * Math.PI) / 180));
  const heightKm = ((maxLat - minLat) * Math.PI) / 180 * 6371;
  const widthKm = ((maxLng - minLng) * Math.PI) / 180 * 6371 * cosLat;
  return { widthKm: Math.abs(widthKm), heightKm: Math.abs(heightKm) };
}

export function formatAreaHa(ha: number): string {
  if (ha < 1) return `${(ha * 10_000).toFixed(0)} m²`;
  if (ha < 100) return `${ha.toFixed(2)} ha`;
  if (ha < 10_000) return `${ha.toFixed(1)} ha (${(ha / 100).toFixed(2)} km²)`;
  return `${ha.toFixed(0)} ha (${(ha / 100).toFixed(1)} km²)`;
}

/** Recommended max for Sentinel NDVI chip quality (guidance, not hard science). */
export const FENCE_AREA_WARN_HA = 500;
export const FENCE_AREA_MAX_HA = 5000;
