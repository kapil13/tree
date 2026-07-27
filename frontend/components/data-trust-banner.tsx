"use client";

import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { intelligence } from "@/lib/api";
import { cn } from "@/lib/cn";

type ProviderMode = {
  mode?: string;
  label?: string;
};

function modeLabel(raw: unknown, fallback: string): { mode: string; label: string } {
  const p = (raw || {}) as ProviderMode;
  return {
    mode: p.mode || "unknown",
    label: p.label || fallback,
  };
}

export function DataTrustBanner({
  compact = false,
  variant = "card",
}: {
  compact?: boolean;
  variant?: "card" | "strip";
}) {
  const { data } = useQuery({
    queryKey: ["integrations-health"],
    queryFn: () => intelligence.integrations(),
    staleTime: 60_000,
  });

  const integrations = (data?.integrations || {}) as Record<string, unknown>;
  const ai = modeLabel(integrations.ai_analysis, "AI tree analysis");
  const sat = modeLabel(integrations.tree_satellite_ndvi, "Tree NDVI");
  const sentinel = modeLabel(integrations.sentinel_hub, "Sentinel Hub");

  const anyEstimate = ai.mode === "estimate" || sat.mode === "estimate";

  if (variant === "strip") {
    return (
      <div className="dash-trust-strip">
        <span className="font-medium text-stone-700">Data sources</span>
        <TrustPill mode={ai.mode} label={`AI · ${ai.label}`} />
        <TrustPill mode={sat.mode} label={`NDVI · ${sat.label}`} />
        {sentinel.mode === "live" || sentinel.mode === "configured" ? (
          <TrustPill mode="live" label="Sentinel · configured" />
        ) : (
          <TrustPill mode="estimate" label="Sentinel · not configured" />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        anyEstimate
          ? "border-amber-200 bg-amber-50/80 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
          : "border-forest-200 bg-forest-50/60 text-forest-900 dark:border-forest-900 dark:bg-forest-950/30 dark:text-forest-100",
      )}
    >
      <div className="flex items-start gap-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 space-y-1">
          <p className="font-medium">Data sources</p>
          {compact ? (
            <p className="text-xs opacity-90">
              AI: {ai.label} · Tree NDVI: {sat.label}
              {sentinel.mode === "live" || sentinel.mode === "configured"
                ? " · Site Sentinel: live when configured"
                : ""}
            </p>
          ) : (
            <ul className="space-y-0.5 text-xs opacity-90">
              <li>
                <TrustPill mode={ai.mode} label={ai.label} />
              </li>
              <li>
                <TrustPill mode={sat.mode} label={sat.label} />
              </li>
              <li>
                <TrustPill
                  mode={sentinel.mode === "configured" ? "live" : sentinel.mode}
                  label={
                    sentinel.mode === "configured" || sentinel.mode === "live"
                      ? "Site monitoring (Sentinel Hub): credentials configured"
                      : "Site monitoring (Sentinel Hub): not configured — simulated where needed"
                  }
                />
              </li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function TrustPill({ mode, label }: { mode: string; label: string }) {
  const live = mode === "live" || mode === "configured" || mode === "ok";
  return (
    <span
      className={cn(
        "dash-trust-pill",
        live ? "dash-trust-pill--live" : "dash-trust-pill--estimate",
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
        {live ? "Live" : "Estimate"}
      </span>
      {label}
    </span>
  );
}
