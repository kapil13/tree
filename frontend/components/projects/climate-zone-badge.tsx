"use client";

import { useQuery } from "@tanstack/react-query";
import { CloudSun } from "lucide-react";
import { plantingProjects } from "@/lib/api";
import { cn } from "@/lib/cn";

type Props = {
  stateCode?: string;
  districtCode?: string;
  className?: string;
};

export function ClimateZoneBadge({ stateCode, districtCode, className }: Props) {
  const enabled = Boolean(stateCode?.trim());

  const { data, isLoading, isError } = useQuery({
    queryKey: ["climate-zone", stateCode, districtCode ?? ""],
    queryFn: () =>
      plantingProjects.climateZone({
        state_code: stateCode!,
        district_code: districtCode || undefined,
      }),
    enabled,
    staleTime: 300_000,
  });

  if (!enabled || isError) return null;

  if (isLoading) {
    return (
      <p className={cn("text-xs text-stone-500", className)}>Resolving climatic zone…</p>
    );
  }

  if (!data) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border border-emerald-200/80 bg-emerald-50/60 px-3 py-2",
        className,
      )}
      title={data.description}
    >
      <CloudSun className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-emerald-900">
          Climatic zone: {data.label}
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-emerald-800/90">{data.description}</p>
      </div>
    </div>
  );
}
