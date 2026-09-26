"use client";

import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Leaf, Timer } from "lucide-react";
import { credits, errorMessage } from "@/lib/api";

const ELIGIBILITY_CLASS: Record<string, string> = {
  eligible: "bg-emerald-100 text-emerald-900",
  gaps_identified: "bg-amber-100 text-amber-900",
  not_eligible: "bg-rose-100 text-rose-900",
};

export function ProjectGreenCreditPanel({ projectId }: { projectId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["green-credit", projectId],
    queryFn: () => credits.greenCreditEstimate(projectId),
  });

  if (isLoading) {
    return <p className="text-sm text-stone-500">Computing Green Credit estimate…</p>;
  }

  if (error) {
    return <p className="text-sm text-rose-700">{errorMessage(error)}</p>;
  }

  if (!data) return null;

  const eligibilityClass = ELIGIBILITY_CLASS[data.eligibility_status] ?? "bg-stone-100 text-stone-700";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BadgeCheck className="h-4 w-4 text-forest-700" />
        <h3 className="text-sm font-medium text-stone-800">MoEFCC Green Credit estimate</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${eligibilityClass}`}>
          {data.eligibility_status.replace(/_/g, " ")}
        </span>
      </div>
      <p className="text-xs text-stone-500">{data.disclaimer}</p>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-stone-200 p-3">
          <dt className="text-xs text-stone-500">Activity</dt>
          <dd className="text-sm font-medium capitalize">{data.activity_type.replace(/_/g, " ")}</dd>
        </div>
        <div className="rounded-lg border border-stone-200 p-3">
          <dt className="text-xs text-stone-500">Trees / ha</dt>
          <dd className="text-sm font-medium">
            {data.trees_per_ha ?? "—"} <span className="text-xs text-stone-500">(min {data.min_trees_per_ha})</span>
          </dd>
        </div>
        <div className="rounded-lg border border-stone-200 p-3">
          <dt className="text-xs text-stone-500">Land bank ID</dt>
          <dd className="font-mono text-sm">{data.land_bank_id || "—"}</dd>
        </div>
        <div className="rounded-lg border border-stone-200 p-3">
          <dt className="flex items-center gap-1 text-xs text-stone-500">
            <Leaf className="h-3 w-3" /> Vested GC
          </dt>
          <dd className="text-lg font-semibold text-forest-800">{data.vested_green_credits}</dd>
        </div>
        <div className="rounded-lg border border-stone-200 p-3">
          <dt className="text-xs text-stone-500">Provisional GC</dt>
          <dd className="text-sm font-medium">{data.provisional_green_credits}</dd>
        </div>
        <div className="rounded-lg border border-stone-200 p-3">
          <dt className="flex items-center gap-1 text-xs text-stone-500">
            <Timer className="h-3 w-3" /> Monitoring
          </dt>
          <dd className="text-sm font-medium">
            {data.years_elapsed} / {data.monitoring_period_years} yr ({Math.round(data.vesting_fraction * 100)}% vested)
          </dd>
        </div>
      </dl>

      {data.gaps.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3">
          <p className="text-xs font-medium text-amber-900">Readiness gaps</p>
          <ul className="mt-1 list-inside list-disc text-xs text-amber-800">
            {data.gaps.map((gap) => (
              <li key={gap}>{gap.replace(/_/g, " ")}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
