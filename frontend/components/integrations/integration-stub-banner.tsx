"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { intelligence } from "@/lib/api";

type IntegrationRow = {
  mode?: string;
  label?: string;
  setup_hint?: string;
};

const WATCH_KEYS = [
  "sentinel_hub",
  "tree_satellite_ndvi",
  "firms_fire",
  "locust_feed",
  "ai_analysis",
] as const;

function isStubMode(row: IntegrationRow | undefined): boolean {
  if (!row) return false;
  const mode = (row.mode ?? "").toLowerCase();
  return mode === "estimate" || mode === "optional" || mode === "stub";
}

export function IntegrationStubBanner({ className = "" }: { className?: string }) {
  const { data } = useQuery({
    queryKey: ["integrations-health"],
    queryFn: () => intelligence.integrations(),
    staleTime: 5 * 60_000,
  });

  const integrations = data?.integrations as Record<string, IntegrationRow> | undefined;
  if (!integrations) return null;

  const stubs = WATCH_KEYS.filter((key) => isStubMode(integrations[key])).map((key) => ({
    key,
    label: integrations[key]?.label,
    hint: integrations[key]?.setup_hint,
  }));

  if (stubs.length === 0) return null;

  return (
    <div
      className={`flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100 ${className}`}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
      <div className="min-w-0 space-y-1">
        <p className="font-medium">Some integrations are using fallback or estimate modes</p>
        <ul className="list-disc space-y-0.5 pl-4 text-xs text-amber-900/90 dark:text-amber-100/90">
          {stubs.map((s) => (
            <li key={s.key}>
              {s.label ?? s.key}
              {s.hint ? ` — ${s.hint}` : ""}
            </li>
          ))}
        </ul>
        <Link
          href="/intelligence"
          className="text-xs font-medium text-amber-900 underline dark:text-amber-100"
        >
          View integration status
        </Link>
      </div>
    </div>
  );
}
