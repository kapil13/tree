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
    return <p className="text-sm text-stone-500">Loading organization credits…</p>;
  }

  if (error || !data) {
    return (
      <p className="text-sm text-stone-500">
        Credit ledger summary is available for organization accounts with active projects.
      </p>
    );
  }

  if (!data.project_count) {
    return (
      <p className="text-sm text-stone-500">
        No project credit ledgers yet. Open a{" "}
        <Link href="/projects" className="text-forest-700 underline">
          planting project
        </Link>{" "}
        to sync credits.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label="Projects" value={String(data.project_count)} />
        <Stat label="Net credits (tCO₂e)" value={data.total_net_credits_tco2e.toFixed(3)} />
        <Stat label="Gross credits" value={data.total_gross_credits_tco2e.toFixed(3)} />
        <Stat label="Issued" value={data.total_issued_credits_tco2e.toFixed(3)} />
      </div>
      {Object.keys(data.by_status).length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">By status</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.by_status).map(([status, count]) => (
              <span key={status} className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs capitalize text-stone-700">
                {status}: {count}
              </span>
            ))}
          </div>
        </div>
      )}
      <Link href="/projects" className="text-sm text-forest-700 hover:underline">
        View project ledgers →
      </Link>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-stone-200/80 bg-white/60 px-3 py-2 dark:border-stone-700 dark:bg-stone-900/40">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="text-lg font-semibold text-forest-800">{value}</div>
    </div>
  );
}
