"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DistrictFilter,
  FinancialYearFilter,
  SchemeFilter,
  SegmentFilter,
  StateFilter,
  usePlantationReportOptions,
} from "@/components/reports/plantation-report-filters";
import {
  FilterField,
  PlantationReportExport,
  PlantationReportFilters,
  filterSelectClassName,
} from "@/components/reports/plantation-report-toolbar";
import { PageHeader } from "@/components/ui";
import { fmtNum } from "@/components/dashboard/format";
import { plantationReportApi, type ProjectWiseFilters } from "@/lib/plantation-report-api";

type Row = {
  project_id: string;
  project_code: string;
  project_name: string;
  financial_year: string;
  location: string;
  segment: string;
  scheme_code: string;
  status: string;
  target_tree_count: number | null;
  registered_trees: number;
  progress_pct: number | null;
  survival_due: number;
  open_violations: number;
};

const EMPTY: ProjectWiseFilters = {};

export default function ProjectWisePlantationReportPage() {
  const t = useTranslations("plantationReports");
  const opts = usePlantationReportOptions();
  const [filters, setFilters] = useState<ProjectWiseFilters>(EMPTY);

  const queryParams = useMemo(
    () => ({
      ...filters,
      survival_due_only: filters.survival_due_only || undefined,
      violations_only: filters.violations_only || undefined,
    }),
    [filters],
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ["plantation-report-project-wise", queryParams],
    queryFn: async () => {
      const res = await plantationReportApi.projectWise(queryParams);
      return res as { items: Row[]; total: number };
    },
  });

  const rows = data?.items ?? [];

  return (
    <div>
      <PageHeader
        title={t("reportProjectWise")}
        description={t("reportProjectWiseDesc")}
        actions={
          <PlantationReportExport
            filenameStem="project-wise-plantation-report"
            disabled={!rows.length}
            onExport={(format) =>
              plantationReportApi.projectWise({ ...queryParams, format }) as Promise<Blob>
            }
          />
        }
      />

      <PlantationReportFilters onReset={() => setFilters(EMPTY)}>
        <FinancialYearFilter
          years={opts.financialYears}
          value={filters.financial_year ?? ""}
          onChange={(financial_year) => setFilters((f) => ({ ...f, financial_year }))}
        />
        <StateFilter
          states={opts.states}
          value={filters.state_code ?? ""}
          onChange={(state_code) => setFilters((f) => ({ ...f, state_code, district_code: "" }))}
        />
        <DistrictFilter
          stateCode={filters.state_code ?? ""}
          value={filters.district_code ?? ""}
          onChange={(district_code) => setFilters((f) => ({ ...f, district_code }))}
        />
        <SegmentFilter
          segments={opts.segments}
          value={filters.segment ?? ""}
          onChange={(segment) => setFilters((f) => ({ ...f, segment }))}
        />
        <SchemeFilter
          schemes={opts.schemes}
          value={filters.scheme_code ?? ""}
          onChange={(scheme_code) => setFilters((f) => ({ ...f, scheme_code }))}
        />
        <FilterField label="Project status">
          <select
            className={filterSelectClassName()}
            value={filters.status ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined }))}
          >
            <option value="">All statuses</option>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </FilterField>
        <FilterField label="Re-geotag backlog">
          <label className="mt-2 flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={Boolean(filters.survival_due_only)}
              onChange={(e) => setFilters((f) => ({ ...f, survival_due_only: e.target.checked }))}
            />
            Only projects with trees due
          </label>
        </FilterField>
        <FilterField label="Compliance">
          <label className="mt-2 flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={Boolean(filters.violations_only)}
              onChange={(e) => setFilters((f) => ({ ...f, violations_only: e.target.checked }))}
            />
            Only projects with open violations
          </label>
        </FilterField>
      </PlantationReportFilters>

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
                <tr key={row.project_id} className="hover:bg-stone-50/80 dark:hover:bg-stone-900/40">
                  <td className="px-4 py-3">
                    <div className="font-medium text-stone-900 dark:text-stone-100">{row.project_name}</div>
                    <div className="text-xs text-stone-500">{row.project_code}</div>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{row.financial_year}</td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-stone-600" title={row.location}>
                    {row.location}
                  </td>
                  <td className="px-4 py-3">
                    {fmtNum(row.registered_trees)}
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
                      href={`/projects/${row.project_id}`}
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
