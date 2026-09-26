"use client";

import { useCallback, useState } from "react";
import type { MapLatLng } from "@/lib/map-defaults";

type GeolocationResult = {
  center: MapLatLng;
  accuracyM?: number;
};

export function useMapGeolocation() {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locate = useCallback((): Promise<GeolocationResult | null> => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Geolocation is not supported in this browser.");
      return Promise.resolve(null);
    }

    setLocating(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocating(false);
          resolve({
            center: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            },
            accuracyM: position.coords.accuracy,
          });
        },
        () => {
          setLocating(false);
          setError("Could not read your location. Allow location access or search for a place.");
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60_000 },
      );
    });
  }, []);

  return { locate, locating, error, clearError: () => setError(null) };
}
