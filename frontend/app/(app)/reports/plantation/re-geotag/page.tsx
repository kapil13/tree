"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  FinancialYearFilter,
  ProjectFilter,
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
import { plantationReportApi, type ReGeotagFilters } from "@/lib/plantation-report-api";

type Row = {
  tree_id: string;
  public_code: string;
  project_id: string;
  project_name: string;
  financial_year: string;
  state_name: string;
  district_name: string;
  species: string;
  survival_status: string;
  last_geotag_at: string;
  days_overdue: number;
  latitude: number | null;
  longitude: number | null;
};

const EMPTY: ReGeotagFilters = {};

export default function ReGeotagReportPage() {
  const t = useTranslations("plantationReports");
  const opts = usePlantationReportOptions();
  const [filters, setFilters] = useState<ReGeotagFilters>(EMPTY);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["plantation-report-re-geotag", filters],
    queryFn: async () => {
      const res = await plantationReportApi.reGeotag(filters);
      return res as { items: Row[]; total: number; capped?: boolean };
    },
  });

  const rows = data?.items ?? [];

  return (
    <div>
      <PageHeader
        title={t("reportReGeotag")}
        description={t("reportReGeotagDesc")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/field-ops" className="btn-secondary text-sm">
              Open field ops
            </Link>
            <PlantationReportExport
              filenameStem="re-geotag-report"
              disabled={!rows.length}
              onExport={(format) => plantationReportApi.reGeotag({ ...filters, format }) as Promise<Blob>}
            />
          </div>
        }
      />

      <PlantationReportFilters onReset={() => setFilters(EMPTY)}>
        <ProjectFilter
          projects={opts.projects}
          value={filters.project_id ?? ""}
          onChange={(project_id) => setFilters((f) => ({ ...f, project_id }))}
        />
        <FinancialYearFilter
          years={opts.financialYears}
          value={filters.financial_year ?? ""}
          onChange={(financial_year) => setFilters((f) => ({ ...f, financial_year }))}
        />
        <StateFilter
          states={opts.states}
          value={filters.state_code ?? ""}
          onChange={(state_code) => setFilters((f) => ({ ...f, state_code }))}
        />
        <SegmentFilter
          segments={opts.segments}
          value={filters.segment ?? ""}
          onChange={(segment) => setFilters((f) => ({ ...f, segment }))}
        />
        <FilterField label="Minimum days overdue">
          <input
            type="number"
            min={0}
            className={filterSelectClassName()}
            value={filters.min_days_overdue ?? ""}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                min_days_overdue: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
            placeholder="Any"
          />
        </FilterField>
      </PlantationReportFilters>

      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
        {t("reGeotagSummary", { count: fmtNum(data?.total ?? 0) })}
        {data?.capped ? " · Showing first 5,000 rows in export." : null}
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
                <th className="px-4 py-3">Tree</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Species</th>
                <th className="px-4 py-3">Survival</th>
                <th className="px-4 py-3">Last geotag</th>
                <th className="px-4 py-3">Days overdue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-900">
              {rows.map((row) => (
                <tr key={row.tree_id}>
                  <td className="px-4 py-3">
                    <Link href={`/trees/${row.tree_id}`} className="font-medium text-forest-700 hover:underline">
                      {row.public_code}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{row.project_name}</td>
                  <td className="px-4 py-3 text-stone-600">
                    {[row.state_name, row.district_name].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="px-4 py-3">{row.species || "—"}</td>
                  <td className="px-4 py-3 capitalize">{row.survival_status || "—"}</td>
                  <td className="px-4 py-3 text-xs text-stone-500">
                    {row.last_geotag_at ? new Date(row.last_geotag_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 font-medium text-amber-700">{row.days_overdue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
