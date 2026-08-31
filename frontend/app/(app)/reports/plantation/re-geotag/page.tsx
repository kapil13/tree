"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { fmtNum } from "@/components/dashboard/format";
import { plantingProjects } from "@/lib/api";
import { downloadCsv } from "@/lib/plantation-reports";
import { useTranslations } from "next-intl";

type FieldOpsProject = {
  id: string;
  code: string;
  name: string;
  segment: string;
  survival_due: number;
  tree_count: number;
};

export default function ReGeotagReportPage() {
  const t = useTranslations("plantationReports");

  const { data: summary, isLoading, isError } = useQuery({
    queryKey: ["field-ops-summary"],
    queryFn: () => plantingProjects.fieldOpsSummary(),
  });

  const rows = ((summary?.projects ?? []) as FieldOpsProject[]).filter((p) => p.survival_due > 0);
  const totalDue = summary?.survival_due ?? rows.reduce((sum, r) => sum + r.survival_due, 0);

  function exportCsv() {
    downloadCsv(
      "re-geotag-report.csv",
      ["Project code", "Project name", "Segment", "Total trees", "Re-geotag due"],
      rows.map((r) => [r.code, r.name, r.segment, String(r.tree_count), String(r.survival_due)]),
    );
  }

  return (
    <div>
      <PageHeader
        title={t("reportReGeotag")}
        description={t("reportReGeotagDesc")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/field-ops" className="btn-secondary text-sm">
              Open field ops
            </Link>
            <button type="button" className="btn-secondary text-sm" onClick={exportCsv} disabled={!rows.length}>
              <Download className="mr-1.5 inline h-4 w-4" aria-hidden />
              Export CSV
            </button>
          </div>
        }
      />

      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
        {t("reGeotagSummary", { count: fmtNum(totalDue) })}
      </div>

      {isLoading ? (
        <p className="text-sm text-stone-500">{t("loading")}</p>
      ) : isError ? (
        <p className="text-sm text-rose-600">{t("loadError")}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-stone-500">{t("noReGeotagDue")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:bg-stone-900">
              <tr>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Segment</th>
                <th className="px-4 py-3">Total trees</th>
                <th className="px-4 py-3">Due for re-geotag</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-900">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{row.name}</div>
                    <div className="text-xs text-stone-500">{row.code}</div>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{row.segment}</td>
                  <td className="px-4 py-3">{fmtNum(row.tree_count)}</td>
                  <td className="px-4 py-3 font-medium text-amber-700">{fmtNum(row.survival_due)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/projects/${row.id}`} className="text-xs font-medium text-forest-700 hover:underline">
                      View project
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
