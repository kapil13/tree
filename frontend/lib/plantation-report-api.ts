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
  async download(
    blob: Blob,
    filename: string,
  ) {
    downloadBlob(blob, filename);
  },
};
