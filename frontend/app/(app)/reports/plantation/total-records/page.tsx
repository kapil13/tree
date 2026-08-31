"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  FinancialYearFilter,
  ProjectFilter,
  StateFilter,
  usePlantationReportOptions,
} from "@/components/reports/plantation-report-filters";
import {
  FilterField,
  PlantationReportExport,
  PlantationReportFilters,
  filterSelectClassName,
} from "@/components/reports/plantation-report-toolbar";
import { PageHeader, MetricGrid } from "@/components/ui";
import { fmtNum } from "@/components/dashboard/format";
import { plantationReportApi, type TotalRecordsFilters } from "@/lib/plantation-report-api";

type Row = {
  tree_id: string;
  public_code: string;
  species: string;
  health: string;
  survival_status: string;
  project_name: string;
  financial_year: string;
  state_name: string;
  district_name: string;
  village_name: string;
  work_area_name: string;
  latitude: number | null;
  longitude: number | null;
  carbon_kg: number;
  satellite_verified: boolean;
  registered_at: string;
  last_geotag_at: string;
};

const EMPTY: TotalRecordsFilters = { page: 1, page_size: 50 };

export default function TotalPlantationRecordsPage() {
  const t = useTranslations("plantationReports");
  const opts = usePlantationReportOptions();
  const [filters, setFilters] = useState<TotalRecordsFilters>(EMPTY);

  const queryParams = useMemo(() => ({ ...filters }), [filters]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["plantation-report-total-records", queryParams],
    queryFn: async () => {
      const res = await plantationReportApi.totalRecords(queryParams);
      return res as { items: Row[]; total: number; page: number; page_size: number; capped?: boolean };
    },
  });

  const rows = data?.items ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / (data.page_size || 50))) : 1;

  return (
    <div>
      <PageHeader
        title={t("reportTotalRecords")}
        description={t("reportTotalRecordsDesc")}
        actions={
          <PlantationReportExport
            filenameStem="total-plantation-records"
            disabled={!data?.total}
            onExport={(format) =>
              plantationReportApi.totalRecords({ ...filters, page: undefined, page_size: undefined, format }) as Promise<Blob>
            }
          />
        }
      />

      <PlantationReportFilters onReset={() => setFilters(EMPTY)}>
        <ProjectFilter
          projects={opts.projects}
          value={filters.project_id ?? ""}
          onChange={(project_id) => setFilters((f) => ({ ...f, project_id, page: 1 }))}
        />
        <FinancialYearFilter
          years={opts.financialYears}
          value={filters.financial_year ?? ""}
          onChange={(financial_year) => setFilters((f) => ({ ...f, financial_year, page: 1 }))}
        />
        <StateFilter
          states={opts.states}
          value={filters.state_code ?? ""}
          onChange={(state_code) => setFilters((f) => ({ ...f, state_code, page: 1 }))}
        />
        <FilterField label="Health">
          <select
            className={filterSelectClassName()}
            value={filters.health ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, health: e.target.value || undefined, page: 1 }))}
          >
            <option value="">All</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
            <option value="unknown">Unknown</option>
          </select>
        </FilterField>
        <FilterField label="Survival status">
          <select
            className={filterSelectClassName()}
            value={filters.survival_status ?? ""}
            onChange={(e) =>
              setFilters((f) => ({ ...f, survival_status: e.target.value || undefined, page: 1 }))
            }
          >
            <option value="">All</option>
            <option value="live">Live</option>
            <option value="stressed">Stressed</option>
            <option value="dead">Dead</option>
            <option value="replaced">Replaced</option>
          </select>
        </FilterField>
        <FilterField label="Species contains">
          <input
            className={filterSelectClassName()}
            value={filters.species ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, species: e.target.value || undefined, page: 1 }))}
            placeholder="e.g. Neem"
          />
        </FilterField>
        <FilterField label="Satellite verified">
          <select
            className={filterSelectClassName()}
            value={
              filters.satellite_verified === undefined
                ? ""
                : filters.satellite_verified
                  ? "yes"
                  : "no"
            }
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                satellite_verified:
                  e.target.value === "" ? undefined : e.target.value === "yes",
                page: 1,
              }))
            }
          >
            <option value="">All</option>
            <option value="yes">Verified</option>
            <option value="no">Not verified</option>
          </select>
        </FilterField>
        <FilterField label="Registered from">
          <input
            type="date"
            className={filterSelectClassName()}
            value={filters.registered_from?.slice(0, 10) ?? ""}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                registered_from: e.target.value ? `${e.target.value}T00:00:00Z` : undefined,
                page: 1,
              }))
            }
          />
        </FilterField>
        <FilterField label="Registered to">
          <input
            type="date"
            className={filterSelectClassName()}
            value={filters.registered_to?.slice(0, 10) ?? ""}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                registered_to: e.target.value ? `${e.target.value}T23:59:59Z` : undefined,
                page: 1,
              }))
            }
          />
        </FilterField>
      </PlantationReportFilters>

      <MetricGrid
        className="mb-6"
        metrics={[
          { label: t("metricTrees"), value: isLoading ? "…" : fmtNum(data?.total ?? 0) },
          { label: "On this page", value: isLoading ? "…" : fmtNum(rows.length) },
        ]}
      />

      {data?.capped ? (
        <p className="mb-3 text-xs text-amber-700">Export includes up to 5,000 matching trees.</p>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-stone-500">{t("loading")}</p>
      ) : isError ? (
        <p className="text-sm text-rose-600">{t("loadError")}</p>
      ) : rows.length === 0 ? (
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
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Work area</th>
                  <th className="px-4 py-3">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-900">
                {rows.map((tree) => (
                  <tr key={tree.tree_id}>
                    <td className="px-4 py-3">
                      <Link href={`/trees/${tree.tree_id}`} className="font-medium text-forest-700 hover:underline">
                        {tree.public_code}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{tree.species || "—"}</td>
                    <td className="px-4 py-3 capitalize">{tree.health || "—"}</td>
                    <td className="px-4 py-3 capitalize">{tree.survival_status || "—"}</td>
                    <td className="px-4 py-3">{tree.project_name || "—"}</td>
                    <td className="px-4 py-3 text-xs text-stone-500">
                      {[tree.state_name, tree.district_name, tree.village_name].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-4 py-3">{tree.work_area_name || "—"}</td>
                    <td className="px-4 py-3 text-xs text-stone-500">
                      {tree.registered_at ? new Date(tree.registered_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-stone-600">
            <span>
              Page {data?.page ?? 1} of {totalPages} · {fmtNum(data?.total ?? 0)} trees total
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary text-xs"
                disabled={(filters.page ?? 1) <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, (f.page ?? 1) - 1) }))}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn-secondary text-xs"
                disabled={(filters.page ?? 1) >= totalPages}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
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
