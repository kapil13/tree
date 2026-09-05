"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { plantingProjects, type TreeScanHistoryRow } from "@/lib/api";
import { cn } from "@/lib/cn";

type Props = {
  projectId?: string | null;
  portfolio?: boolean;
  title?: string;
  className?: string;
  limit?: number;
};

function fmtNum(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

export function TreeScanHistoryGrid({
  projectId,
  portfolio = false,
  title = "Tree scan history",
  className,
  limit = 48,
}: Props) {
  const enabled = Boolean(projectId || portfolio);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["tree-scan-history", portfolio ? "portfolio" : null, projectId ?? null, limit],
    queryFn: async () => {
      if (portfolio) {
        return plantingProjects.treeScanHistoryPortfolio(limit);
      }
      if (projectId) {
        return plantingProjects.treeScanHistory(projectId, limit);
      }
      return { rows: [] as TreeScanHistoryRow[] };
    },
    enabled,
  });

  const rows = data?.rows ?? [];

  if (!enabled) return null;

  return (
    <section className={cn("card overflow-hidden p-0", className)}>
      <div className="border-b border-stone-200 px-4 py-3 dark:border-stone-800">
        <h2 className="font-medium text-stone-900 dark:text-stone-50">{title}</h2>
        <p className="mt-0.5 text-xs text-stone-500">
          Date-wise NDVI from automated and on-demand tree satellite scans.
        </p>
      </div>
      {isLoading ? (
        <p className="px-4 py-6 text-sm text-stone-500">Loading tree scan history…</p>
      ) : isError ? (
        <p className="px-4 py-6 text-sm text-rose-700">Could not load tree scan history.</p>
      ) : rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-stone-500">
          No tree scans recorded yet. Enrolled trees are scanned on the daily sweep schedule.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500 dark:bg-stone-900">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Tree</th>
                {(portfolio || !projectId) ? (
                  <th className="px-4 py-2">Project</th>
                ) : null}
                <th className="px-4 py-2">NDVI</th>
                <th className="px-4 py-2">Δ baseline</th>
                <th className="px-4 py-2">Cloud %</th>
                <th className="px-4 py-2">Provider</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={`${row.tree_id}-${row.scan_date}`}
                  className="border-t border-stone-100 dark:border-stone-800"
                >
                  <td className="px-4 py-2 font-mono text-xs">{row.scan_date}</td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/trees/${row.tree_id}`}
                      className="font-medium text-forest-800 hover:underline"
                    >
                      {row.tree_code}
                    </Link>
                    {row.species_text ? (
                      <span className="ml-1 text-xs text-stone-500">({row.species_text})</span>
                    ) : null}
                  </td>
                  {(portfolio || !projectId) ? (
                    <td className="px-4 py-2 text-xs">{row.project_name ?? "—"}</td>
                  ) : null}
                  <td className="px-4 py-2 tabular-nums">{fmtNum(row.ndvi_mean)}</td>
                  <td className="px-4 py-2 tabular-nums">
                    {row.ndvi_change_vs_baseline != null ? (
                      <span
                        className={
                          row.ndvi_change_vs_baseline <= -0.15 ? "font-medium text-rose-700" : ""
                        }
                      >
                        {row.ndvi_change_vs_baseline >= 0 ? "+" : ""}
                        {fmtNum(row.ndvi_change_vs_baseline)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2 tabular-nums">{fmtNum(row.cloud_cover_pct, 0)}</td>
                  <td className="px-4 py-2 text-xs">{row.provider ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
