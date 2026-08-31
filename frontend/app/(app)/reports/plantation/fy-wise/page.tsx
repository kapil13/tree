"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { fmtNum } from "@/components/dashboard/format";
import { plantingProjects } from "@/lib/api";
import { downloadCsv, projectFinancialYear } from "@/lib/plantation-reports";
import { useTranslations } from "next-intl";

type FyRow = {
  financialYear: string;
  projectCount: number;
  targetTrees: number;
  registeredTrees: number;
  survivalDue: number;
  openViolations: number;
};

export default function FyWisePlantationReportPage() {
  const t = useTranslations("plantationReports");

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["field-ops-summary"],
    queryFn: () => plantingProjects.fieldOpsSummary(),
  });

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["planting-projects-report"],
    queryFn: () => plantingProjects.list({ page_size: 200 }),
  });

  const fyRows = useMemo(() => {
    const opsById = new Map(
      (summary?.projects ?? []).map((p) => [
        p.id as string,
        p as {
          tree_count: number;
          target_tree_count: number | null;
          survival_due: number;
          open_violations: number;
        },
      ]),
    );

    const grouped = new Map<string, FyRow>();
    for (const project of projects?.items ?? []) {
      const fy = projectFinancialYear(project);
      const ops = opsById.get(project.id);
      const existing = grouped.get(fy) ?? {
        financialYear: fy,
        projectCount: 0,
        targetTrees: 0,
        registeredTrees: 0,
        survivalDue: 0,
        openViolations: 0,
      };
      existing.projectCount += 1;
      existing.targetTrees += ops?.target_tree_count ?? project.target_tree_count ?? 0;
      existing.registeredTrees += ops?.tree_count ?? project.summary?.tree_count ?? 0;
      existing.survivalDue += ops?.survival_due ?? 0;
      existing.openViolations += ops?.open_violations ?? 0;
      grouped.set(fy, existing);
    }

    return [...grouped.values()].sort((a, b) => b.financialYear.localeCompare(a.financialYear));
  }, [projects?.items, summary?.projects]);

  const isLoading = summaryLoading || projectsLoading;

  function exportCsv() {
    downloadCsv(
      "fy-wise-plantation-report.csv",
      [
        "Financial year",
        "Projects",
        "Target trees",
        "Registered trees",
        "Achievement %",
        "Re-geotag due",
        "Open violations",
      ],
      fyRows.map((r) => [
        r.financialYear,
        String(r.projectCount),
        String(r.targetTrees),
        String(r.registeredTrees),
        r.targetTrees > 0 ? String(Math.round((r.registeredTrees / r.targetTrees) * 100)) : "",
        String(r.survivalDue),
        String(r.openViolations),
      ]),
    );
  }

  return (
    <div>
      <PageHeader
        title={t("reportFyWise")}
        description={t("reportFyWiseDesc")}
        actions={
          <button type="button" className="btn-secondary text-sm" onClick={exportCsv} disabled={!fyRows.length}>
            <Download className="mr-1.5 inline h-4 w-4" aria-hidden />
            Export CSV
          </button>
        }
      />

      {isLoading ? (
        <p className="text-sm text-stone-500">{t("loading")}</p>
      ) : fyRows.length === 0 ? (
        <p className="text-sm text-stone-500">{t("noFyData")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:bg-stone-900">
              <tr>
                <th className="px-4 py-3">Financial year</th>
                <th className="px-4 py-3">Projects</th>
                <th className="px-4 py-3">Target trees</th>
                <th className="px-4 py-3">Registered</th>
                <th className="px-4 py-3">Achievement</th>
                <th className="px-4 py-3">Re-geotag due</th>
                <th className="px-4 py-3">Violations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-900">
              {fyRows.map((row) => (
                <tr key={row.financialYear}>
                  <td className="px-4 py-3 font-medium">{row.financialYear}</td>
                  <td className="px-4 py-3">{fmtNum(row.projectCount)}</td>
                  <td className="px-4 py-3">{fmtNum(row.targetTrees)}</td>
                  <td className="px-4 py-3">{fmtNum(row.registeredTrees)}</td>
                  <td className="px-4 py-3">
                    {row.targetTrees > 0
                      ? `${Math.round((row.registeredTrees / row.targetTrees) * 100)}%`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">{fmtNum(row.survivalDue)}</td>
                  <td className="px-4 py-3">{fmtNum(row.openViolations)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
