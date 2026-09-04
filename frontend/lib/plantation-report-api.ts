import { api } from "@/lib/api";
import { downloadBlob } from "@/lib/download-blob";

export type PlantationReportFormat = "json" | "pdf" | "xlsx";

export type ProjectWiseFilters = {
  financial_year?: string;
  state_code?: string;
  district_code?: string;
  segment?: string;
  scheme_code?: string;
  status?: string;
  survival_due_only?: boolean;
  violations_only?: boolean;
};

export type FyWiseFilters = {
  financial_year?: string;
  state_code?: string;
  segment?: string;
  scheme_code?: string;
};

export type ReGeotagFilters = {
  project_id?: string;
  financial_year?: string;
  state_code?: string;
  segment?: string;
  min_days_overdue?: number;
};

export type DistrictRollupSchemeBucket = {
  project_count: number;
  registered_trees: number;
  on_track: number;
  at_risk: number;
};

export type DistrictRollupRow = {
  state_code: string;
  state_name: string;
  district_code: string;
  district_name: string;
  block_name?: string | null;
  project_count: number;
  target_trees: number;
  registered_trees: number;
  gap: number;
  achievement_pct: number | null;
  survival_due: number;
  open_violations: number;
  scheme_on_track: number;
  scheme_at_risk: number;
  scheme_off_track: number;
  avg_survival_pct: number | null;
  avg_geo_tagged_pct: number | null;
  by_scheme: Record<string, DistrictRollupSchemeBucket>;
  by_site_type: Record<string, number>;
};

export type DistrictRollupResponse = {
  report: string;
  generated_at: string;
  filters: Record<string, unknown>;
  totals: DistrictRollupRow;
  by_scheme: Record<string, DistrictRollupSchemeBucket>;
  items: DistrictRollupRow[];
  total: number;
};

export type DistrictRollupFilters = {
  state_code?: string;
  district_code?: string;
  financial_year?: string;
  scheme_code?: string;
  group_by?: "district" | "block";
};

export type TotalRecordsFilters = {
  project_id?: string;
  work_area_id?: string;
  financial_year?: string;
  state_code?: string;
  health?: string;
  survival_status?: string;
  species?: string;
  satellite_verified?: boolean;
  registered_from?: string;
  registered_to?: string;
  page?: number;
  page_size?: number;
};

type ReportEnvelope<T> = {
  report: string;
  generated_at: string;
  filters: Record<string, unknown>;
  items: T[];
  total: number;
  page?: number;
  page_size?: number;
  capped?: boolean;
};

function cleanParams(params: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    out[key] = value;
  }
  return out;
}

async function fetchReport<T>(
  path: string,
  params: Record<string, unknown>,
  format: PlantationReportFormat,
): Promise<ReportEnvelope<T> | Blob> {
  const query = cleanParams({ ...params, format });
  if (format === "json") {
    return (await api.get<ReportEnvelope<T>>(path, { params: query })).data;
  }
  const response = await api.get(path, { params: query, responseType: "blob" });
  return response.data as Blob;
}

export const plantationReportApi = {
  async projectWise(params: ProjectWiseFilters & { format?: PlantationReportFormat }) {
    const { format = "json", ...filters } = params;
    return fetchReport("/v1/plantation-reports/project-wise", filters, format);
  },
  async fyWise(params: FyWiseFilters & { format?: PlantationReportFormat }) {
    const { format = "json", ...filters } = params;
    return fetchReport("/v1/plantation-reports/fy-wise", filters, format);
  },
  async reGeotag(params: ReGeotagFilters & { format?: PlantationReportFormat }) {
    const { format = "json", ...filters } = params;
    return fetchReport("/v1/plantation-reports/re-geotag", filters, format);
  },
  async totalRecords(params: TotalRecordsFilters & { format?: PlantationReportFormat }) {
    const { format = "json", ...filters } = params;
    return fetchReport("/v1/plantation-reports/total-records", filters, format);
  },
  async speciesWise(params: Record<string, unknown> & { format?: PlantationReportFormat }) {
    const { format = "json", ...filters } = params;
    return fetchReport("/v1/plantation-reports/species-wise", filters, format);
  },
  async workAreaSite(params: Record<string, unknown> & { format?: PlantationReportFormat }) {
    const { format = "json", ...filters } = params;
    return fetchReport("/v1/plantation-reports/work-area-site", filters, format);
  },
  async survivalMortality(params: Record<string, unknown> & { format?: PlantationReportFormat }) {
    const { format = "json", ...filters } = params;
    return fetchReport("/v1/plantation-reports/survival-mortality", filters, format);
  },
  async complianceViolations(params: Record<string, unknown> & { format?: PlantationReportFormat }) {
    const { format = "json", ...filters } = params;
    return fetchReport("/v1/plantation-reports/compliance-violations", filters, format);
  },
  async satelliteHealth(params: Record<string, unknown> & { format?: PlantationReportFormat }) {
    const { format = "json", ...filters } = params;
    return fetchReport("/v1/plantation-reports/satellite-health", filters, format);
  },
  async schemeKpi(params: Record<string, unknown> & { format?: PlantationReportFormat }) {
    const { format = "json", ...filters } = params;
    return fetchReport("/v1/plantation-reports/scheme-kpi", filters, format);
  },
  async fieldTeamPerformance(params: Record<string, unknown> & { format?: PlantationReportFormat }) {
    const { format = "json", ...filters } = params;
    return fetchReport("/v1/plantation-reports/field-team-performance", filters, format);
  },
  async carbonStock(params: Record<string, unknown> & { format?: PlantationReportFormat }) {
    const { format = "json", ...filters } = params;
    return fetchReport("/v1/plantation-reports/carbon-stock", filters, format);
  },
  async photoEvidence(params: Record<string, unknown> & { format?: PlantationReportFormat }) {
    const { format = "json", ...filters } = params;
    return fetchReport("/v1/plantation-reports/photo-evidence", filters, format);
  },
  async districtRollup(params: DistrictRollupFilters = {}) {
    return (await api.get<DistrictRollupResponse>("/v1/plantation-reports/district-rollup", {
      params: cleanParams(params),
    })).data;
  },
  async districtBlockAdmin(params: Record<string, unknown> & { format?: PlantationReportFormat }) {
    const { format = "json", ...filters } = params;
    return fetchReport("/v1/plantation-reports/district-block-admin", filters, format);
  },
  async pendingRegistration(params: Record<string, unknown> & { format?: PlantationReportFormat }) {
    const { format = "json", ...filters } = params;
    return fetchReport("/v1/plantation-reports/pending-registration", filters, format);
  },
  async outOfFence(params: Record<string, unknown> & { format?: PlantationReportFormat }) {
    const { format = "json", ...filters } = params;
    return fetchReport("/v1/plantation-reports/out-of-fence", filters, format);
  },
  async download(
    blob: Blob,
    filename: string,
  ) {
    downloadBlob(blob, filename);
  },
};
