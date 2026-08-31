"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { PageHeader, MetricGrid } from "@/components/ui";
import { fmtNum } from "@/components/dashboard/format";
import { plantingProjects, trees } from "@/lib/api";
import { downloadCsv } from "@/lib/plantation-reports";
import { useTranslations } from "next-intl";

export default function TotalPlantationRecordsPage() {
  const t = useTranslations("plantationReports");
  const [page, setPage] = useState(1);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["field-ops-summary"],
    queryFn: () => plantingProjects.fieldOpsSummary(),
  });

  const { data: treePage, isLoading: treesLoading } = useQuery({
    queryKey: ["trees-report", page],
    queryFn: () => trees.list({ page, page_size: 50 }),
  });

  const totalPages = treePage ? Math.max(1, Math.ceil(treePage.total / treePage.page_size)) : 1;

  function exportCsv() {
    const items = treePage?.items ?? [];
    downloadCsv(
      `plantation-records-page-${page}.csv`,
      [
        "Tree code",
        "Species",
        "Health",
        "Survival",
        "Latitude",
        "Longitude",
        "Work area",
        "Last geotag",
        "Registered",
      ],
      items.map((tree) => [
        tree.public_code ?? tree.id,
        tree.species_text ?? "",
        tree.current_health ?? "",
        tree.survival_status ?? "",
        tree.latitude != null ? String(tree.latitude) : "",
        tree.longitude != null ? String(tree.longitude) : "",
        tree.work_area_name ?? "",
        tree.last_geotag_at ?? "",
        tree.created_at ?? "",
      ]),
    );
  }

  return (
    <div>
      <PageHeader
        title={t("reportTotalRecords")}
        description={t("reportTotalRecordsDesc")}
        actions={
          <button
            type="button"
            className="btn-secondary text-sm"
            onClick={exportCsv}
            disabled={!(treePage?.items.length ?? 0)}
          >
            <Download className="mr-1.5 inline h-4 w-4" aria-hidden />
            Export page CSV
          </button>
        }
      />

      <MetricGrid
        className="mb-6"
        metrics={[
          { label: t("metricProjects"), value: summaryLoading ? "…" : fmtNum(summary?.project_count ?? 0) },
          { label: t("metricTrees"), value: summaryLoading ? "…" : fmtNum(summary?.tree_count ?? 0) },
          { label: t("metricReGeotagDue"), value: summaryLoading ? "…" : fmtNum(summary?.survival_due ?? 0) },
          { label: t("metricViolations"), value: summaryLoading ? "…" : fmtNum(summary?.open_violations ?? 0) },
        ]}
      />

      {treesLoading ? (
        <p className="text-sm text-stone-500">{t("loading")}</p>
      ) : !(treePage?.items.length ?? 0) ? (
        <p className="text-sm text-stone-500">{t("noTrees")}</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:bg-stone-900">
                <tr>
                  <th className="px-4 py-3">Tree code</th>
                  <th className="px-4 py-3">Species</th>
                  <th className="px-4 py-3">Health</th>
                  <th className="px-4 py-3">Survival</th>
                  <th className="px-4 py-3">Coordinates</th>
                  <th className="px-4 py-3">Work area</th>
                  <th className="px-4 py-3">Last geotag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-900">
                {treePage!.items.map((tree) => (
                  <tr key={tree.id}>
                    <td className="px-4 py-3">
                      <Link href={`/trees/${tree.id}`} className="font-medium text-forest-700 hover:underline">
                        {tree.public_code ?? tree.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{tree.species_text ?? "—"}</td>
                    <td className="px-4 py-3 capitalize">{tree.current_health ?? "—"}</td>
                    <td className="px-4 py-3 capitalize">{tree.survival_status ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-stone-500">
                      {tree.latitude != null && tree.longitude != null
                        ? `${tree.latitude.toFixed(5)}, ${tree.longitude.toFixed(5)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">{tree.work_area_name ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-stone-500">
                      {tree.last_geotag_at ? new Date(tree.last_geotag_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-stone-600">
            <span>
              Page {page} of {totalPages} · {fmtNum(treePage!.total)} trees total
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary text-xs"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn-secondary text-xs"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
