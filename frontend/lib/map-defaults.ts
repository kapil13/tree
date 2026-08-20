/** Shared map defaults for web map components. */

export type MapLatLng = { lat: number; lng: number };

/** India centroid — used when GPS is unavailable and no features exist yet. */
export const FALLBACK_MAP_CENTER: MapLatLng = { lat: 20.5937, lng: 78.9629 };

export const DEFAULT_MAP_ZOOM = 13;
export const LOCATION_MAP_ZOOM = 15;
