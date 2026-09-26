"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { plantingProjects } from "@/lib/api";
import { cn } from "@/lib/cn";

function statusIcon(status: string) {
  if (status === "complete" || status === "compliant") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />;
  }
  if (status === "partial" || status === "in_progress") {
    return <Loader2 className="h-4 w-4 text-amber-600" aria-hidden />;
  }
  if (status === "non_compliant" || status === "pending") {
    return <Circle className="h-4 w-4 text-stone-400" aria-hidden />;
  }
  return <Circle className="h-4 w-4 text-stone-300" aria-hidden />;
}

export function ProjectClosureMilestonesPanel({ projectId }: { projectId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["project-closure-milestones", projectId],
    queryFn: () => plantingProjects.closureMilestones(projectId),
  });

  if (isLoading) {
    return (
      <section className="card space-y-2" aria-busy="true">
        <p className="text-sm text-stone-500">Loading closure milestones…</p>
      </section>
    );
  }

  if (isError || !data?.applicable) {
    return null;
  }

  const greenBelt = data.green_belt;

  return (
    <section className="card space-y-4" aria-labelledby="closure-milestones-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="closure-milestones-heading" className="text-sm font-medium">
            PMCP / FMCP closure milestones
          </h2>
          <p className="text-xs text-stone-500">
            Progressive mine closure tracking with EC green-belt compliance.
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
            data.status === "complete"
              ? "bg-emerald-50 text-emerald-800"
              : data.status === "in_progress"
                ? "bg-amber-50 text-amber-800"
                : "bg-stone-100 text-stone-700",
          )}
        >
          {data.status.replaceAll("_", " ")}
        </span>
      </div>

      {greenBelt?.applicable && (
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="font-medium">EC green belt ({greenBelt.ec_green_belt_pct_required}%)</span>
            {statusIcon(greenBelt.status)}
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-200">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                greenBelt.status === "compliant"
                  ? "bg-emerald-500"
                  : greenBelt.status === "partial"
                    ? "bg-amber-500"
                    : "bg-rose-400",
              )}
              style={{ width: `${Math.min(greenBelt.coverage_pct ?? 0, 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-stone-600">
            {greenBelt.mapped_green_belt_ha?.toFixed(2)} ha mapped of{" "}
            {greenBelt.required_green_belt_ha?.toFixed(2)} ha required on{" "}
            {greenBelt.lease_area_ha?.toFixed(2)} ha lease (
            {greenBelt.coverage_pct?.toFixed(1)}% of target).
          </p>
        </div>
      )}

      {data.alerts.length > 0 && (
        <ul className="space-y-2">
          {data.alerts.map((alert) => (
            <li
              key={`${alert.kind}-${alert.phase_code}`}
              className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{alert.message}</span>
            </li>
          ))}
        </ul>
      )}

      <ol className="space-y-3">
        {data.phases.map((phase) => (
          <li
            key={phase.code}
            className={cn(
              "rounded-lg border px-3 py-2",
              phase.is_current ? "border-forest-300 bg-forest-50/40" : "border-stone-200",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{phase.label}</p>
              <div className="flex items-center gap-2 text-xs capitalize text-stone-600">
                {statusIcon(phase.status)}
                {phase.status.replaceAll("_", " ")}
              </div>
            </div>
            {phase.target_year != null && (
              <p className="mt-1 text-xs text-stone-500">Target year: {phase.target_year}</p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
