"use client";

import { useEffect } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import type { MapLatLng } from "@/lib/map-defaults";

export function MapViewportController({
  center,
  zoom,
  panKey,
}: {
  center: MapLatLng;
  zoom: number;
  /** Increment to force pan even when center unchanged (e.g. repeat "my location"). */
  panKey?: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    map.panTo(center);
    map.setZoom(zoom);
  }, [map, center.lat, center.lng, zoom, panKey]);

  return null;
}
