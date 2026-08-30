"use client";

import { useQuery } from "@tanstack/react-query";
import { plantationFences, plantingProjects, type ScanHistoryRow } from "@/lib/api";
import { cn } from "@/lib/cn";

type Props = {
  fenceId?: string | null;
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

export function ScanHistoryGrid({
  fenceId,
  projectId,
  portfolio = false,
  title = "Scan history",
  className,
  limit = 48,
}: Props) {
  const enabled = Boolean(fenceId || projectId || portfolio);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["scan-history", portfolio ? "portfolio" : null, projectId ?? null, fenceId ?? null, limit],
    queryFn: async () => {
      if (portfolio) {
        return plantingProjects.scanHistoryPortfolio(limit);
      }
      if (fenceId) {
        return plantationFences.scanHistory(fenceId, limit);
      }
      if (projectId) {
        return plantingProjects.scanHistory(projectId, { limit, fenceId: fenceId ?? undefined });
      }
      return { rows: [] as ScanHistoryRow[] };
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
          Date-wise NDVI, SAR ground status, and Forest Integrity score from stored scans.
        </p>
      </div>
      {isLoading ? (
        <p className="px-4 py-6 text-sm text-stone-500">Loading scan history…</p>
      ) : isError ? (
        <p className="px-4 py-6 text-sm text-rose-700">Could not load scan history.</p>
      ) : rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-stone-500">
          No scans recorded yet. Run an NDVI or SAR scan to populate this table.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500 dark:bg-stone-900">
              <tr>
                <th className="px-4 py-2">Date</th>
                {(portfolio || (projectId && !fenceId)) ? (
                  <th className="px-4 py-2">Work area</th>
                ) : null}
                <th className="px-4 py-2">NDVI</th>
                <th className="px-4 py-2">Δ baseline</th>
                <th className="px-4 py-2">Integrity</th>
                <th className="px-4 py-2">Grade</th>
                <th className="px-4 py-2">SAR mode</th>
                <th className="px-4 py-2">SAR status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={`${row.fence_id}-${row.scan_date}`}
                  className="border-t border-stone-100 dark:border-stone-800"
                >
                  <td className="px-4 py-2 font-mono text-xs">{row.scan_date}</td>
                  {(portfolio || (projectId && !fenceId)) ? (
                    <td className="px-4 py-2">{row.fence_name}</td>
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
                  <td className="px-4 py-2 tabular-nums">
                    {row.forest_integrity_score != null ? row.forest_integrity_score : "—"}
                  </td>
                  <td className="px-4 py-2 capitalize">{row.integrity_grade ?? "—"}</td>
                  <td className="px-4 py-2 text-xs">{row.sar_monitoring_mode ?? "—"}</td>
                  <td className="px-4 py-2 text-xs capitalize">{row.sar_ground_status ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
