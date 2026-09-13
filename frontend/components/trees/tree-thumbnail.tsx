"use client";

import { useEffect, useState } from "react";
import { ImageIcon, TreePine } from "lucide-react";
import { trees } from "@/lib/api";
import { cn } from "@/lib/cn";

type TreeThumbnailProps = {
  imageUrl?: string | null;
  treeId?: string;
  imageId?: string | null;
  alt?: string;
  className?: string;
  size?: "sm" | "md";
};

export function TreeThumbnail({
  imageUrl,
  treeId,
  imageId,
  alt = "",
  className,
  size = "md",
}: TreeThumbnailProps) {
  const dim = size === "sm" ? "h-10 w-10" : "h-14 w-14";
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!treeId || !imageId) {
      setSrc(imageUrl ?? null);
      setFailed(false);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      try {
        objectUrl = await trees.imageBlobUrl(treeId, imageId);
        if (!cancelled) {
          setSrc(objectUrl);
          setFailed(false);
        }
      } catch {
        if (!cancelled) {
          setSrc(null);
          setFailed(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [treeId, imageId, imageUrl]);

  const directSrc = treeId && imageId ? src : imageUrl;
  const showImage = Boolean(directSrc) && !failed;

  if (showImage) {
    return (
      <img
        src={directSrc!}
        alt={alt}
        className={cn(dim, "shrink-0 rounded-md object-cover bg-stone-100", className)}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }

  if (treeId && imageId && !failed && !directSrc) {
    return (
      <div
        className={cn(dim, "shrink-0 animate-pulse rounded-md bg-stone-200", className)}
        aria-hidden
      />
    );
  }

  return (
    <div
      className={cn(
        dim,
        "flex shrink-0 items-center justify-center rounded-md border border-dashed border-stone-200 bg-stone-50 text-stone-400",
        className,
      )}
      aria-hidden
    >
      {size === "sm" ? <ImageIcon className="h-4 w-4" /> : <TreePine className="h-5 w-5" />}
    </div>
  );
}
