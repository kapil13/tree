"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Props = {
  treeId: string;
  ndvi?: number;
  className?: string;
};

/** Fetches authenticated NDVI PNG from the API and displays it. */
export function NdviImagePreview({ treeId, ndvi, className = "" }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      try {
        const res = await api.get(`/v1/satellite/ndvi-image/${treeId}`, {
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
  }, [treeId]);

  if (error) {
    return (
      <div className={`rounded-lg bg-stone-100 p-4 text-sm text-stone-500 ${className}`}>
        NDVI image unavailable
      </div>
    );
  }

  if (!src) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg bg-stone-100 text-sm text-stone-500 ${className}`}
        style={{ minHeight: 200 }}
      >
        Loading NDVI…
      </div>
    );
  }

  return (
    <figure className={className}>
      <img
        src={src}
        alt="NDVI false-color map around tree"
        className="w-full rounded-lg border border-stone-200"
      />
      {ndvi != null && (
        <figcaption className="mt-2 text-xs text-stone-500">
          False-color NDVI (brown = bare soil, green = healthy vegetation). Mean NDVI:{" "}
          <strong>{ndvi.toFixed(2)}</strong>
        </figcaption>
      )}
    </figure>
  );
}
