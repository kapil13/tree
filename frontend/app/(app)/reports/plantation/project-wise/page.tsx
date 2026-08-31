"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Download, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { fmtNum } from "@/components/dashboard/format";
import { plantingProjects } from "@/lib/api";
import { downloadCsv, projectFinancialYear, projectLocationLabel } from "@/lib/plantation-reports";
import { useTranslations } from "next-intl";

type FieldOpsProject = {
  id: string;
  code: string;
  name: string;
  segment: string;
  scheme_code: string | null;
  compliance_mode: string;
  status: string;
  open_violations: number;
  survival_due: number;
  tree_count: number;
  target_tree_count: number | null;
  progress_pct: number | null;
};

export default function ProjectWisePlantationReportPage() {
  const t = useTranslations("plantationReports");

  const { data: summary, isLoading, isError } = useQuery({
    queryKey: ["field-ops-summary"],
    queryFn: () => plantingProjects.fieldOpsSummary(),
  });

  const { data: projectsDetail } = useQuery({
    queryKey: ["planting-projects-report"],
    queryFn: () => plantingProjects.list({ page_size: 200 }),
  });

  const locationById = new Map(
    (projectsDetail?.items ?? []).map((p) => [p.id, projectLocationLabel(p)]),
  );
  const fyById = new Map(
    (projectsDetail?.items ?? []).map((p) => [p.id, projectFinancialYear(p)]),
  );

  const rows = (summary?.projects ?? []) as FieldOpsProject[];

  function exportCsv() {
    downloadCsv(
      "project-wise-plantation-report.csv",
      [
        "Project code",
        "Project name",
        "Financial year",
        "Location",
        "Segment",
        "Scheme",
        "Status",
        "Target trees",
        "Registered trees",
        "Progress %",
        "Survival due",
        "Open violations",
      ],
      rows.map((r) => [
        r.code,
        r.name,
        fyById.get(r.id) ?? "—",
        locationById.get(r.id) ?? "—",
        r.segment,
        r.scheme_code ?? "",
        r.status,
        String(r.target_tree_count ?? ""),
        String(r.tree_count),
        r.progress_pct != null ? String(Math.round(r.progress_pct)) : "",
        String(r.survival_due),
        String(r.open_violations),
      ]),
    );
  }

  return (
    <div>
      <PageHeader
        title={t("reportProjectWise")}
        description={t("reportProjectWiseDesc")}
        actions={
          <button type="button" className="btn-secondary text-sm" onClick={exportCsv} disabled={!rows.length}>
            <Download className="mr-1.5 inline h-4 w-4" aria-hidden />
            Export CSV
          </button>
        }
      />

      {isLoading ? (
        <p className="text-sm text-stone-500">{t("loading")}</p>
      ) : isError ? (
        <p className="text-sm text-rose-600">{t("loadError")}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-stone-500">{t("noProjects")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:bg-stone-900">
              <tr>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">FY</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Trees</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">Re-geotag due</th>
                <th className="px-4 py-3">Violations</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-900">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-stone-50/80 dark:hover:bg-stone-900/40">
                  <td className="px-4 py-3">
                    <div className="font-medium text-stone-900 dark:text-stone-100">{row.name}</div>
                    <div className="text-xs text-stone-500">{row.code}</div>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{fyById.get(row.id) ?? "—"}</td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-stone-600" title={locationById.get(row.id)}>
                    {locationById.get(row.id) ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {fmtNum(row.tree_count)}
                    {row.target_tree_count ? (
                      <span className="text-stone-400"> / {fmtNum(row.target_tree_count)}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {row.progress_pct != null ? `${Math.round(row.progress_pct)}%` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {row.survival_due > 0 ? (
                      <span className="font-medium text-amber-700">{fmtNum(row.survival_due)}</span>
                    ) : (
                      "0"
                    )}
                  </td>
                  <td className="px-4 py-3">{row.open_violations > 0 ? row.open_violations : "0"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/projects/${row.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-forest-700 hover:underline"
                    >
                      Open
                      <ExternalLink className="h-3 w-3" aria-hidden />
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
