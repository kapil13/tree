"use client";

import { cn } from "@/lib/cn";

export function isTrustModeLive(mode: string | undefined | null): boolean {
  return mode === "live" || mode === "configured" || mode === "ok";
}

export function isSatelliteProviderLive(provider: string | undefined | null): boolean {
  if (!provider) return false;
  return provider !== "sentinel-2-stub" && !provider.includes("stub");
}

export function DataTrustBadge({
  mode,
  className,
}: {
  mode: string;
  className?: string;
}) {
  const live = isTrustModeLive(mode);
  return (
    <span
      className={cn(
        "rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        live
          ? "bg-forest-100 text-forest-900 dark:bg-forest-900/40 dark:text-forest-100"
          : "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
        className,
      )}
    >
      {live ? "Live" : "Estimate"}
    </span>
  );
}
