"use client";

import { cn } from "@/lib/cn";

/** Honest label for modeled carbon / credits (not registry-issued). */
export function CarbonEstimateLabel({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        "bg-amber-100 text-amber-950 dark:bg-amber-900/40 dark:text-amber-100",
        className,
      )}
      title="Modeled estimate — not verified carbon credit issuance"
    >
      {compact ? "Est." : "Estimate"}
    </span>
  );
}

export function CarbonValue({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      {children}
      <CarbonEstimateLabel compact />
    </span>
  );
}
