"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { credits } from "@/lib/api";

export function OrgCreditsSummaryPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["credits-org-summary"],
    queryFn: credits.orgSummary,
  });

  if (isLoading) {
    return <p className="text-sm text-stone-500">Loading credits…</p>;
  }

  if (error) {
    return (
      <p className="text-sm text-amber-800 dark:text-amber-200">
        Unable to load credit summary. Try again later, or contact your administrator if this persists.
      </p>
    );
  }

  if (!data) {
    return <p className="text-sm text-stone-500">No credit data available.</p>;
  }

  if (!data.project_count) {
    return (
      <p className="text-sm text-stone-500">
        No credits recorded yet.{" "}
        <Link href="/projects" className="text-forest-700 hover:underline">
          Open a project
        </Link>{" "}
        to start tracking.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Projects" value={String(data.project_count)} />
        <Stat label="Net (tCO₂e)" value={data.total_net_credits_tco2e.toFixed(2)} />
        <Stat label="Gross" value={data.total_gross_credits_tco2e.toFixed(2)} />
        <Stat label="Issued" value={data.total_issued_credits_tco2e.toFixed(2)} />
      </div>
      {Object.keys(data.by_status).length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {Object.entries(data.by_status).map(([status, count]) => (
            <span
              key={status}
              className="rounded-full bg-stone-100 px-2 py-0.5 text-xs capitalize text-stone-600 dark:bg-stone-800 dark:text-stone-300"
            >
              {status.replace(/_/g, " ")}: {count}
            </span>
          ))}
        </div>
      ) : null}
      <Link href="/projects" className="inline-block text-sm text-forest-700 hover:underline">
        View project ledgers
      </Link>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-stone-500">{label}</div>
      <div className="text-base font-semibold text-stone-900 dark:text-stone-50">{value}</div>
    </div>
  );
}
