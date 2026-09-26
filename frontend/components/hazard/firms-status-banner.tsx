"use client";

import Link from "next/link";
import { Flame, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { intelligence } from "@/lib/api";

type Props = {
  className?: string;
  compact?: boolean;
};

export function FirmsStatusBanner({ className = "", compact = false }: Props) {
  const { data } = useQuery({
    queryKey: ["integrations-health"],
    queryFn: () => intelligence.integrations(),
    staleTime: 5 * 60_000,
  });

  const firms = data?.integrations?.firms_fire as
    | { mode?: string; setup_hint?: string; label?: string }
    | undefined;

  if (!firms || firms.mode === "live") {
    return null;
  }

  if (compact) {
    return (
      <p className={`text-[10px] text-amber-800 dark:text-amber-200 ${className}`}>
        FIRMS key not set — fire watch uses seasonal fallback.
      </p>
    );
  }

  return (
    <div
      className={`flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100 ${className}`}
    >
      <Flame className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
      <div className="min-w-0 space-y-1">
        <p className="font-medium">Fire detections use seasonal fallback</p>
        <p className="text-xs text-amber-900/90 dark:text-amber-100/90">
          {firms.label ?? "Configure NASA FIRMS for live satellite fire pins and alerts."}
        </p>
        {firms.setup_hint && (
          <p className="flex items-center gap-1 text-xs text-amber-800/80 dark:text-amber-100/80">
            <Info className="h-3 w-3" />
            {firms.setup_hint}
          </p>
        )}
        <Link href="/intelligence" className="text-xs font-medium text-amber-900 underline dark:text-amber-100">
          View integration status
        </Link>
      </div>
    </div>
  );
}
