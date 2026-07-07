"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Props = {
  fenceId: string;
  ndvi?: number;
  className?: string;
};

/** Fetches authenticated plantation NDVI PNG for a fenced area. */
export function PlantationNdviPreview({ fenceId, ndvi, className = "" }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      try {
        const res = await api.get(`/v1/plantation-fences/${fenceId}/ndvi-image`, {
          responseType: "blob",
        });
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data);
        setSrc(objectUrl);
        setError(false);
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fenceId]);

  if (error) {
    return (
      <div className={`rounded-lg bg-stone-100 p-4 text-sm text-stone-500 ${className}`}>
        NDVI image unavailable — run a scan or check Copernicus credentials
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
