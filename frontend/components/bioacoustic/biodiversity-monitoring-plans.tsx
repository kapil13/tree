"use client";

import type { MonitoringPlan } from "@/lib/api";

const STATUS_CLASS: Record<string, string> = {
  on_track: "bg-green-100 text-green-800",
  due_soon: "bg-amber-100 text-amber-900",
  overdue: "bg-rose-100 text-rose-800",
};

export function BiodiversityMonitoringPlans({ plans }: { plans: MonitoringPlan[] }) {
  if (plans.length === 0) {
    return <p className="text-sm text-stone-500">No scheme monitoring plan configured for this project yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {plans.map((plan) => (
        <li
          key={plan.id}
          className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900/40"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">{plan.label}</span>
            <span className={`rounded px-2 py-0.5 text-xs ${STATUS_CLASS[plan.status] ?? STATUS_CLASS.on_track}`}>
              {plan.status.replace("_", " ")}
            </span>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            Every {plan.cadence_days}d · {plan.recordings_in_cycle}/{plan.min_recordings_per_cycle} recordings this cycle ·
            due {new Date(plan.next_due_at).toLocaleDateString()}
          </p>
          {plan.guidance && <p className="mt-1 text-xs text-stone-600">{plan.guidance}</p>}
        </li>
      ))}
    </ul>
  );
}
