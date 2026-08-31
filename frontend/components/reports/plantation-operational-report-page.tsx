"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  FinancialYearFilter,
  SchemeFilter,
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
import {
  plantationReportApi,
  type PlantationReportFormat,
} from "@/lib/plantation-report-api";

export type ReportColumn = {
  key: string;
  label: string;
  render?: (row: Record<string, unknown>) => ReactNode;
};

export type OperationalReportConfig = {
  titleKey: string;
  descKey: string;
  filenameStem: string;
  queryKey: string;
  emptyKey?: string;
  columns: ReportColumn[];
  fetch: (filters: Record<string, unknown>) => Promise<{ items: Record<string, unknown>[]; total: number }>;
  exportFn: (filters: Record<string, unknown>, format: PlantationReportFormat) => Promise<Blob>;
  filters?: (props: {
    filters: Record<string, unknown>;
    setFilters: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
    opts: ReturnType<typeof usePlantationReportOptions>;
  }) => ReactNode;
};

function defaultCell(value: unknown): ReactNode {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") return fmtNum(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function PlantationOperationalReportPage({ config }: { config: OperationalReportConfig }) {
  const t = useTranslations("plantationReports");
  const opts = usePlantationReportOptions();
  const [filters, setFilters] = useState<Record<string, unknown>>({});

  const queryParams = useMemo(() => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null && v !== "") out[k] = v;
    }
    return out;
  }, [filters]);

  const { data, isLoading, isError } = useQuery({
    queryKey: [config.queryKey, queryParams],
    queryFn: async () => config.fetch(queryParams),
  });

  const rows = data?.items ?? [];

  return (
    <div>
      <PageHeader
        title={t(config.titleKey as "reportProjectWise")}
        description={t(config.descKey as "reportProjectWiseDesc")}
        actions={
          <PlantationReportExport
            filenameStem={config.filenameStem}
            disabled={!rows.length}
            onExport={(format) => config.exportFn(queryParams, format)}
          />
        }
      />

      {config.filters ? (
        <PlantationReportFilters onReset={() => setFilters({})}>
          {config.filters({ filters, setFilters, opts })}
        </PlantationReportFilters>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-stone-500">{t("loading")}</p>
      ) : isError ? (
        <p className="text-sm text-rose-600">{t("loadError")}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-stone-500">{t((config.emptyKey ?? "noProjects") as "noProjects")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:bg-stone-900">
              <tr>
                {config.columns.map((col) => (
                  <th key={col.key} className="px-4 py-3">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-900">
              {rows.map((row, idx) => (
                <tr key={String(row.id ?? row.project_id ?? row.tree_code ?? row.violation_id ?? idx)} className="hover:bg-stone-50/80 dark:hover:bg-stone-900/40">
                  {config.columns.map((col) => (
                    <td key={col.key} className="max-w-[240px] truncate px-4 py-3 text-stone-700 dark:text-stone-200">
                      {col.render ? col.render(row) : defaultCell(row[col.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function standardLocationFilters({
  filters,
  setFilters,
  opts,
}: {
  filters: Record<string, unknown>;
  setFilters: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  opts: ReturnType<typeof usePlantationReportOptions>;
}) {
  return (
    <>
      <FinancialYearFilter
        years={opts.financialYears}
        value={String(filters.financial_year ?? "")}
        onChange={(financial_year) => setFilters((f) => ({ ...f, financial_year }))}
      />
      <StateFilter
        states={opts.states}
        value={String(filters.state_code ?? "")}
        onChange={(state_code) => setFilters((f) => ({ ...f, state_code }))}
      />
    </>
  );
}

export function schemeFilter({
  filters,
  setFilters,
  opts,
}: {
  filters: Record<string, unknown>;
  setFilters: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  opts: ReturnType<typeof usePlantationReportOptions>;
}) {
  return (
    <SchemeFilter
      schemes={opts.schemes}
      value={String(filters.scheme_code ?? "")}
      onChange={(scheme_code) => setFilters((f) => ({ ...f, scheme_code }))}
    />
  );
}

export function resolvedFilter({
  filters,
  setFilters,
}: {
  filters: Record<string, unknown>;
  setFilters: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
}) {
  return (
    <FilterField label="Resolution status">
      <select
        className={filterSelectClassName()}
        value={filters.resolved === true ? "resolved" : filters.resolved === false ? "open" : ""}
        onChange={(e) => {
          const v = e.target.value;
          setFilters((f) => ({
            ...f,
            resolved: v === "resolved" ? true : v === "open" ? false : undefined,
          }));
        }}
      >
        <option value="">All</option>
        <option value="open">Open only</option>
        <option value="resolved">Resolved only</option>
      </select>
    </FilterField>
  );
}
