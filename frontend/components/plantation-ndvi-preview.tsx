"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";

type Props = {
  fenceId: string;
  ndvi?: number;
  className?: string;
  refreshKey?: number;
};

/** Fetches authenticated plantation NDVI PNG for a fenced area. */
export function PlantationNdviPreview({ fenceId, ndvi, className = "", refreshKey = 0 }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setSrc(null);
    setError(null);

    (async () => {
      try {
        const res = await api.get(`/v1/plantation-fences/${fenceId}/ndvi-image`, {
          responseType: "blob",
        });
        if (cancelled) return;
        if (!res.data?.type?.startsWith("image/")) {
          setError("Server did not return an image — check backend logs");
          return;
        }
        objectUrl = URL.createObjectURL(res.data);
        setSrc(objectUrl);
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fenceId, refreshKey]);

  if (error) {
    return (
      <div className={`rounded-lg bg-stone-100 p-4 text-sm text-stone-600 ${className}`}>
        <p className="font-medium text-stone-700">NDVI image unavailable</p>
        <p className="mt-1">{error}</p>
        <p className="mt-2 text-xs text-stone-500">
          Try <strong>Rescan NDVI</strong>. For live Sentinel-2, set Copernicus credentials in{" "}
          <code className="font-mono">backend/.env</code> and restart the backend.
        </p>
      </div>
    );
  }

  if (!src) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg bg-stone-100 text-sm text-stone-500 ${className}`}
        style={{ minHeight: 160 }}
      >
        Loading NDVI…
      </div>
    );
  }

  return (
    <figure className={className}>
      <img
        src={src}
        alt="NDVI false-color map for plantation fence"
        className="w-full rounded-lg border border-stone-200"
      />
      {ndvi != null && (
        <figcaption className="mt-2 text-xs text-stone-500">
          Sentinel-2 NDVI (10 m). Mean: <strong>{ndvi.toFixed(2)}</strong>
        </figcaption>
      )}
    </figure>
  );
}
