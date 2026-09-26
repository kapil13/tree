"use client";

import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";
import { trees } from "@/lib/api";

type TreePhotoProps = {
  treeId: string;
  imageId: string;
  alt: string;
  className?: string;
};

export function TreePhoto({ treeId, imageId, alt, className = "" }: TreePhotoProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      try {
        objectUrl = await trees.imageBlobUrl(treeId, imageId);
        if (!cancelled) {
          setSrc(objectUrl);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [treeId, imageId]);

  if (error) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 bg-stone-100 text-stone-500 ${className}`}
      >
        <ImageIcon className="h-8 w-8" />
        <span className="text-xs">Photo unavailable</span>
      </div>
    );
  }

  if (!src) {
    return <div className={`animate-pulse bg-stone-200 ${className}`} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  );
}
