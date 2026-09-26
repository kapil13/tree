export type TreePresence = "present" | "absent" | "sparse" | "not_assessable";

export const TREE_PRESENCE_OPTIONS: { value: TreePresence; labelKey: string }[] = [
  { value: "present", labelKey: "treePresencePresent" },
  { value: "absent", labelKey: "treePresenceAbsent" },
  { value: "sparse", labelKey: "treePresenceSparse" },
  { value: "not_assessable", labelKey: "treePresenceNotAssessable" },
];

export type AuditBoundary = {
  id: string;
  name: string;
  boundary: { type: "Polygon"; coordinates: number[][][] };
};

export type AuditSamplingPlot = {
  id: string;
  plot_code: string;
  boundary_version_id?: string;
  boundary_name?: string | null;
  risk_level: string;
  priority_rank: number;
  status: string;
  center?: { coordinates: [number, number] };
  latest_visit?: {
    verification_outcome: string;
    tree_presence?: string | null;
    trees_observed?: number | null;
    visited_at: string;
    location_warnings?: string[];
  } | null;
};

export function plotLatLng(plot: AuditSamplingPlot): { lat: number; lng: number } | null {
  const coords = plot.center?.coordinates;
  if (!coords || coords.length < 2) return null;
  return { lng: coords[0], lat: coords[1] };
}

export function openInMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function mapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function geoJsonRingToPaths(
  boundary: { coordinates: number[][][] },
): google.maps.LatLngLiteral[] {
  const ring = boundary.coordinates[0] ?? [];
  const open = ring.length > 1 ? ring.slice(0, -1) : ring;
  return open.map(([lng, lat]) => ({ lat, lng }));
}

export function captureBrowserLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("geolocation_unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}
