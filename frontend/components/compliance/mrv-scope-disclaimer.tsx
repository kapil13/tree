"use client";

import { Info } from "lucide-react";
import { cn } from "@/lib/cn";

export const MRV_PRODUCT_SCOPE_TEXT =
  "Aranyix provides field MRV, monitoring, and audit-prep tooling. Carbon figures are modeled project estimates — not Verra-certified, not VCS-verified, and not registry-issued credits unless your organisation records an external registry reference separately.";

export function MrvScopeDisclaimer({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <p className={cn("text-[10px] leading-snug text-amber-900/90", className)}>
        {MRV_PRODUCT_SCOPE_TEXT}
      </p>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950",
        className,
      )}
      role="note"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
      <p>{MRV_PRODUCT_SCOPE_TEXT}</p>
    </div>
  );
}
