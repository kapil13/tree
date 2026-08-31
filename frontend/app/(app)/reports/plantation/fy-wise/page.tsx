"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  FinancialYearFilter,
  SchemeFilter,
  SegmentFilter,
  StateFilter,
  usePlantationReportOptions,
} from "@/components/reports/plantation-report-filters";
import {
  PlantationReportExport,
  PlantationReportFilters,
} from "@/components/reports/plantation-report-toolbar";
import { PageHeader } from "@/components/ui";
import { fmtNum } from "@/components/dashboard/format";
import { plantationReportApi, type FyWiseFilters } from "@/lib/plantation-report-api";

type Row = {
  financial_year: string;
  project_count: number;
  target_trees: number;
  registered_trees: number;
  achievement_pct: number | null;
  survival_due: number;
  open_violations: number;
};

const EMPTY: FyWiseFilters = {};

export default function FyWisePlantationReportPage() {
  const t = useTranslations("plantationReports");
  const opts = usePlantationReportOptions();
  const [filters, setFilters] = useState<FyWiseFilters>(EMPTY);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["plantation-report-fy-wise", filters],
    queryFn: async () => {
      const res = await plantationReportApi.fyWise(filters);
      return res as { items: Row[]; total: number };
    },
  });

  const rows = data?.items ?? [];

  return (
    <div>
      <PageHeader
        title={t("reportFyWise")}
        description={t("reportFyWiseDesc")}
        actions={
          <PlantationReportExport
            filenameStem="fy-wise-plantation-report"
            disabled={!rows.length}
            onExport={(format) => plantationReportApi.fyWise({ ...filters, format }) as Promise<Blob>}
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
          onChange={(state_code) => setFilters((f) => ({ ...f, state_code }))}
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
      </PlantationReportFilters>

      {isLoading ? (
        <p className="text-sm text-stone-500">{t("loading")}</p>
      ) : isError ? (
        <p className="text-sm text-rose-600">{t("loadError")}</p>
      ) : rows.length === 0 ? (
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
              {rows.map((row) => (
                <tr key={row.financial_year}>
                  <td className="px-4 py-3 font-medium">{row.financial_year}</td>
                  <td className="px-4 py-3">{fmtNum(row.project_count)}</td>
                  <td className="px-4 py-3">{fmtNum(row.target_trees)}</td>
                  <td className="px-4 py-3">{fmtNum(row.registered_trees)}</td>
                  <td className="px-4 py-3">
                    {row.achievement_pct != null ? `${row.achievement_pct}%` : "—"}
                  </td>
                  <td className="px-4 py-3">{fmtNum(row.survival_due)}</td>
                  <td className="px-4 py-3">{fmtNum(row.open_violations)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
