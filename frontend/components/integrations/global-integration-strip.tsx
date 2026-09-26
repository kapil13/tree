"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { intelligence } from "@/lib/api";
import { cn } from "@/lib/cn";

type StripItem = {
  key: string;
  label: string;
  mode: string;
};

const MODE_STYLES: Record<string, string> = {
  live: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100",
  stub: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
  disabled:
    "border-stone-200 bg-stone-100 text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400",
};

function modeLabel(mode: string): string {
  if (mode === "live") return "Live";
  if (mode === "disabled") return "Disabled";
  return "Stub";
}

export function GlobalIntegrationStrip({ className = "" }: { className?: string }) {
  const { data } = useQuery({
    queryKey: ["integration-strip"],
    queryFn: () => intelligence.integrationStrip(),
    staleTime: 5 * 60_000,
  });

  const items = (data?.integrations ?? []) as StripItem[];
  if (!items.length) return null;

  const stubCount = items.filter((item) => item.mode !== "live").length;
  if (stubCount === 0) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/30",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-medium text-amber-950 dark:text-amber-100">
          Integration honesty
        </p>
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span
              key={item.key}
              title={`${item.label}: ${modeLabel(item.mode)}`}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                MODE_STYLES[item.mode] ?? MODE_STYLES.stub,
              )}
            >
              <span className="truncate max-w-[8rem]">{item.label}</span>
              <span className="opacity-80">{modeLabel(item.mode)}</span>
            </span>
          ))}
        </div>
        <Link
          href="/intelligence"
          className="ml-auto text-[11px] font-medium text-amber-900 underline dark:text-amber-100"
        >
          Details
        </Link>
      </div>
      {data && !data.audit_export_ready ? (
        <p className="mt-1 text-[11px] text-amber-900/90 dark:text-amber-100/90">
          Audit exports are blocked until optical NDVI and SAR are live.
        </p>
      ) : null}
      {data && !data.compliance_export_ready ? (
        <p className="mt-1 text-[11px] text-amber-900/90 dark:text-amber-100/90">
          Compliance framework exports require live optical NDVI and AI.
        </p>
      ) : null}
    </div>
  );
}
