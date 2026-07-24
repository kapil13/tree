/**
 * Thin axios wrapper for the BYOT REST API.
 * Reads `byot_access_token` from localStorage and sends it as Bearer.
 */
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { useAuth } from "@/lib/auth-store";

/** Browser calls same-origin `/api/...`; Next.js proxies to the backend. */
function resolveApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) return "/api";
  const base = raw.replace(/\/$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
}

/** Same-origin JSON API (proxied). File uploads must bypass Next.js — use direct API host. */
function resolveDirectUploadApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "aranyix.tech" || host === "www.aranyix.tech") {
      return "https://api.aranyix.tech/api";
    }
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:8000/api";
    }
  }
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (raw) {
    try {
      const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
      if (!url.hostname.startsWith("api.")) {
        url.hostname = `api.${url.hostname.replace(/^www\./, "")}`;
      }
      return url.href.replace(/\/$/, "").endsWith("/api")
        ? url.href.replace(/\/$/, "")
        : `${url.origin}/api`;
    } catch {
      /* fall through */
    }
  }
  return API_URL;
}

export const API_URL = resolveApiBaseUrl();

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const tok = useAuth.getState().getAccessToken();
    if (tok) config.headers.Authorization = `Bearer ${tok}`;
  }
  return config;
});

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = useAuth.getState().refresh;
  if (!refresh) return null;
  try {
    const { data } = await axios.post<Tokens>(`${API_URL}/v1/auth/refresh`, {
      refresh_token: refresh,
    });
    useAuth.getState().setSession(data);
    return data.access_token;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (!config || error.response?.status !== 401 || config._retry) {
      return Promise.reject(error);
    }
    if (config.url?.includes("/v1/auth/refresh") || config.url?.includes("/v1/auth/login")) {
      return Promise.reject(error);
    }

    config._retry = true;
    if (!refreshInFlight) {
      refreshInFlight = refreshAccessToken().finally(() => {
        refreshInFlight = null;
      });
    }
    const newToken = await refreshInFlight;
    if (!newToken) {
      return Promise.reject(error);
    }
    config.headers.Authorization = `Bearer ${newToken}`;
    return api(config);
  },
);

export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

export function isApiError(err: unknown): err is AxiosError<{ error: ApiError }> {
  return axios.isAxiosError(err);
}

export function errorMessage(err: unknown): string {
  if (isApiError(err)) {
    if (!err.response) {
      if (err.code === "ERR_NETWORK") {
        const host = typeof window !== "undefined" ? window.location.hostname : "";
        if (host === "localhost" || host === "127.0.0.1") {
          return "Cannot reach the API on port 8000. Start the backend: make dev-start (or ./scripts/dev-start.sh), then run make dev-status. Ensure Postgres.app (:5432) and Redis are running.";
        }
        return `Cannot reach the API (${API_URL}). Check https://api.aranyix.tech/health in your browser, sign out and sign in again, or ask your admin to rebuild the frontend with NEXT_PUBLIC_API_URL=https://api.aranyix.tech`;
      }
      return err.message;
    }
    const data = err.response?.data as {
      error?: ApiError;
      detail?:
        | string
        | { msg: string }[]
        | { compliance_errors?: Array<{ message: string }>; validation_errors?: string[] };
    } | undefined;
    if (data?.error?.message) return data.error.message;
    if (data?.detail && typeof data.detail === "object" && !Array.isArray(data.detail)) {
      const detail = data.detail as {
        compliance_errors?: Array<{ message: string }>;
        validation_errors?: string[];
      };
      if (detail.compliance_errors?.length) {
        return detail.compliance_errors.map((e) => e.message).join("; ");
      }
      if (detail.validation_errors?.length) {
        return detail.validation_errors.join("; ");
      }
    }
    if (typeof data?.detail === "string") {
      if (err.response.status === 404 && data.detail === "Not Found") {
        return "API route not found (404). Rebuild the frontend: make fix-frontend";
      }
      if (data.detail === "storage_upload_failed") {
        return "Audio storage failed. Check MinIO/S3 on the server.";
      }
      if (data.detail === "recording_create_failed") {
        return "Could not save recording. Run database migration: alembic upgrade head";
      }
      if (data.detail === "credit_ledger_migration_required") {
        return "Credit ledger database migration required. On the server run: alembic upgrade head (through 0016_credit_ledger_timestamps).";
      }
      if (err.response.status === 500 && err.config?.url?.includes("/credits/")) {
        return `${data.detail}. Credit ledger may need migration 0015_credit_ledger — run: alembic upgrade head on the server.`;
      }
      if (err.response.status === 503 && err.config?.url?.includes("/credits/")) {
        return "Credit ledger tables need migration. On the server run: alembic upgrade head";
      }
      return data.detail;
    }
    if (Array.isArray(data?.detail)) return data.detail.map((d) => d.msg).join("; ");
    return err.message;
  }
  return (err as Error)?.message || "Unknown error";
}

// ---------- API surface ----------

export type Tokens = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
};

export type User = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  organization_id: string | null;
  permissions?: string[];
  platform_access?: {
    website_cms: boolean;
    users_admin: boolean;
  };
};

export type PlantingProgram = {
  id: string;
  code: string;
  name: string;
  description: string;
  audience: string;
  min_photos: number;
  is_default: boolean;
  is_public: boolean;
  form_schema: import("@/components/registration/types").ProgramFormSchema;
  enrolled: boolean;
};

export type ProgramAccessRequest = {
  id: string;
  program_code: string;
  program_name: string;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  message: string | null;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export type Tree = {
  id: string;
  public_code: string;
  species_text: string | null;
  current_health: string;
  current_carbon_kg: number;
  satellite_verified: boolean;
  latitude: number;
  longitude: number;
  created_at: string;
  program_code?: string | null;
  project_id?: string | null;
  work_area_id?: string | null;
  last_geotag_at?: string | null;
  survival_status?: string | null;
  chainage_km?: string | null;
};

export type TreeImage = {
  id: string;
  tree_id: string;
  s3_key: string;
  cdn_url: string | null;
  is_primary: boolean;
  created_at: string;
};

export type TreeDetail = {
  id: string;
  public_code: string;
  program_code: string | null;
  species_text: string | null;
  status: string;
  planted_at: string | null;
  registered_at: string;
  latitude: number | null;
  longitude: number | null;
  altitude_m: number | null;
  accuracy_m: number | null;
  current_height_m: number | null;
  current_dbh_cm: number | null;
  current_canopy_m: number | null;
  current_health: string;
  current_carbon_kg: number;
  satellite_verified: boolean;
  last_analysis_at: string | null;
  last_satellite_at: string | null;
  plantation_id: string | null;
  project_id: string | null;
  last_geotag_at: string | null;
  metadata: Record<string, unknown>;
  images: TreeImage[];
  created_at: string;
  compliance?: {
    passed: boolean;
    mode: string;
    chainage_km?: number | null;
    issues: { violation_type: string; severity: string; message: string }[];
  } | null;
};

export type TreeAnalysis = {
  id: string;
  tree_id: string;
  health: string | null;
  health_confidence: number | null;
  species_confidence: number | null;
  estimated_height_m: number | null;
  estimated_dbh_cm: number | null;
  estimated_biomass_kg: number | null;
  overall_confidence: number | null;
  recommendations: Array<{ type: string; text: string; priority: string }> | null;
  created_at: string;
};

export type GeoJsonPolygon = {
  type: "Polygon";
  coordinates: number[][][];
};

export type PlantationFence = {
  id: string;
  name: string;
  area_ha: number | null;
  last_satellite_at: string | null;
  latest_ndvi_mean: number | null;
  boundary: GeoJsonPolygon;
  ndvi_image_url?: string;
};

export type PlantationSatelliteRecord = {
  id: string;
  fence_id: string;
  provider: string;
  scene_id: string;
  scene_acquired_at: string;
  cloud_cover_pct: number | null;
  ndvi_mean: number | null;
  ndvi_max: number | null;
  ndvi_min: number | null;
  evi_mean: number | null;
  presence_confirmed: boolean | null;
  change_vs_baseline: number | null;
  created_at: string;
};

export type SatelliteRecord = {
  id: string;
  tree_id: string;
  provider: string;
  scene_id: string;
  scene_acquired_at: string;
  cloud_cover_pct: number | null;
  ndvi_mean: number | null;
  ndvi_max: number | null;
  ndvi_min: number | null;
  evi_mean: number | null;
  presence_confirmed: boolean | null;
  change_vs_baseline: number | null;
  created_at: string;
};

export type SatelliteSeries = {
  tree_id: string;
  points: { ts: string; ndvi: number; provider?: string }[];
  latest: SatelliteRecord | null;
  ndvi_image_url?: string;
};

export type PlantationSatelliteSeries = {
  fence_id: string;
  points: { ts: string; ndvi: number; provider?: string }[];
  latest: PlantationSatelliteRecord | null;
  ndvi_image_url?: string;
};

export type Dashboard = {
  kpi: {
    total_trees: number;
    total_biomass_kg: number;
    total_carbon_kg: number;
    total_co2e_kg: number;
    annual_sequestration_kg: number;
    lifetime_credits_tco2e: number;
    estimated_revenue_usd: number;
    pct_healthy: number;
    pct_satellite_verified: number;
  };
  carbon_growth: { label: string; value: number }[];
  health_distribution: { label: string; value: number }[];
  species_distribution: { label: string; value: number }[];
  bioacoustic?: {
    total_recordings: number;
    avg_health_score: number;
    avg_shannon_index: number;
    total_species_detected: number;
  };
};

export type CaptchaConfig = {
  enabled: boolean;
  provider: string;
  site_key: string | null;
};

export const auth = {
  async captchaConfig() {
    return (await api.get<CaptchaConfig>("/v1/auth/captcha-config")).data;
  },
  async register(payload: {
    email: string;
    password: string;
    full_name: string;
    role?: string;
    organization_name?: string;
    phone?: string;
    captcha_token?: string;
  }) {
    return (await api.post<User>("/v1/auth/register", payload)).data;
  },
  async signupStart(payload: {
    full_name: string;
    email: string;
    phone: string;
    password: string;
    captcha_token?: string;
  }) {
    return (
      await api.post<{ signup_token: string; dev_hint?: string | null; sms_enabled?: boolean }>(
        "/v1/auth/signup/start",
        payload,
      )
    ).data;
  },
  async signupVerifyPhone(payload: { signup_token: string; code: string }) {
    return (await api.post<{ status: string }>("/v1/auth/signup/verify-phone", payload)).data;
  },
  async signupSendEmailOtp(payload: { signup_token: string }) {
    return (
      await api.post<{ status: string; dev_hint?: string | null }>(
        "/v1/auth/signup/send-email-otp",
        payload,
      )
    ).data;
  },
  async signupComplete(payload: { signup_token: string; code: string }) {
    return (await api.post<Tokens>("/v1/auth/signup/complete", payload)).data;
  },
  async login(email: string, password: string, captcha_token?: string) {
    return (await api.post<Tokens>("/v1/auth/login", { email, password, captcha_token })).data;
  },
  async me() {
    return (await api.get<User>("/v1/auth/me")).data;
  },
  async refresh(refreshToken: string) {
    return (
      await api.post<Tokens>("/v1/auth/refresh", { refresh_token: refreshToken })
    ).data;
  },
  async requestOtp(payload: { email?: string; phone?: string; captcha_token?: string }) {
    return (
      await api.post<{ status: string; dev_hint?: string | null; sms_enabled?: boolean }>(
        "/v1/auth/otp/request",
        payload,
      )
    ).data;
  },
  async verifyOtp(payload: {
    email?: string;
    phone?: string;
    code: string;
    full_name?: string;
  }) {
    return (await api.post<Tokens>("/v1/auth/otp/verify", payload)).data;
  },
  async googleAuthorize() {
    return (await api.get<{ authorize_url: string }>("/v1/auth/google/login")).data;
  },
};

export const plantingPrograms = {
  async list() {
    return (
      await api.get<{ items: PlantingProgram[]; enrolled_codes: string[] }>(
        "/v1/planting-programs",
      )
    ).data;
  },
  async enrolled() {
    return (await api.get<PlantingProgram[]>("/v1/planting-programs/enrolled")).data;
  },
  async get(code: string) {
    return (await api.get<PlantingProgram>(`/v1/planting-programs/${code}`)).data;
  },
  async memberships() {
    return (
      await api.get<{
        enrolled: PlantingProgram[];
        available: PlantingProgram[];
        access_requests: ProgramAccessRequest[];
      }>("/v1/planting-programs/me/memberships")
    ).data;
  },
  async listAccessRequests() {
    return (
      await api.get<ProgramAccessRequest[]>("/v1/planting-programs/me/access-requests")
    ).data;
  },
  async submitAccessRequest(payload: { program_code: string; message?: string }) {
    return (
      await api.post<ProgramAccessRequest>("/v1/planting-programs/me/access-requests", payload)
    ).data;
  },
  async withdrawAccessRequest(requestId: string) {
    return (
      await api.delete<ProgramAccessRequest>(
        `/v1/planting-programs/me/access-requests/${requestId}`,
      )
    ).data;
  },
  async updateMemberships(programCodes: string[]) {
    return (
      await api.put<{ enrolled: PlantingProgram[]; available: PlantingProgram[] }>(
        "/v1/planting-programs/me/memberships",
        { program_codes: programCodes },
      )
    ).data;
  },
};

export type ProjectSegment =
  | "nhai_highway"
  | "industrial_greenbelt"
  | "township_landscape"
  | "ngo_watershed"
  | "general";

export type ComplianceMode = "open" | "guided" | "strict";

export type StandardTemplate = {
  code: string;
  name: string;
  segment: string;
  description: string;
  compliance_mode: ComplianceMode;
  recommended_program_codes: string[];
  rules: Record<string, unknown>;
};

export type PlantingStandard = {
  id: string;
  project_id: string | null;
  template_code: string | null;
  name: string;
  is_template_snapshot: boolean;
  rules: Record<string, unknown>;
  created_at: string;
};

export type ProjectSummary = {
  work_area_count: number;
  tree_count: number;
  target_tree_count: number | null;
  open_violations: number;
  progress_pct: number | null;
};

export type PlantingProject = {
  id: string;
  code: string;
  name: string;
  description: string;
  segment: ProjectSegment;
  compliance_mode: ComplianceMode;
  status: "planning" | "active" | "completed" | "archived";
  program_code: string | null;
  standard_template_code: string | null;
  target_tree_count: number | null;
  organization_id: string | null;
  owner_user_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  summary?: ProjectSummary;
  active_standard?: PlantingStandard;
};

export type GeoJsonLineString = {
  type: "LineString";
  coordinates: number[][];
};

export type WorkArea = {
  id: string;
  project_id: string | null;
  name: string;
  geometry_type: "polygon" | "corridor";
  buffer_m: number | null;
  segment_code: string | null;
  chainage_start_km: number | null;
  chainage_end_km: number | null;
  area_ha: number | null;
  boundary: GeoJsonPolygon;
  centerline: GeoJsonLineString | null;
  tree_count: number;
  last_satellite_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ComplianceCheck = {
  passed: boolean;
  mode: ComplianceMode;
  chainage_km: number | null;
  issues: Array<{
    violation_type: string;
    severity: string;
    message: string;
    metadata?: Record<string, unknown>;
  }>;
};

export const plantingProjects = {
  async segments() {
    return (await api.get<{ segments: { code: string; label: string }[] }>(
      "/v1/planting-projects/segments",
    )).data;
  },
  async templates(segment?: string) {
    return (
      await api.get<StandardTemplate[]>("/v1/planting-projects/templates", {
        params: segment ? { segment } : undefined,
      })
    ).data;
  },
  async list(params?: { page?: number; segment?: string; status?: string }) {
    return (
      await api.get<{ items: PlantingProject[]; total: number }>("/v1/planting-projects", {
        params,
      })
    ).data;
  },
  async get(id: string) {
    return (await api.get<PlantingProject>(`/v1/planting-projects/${id}`)).data;
  },
  async create(payload: {
    code: string;
    name: string;
    description?: string;
    segment: ProjectSegment;
    compliance_mode?: ComplianceMode;
    program_code?: string;
    standard_template_code?: string;
    target_tree_count?: number;
    metadata?: Record<string, unknown>;
  }) {
    return (await api.post<PlantingProject>("/v1/planting-projects", payload)).data;
  },
  async update(
    id: string,
    payload: Partial<{
      name: string;
      description: string;
      status: PlantingProject["status"];
      compliance_mode: ComplianceMode;
      target_tree_count: number;
      metadata: Record<string, unknown>;
    }>,
  ) {
    return (await api.patch<PlantingProject>(`/v1/planting-projects/${id}`, payload)).data;
  },
  async workAreas(projectId: string) {
    return (
      await api.get<WorkArea[]>(`/v1/planting-projects/${projectId}/work-areas`)
    ).data;
  },
  async createWorkArea(
    projectId: string,
    payload: {
      name: string;
      geometry_type: "polygon" | "corridor";
      boundary?: GeoJsonPolygon;
      centerline?: GeoJsonLineString;
      buffer_m?: number;
      segment_code?: string;
      chainage_start_km?: number;
      chainage_end_km?: number;
    },
  ) {
    return (
      await api.post<WorkArea>(`/v1/planting-projects/${projectId}/work-areas`, payload)
    ).data;
  },
  async complianceCheck(
    projectId: string,
    payload: {
      work_area_id: string;
      latitude: number;
      longitude: number;
      accuracy_m?: number;
      species_text?: string;
      photo_count?: number;
      metadata?: Record<string, unknown>;
    },
  ) {
    return (
      await api.post<ComplianceCheck>(
        `/v1/planting-projects/${projectId}/compliance-check`,
        payload,
      )
    ).data;
  },
  async complianceViolations(projectId: string, unresolvedOnly = true) {
    return (
      await api.get<
        Array<{
          id: string;
          violation_type: string;
          severity: string;
          message: string;
          work_area_id: string | null;
          tree_id: string | null;
          created_at: string;
          resolved_at: string | null;
        }>
      >(`/v1/planting-projects/${projectId}/compliance-violations`, {
        params: { unresolved_only: unresolvedOnly },
      })
    ).data;
  },
  async resolveViolation(projectId: string, violationId: string) {
    return (
      await api.post(`/v1/planting-projects/${projectId}/compliance-violations/${violationId}/resolve`)
    ).data;
  },
  async survivalDue(projectId: string) {
    return (
      await api.get<{
        survey_interval_days: number;
        trees_total: number;
        trees_due: number;
        due_tree_ids: string[];
      }>(`/v1/planting-projects/${projectId}/survival-due`)
    ).data;
  },
  async updateWorkArea(
    projectId: string,
    workAreaId: string,
    payload: {
      name?: string;
      segment_code?: string;
      chainage_start_km?: number;
      chainage_end_km?: number;
      geometry_type?: "polygon" | "corridor";
      boundary?: GeoJsonPolygon;
      centerline?: GeoJsonLineString;
      buffer_m?: number;
    },
  ) {
    return (
      await api.patch<WorkArea>(
        `/v1/planting-projects/${projectId}/work-areas/${workAreaId}`,
        payload,
      )
    ).data;
  },
  async deleteWorkArea(projectId: string, workAreaId: string) {
    await api.delete(`/v1/planting-projects/${projectId}/work-areas/${workAreaId}`);
  },
  async exportMrv(projectId: string, format: "pdf" | "xlsx" = "pdf") {
    const response = await api.get(`/v1/planting-projects/${projectId}/mrv-export`, {
      params: { format },
      responseType: "blob",
    });
    return response.data as Blob;
  },
  async exportEvidenceBundle(projectId: string, includePhotos = true) {
    const response = await api.get(`/v1/planting-projects/${projectId}/evidence-bundle`, {
      params: { include_photos: includePhotos },
      responseType: "blob",
    });
    return response.data as Blob;
  },
  async exportFrameworkReport(
    projectId: string,
    profile: FrameworkProfileCode,
    format: "pdf" | "xlsx" = "pdf",
  ) {
    const response = await api.get(`/v1/reporting/projects/${projectId}/framework-report`, {
      params: { profile, format },
      responseType: "blob",
    });
    return response.data as Blob;
  },
  async projectTrees(
    projectId: string,
    params?: { work_area_id?: string; page?: number; page_size?: number },
  ) {
    return (
      await api.get<{ items: Tree[]; total: number }>(
        `/v1/planting-projects/${projectId}/trees`,
        { params },
      )
    ).data;
  },
  async pestIntel(projectId: string, workAreaId?: string) {
    return (
      await api.get(`/v1/planting-projects/${projectId}/pest-intel`, {
        params: workAreaId ? { work_area_id: workAreaId } : undefined,
      })
    ).data as import("@/components/pest-intel-panel").PestIntel & {
      highest_risk?: import("@/components/pest-intel-panel").PestIntel;
      work_areas?: import("@/components/pest-intel-panel").PestIntel[];
    };
  },
  async fieldOpsSummary() {
    return (
      await api.get<{
        project_count: number;
        tree_count: number;
        open_violations: number;
        survival_due: number;
        by_segment: Record<string, number>;
        projects: Array<{
          id: string;
          code: string;
          name: string;
          segment: string;
          compliance_mode: string;
          status: string;
          open_violations: number;
          survival_due: number;
          tree_count: number;
          target_tree_count: number | null;
          progress_pct: number | null;
        }>;
        recent_violations: Array<{
          id: string;
          project_id: string;
          project_code: string;
          project_name: string;
          segment: string;
          violation_type: string;
          severity: string;
          message: string;
          tree_id: string | null;
          created_at: string | null;
        }>;
      }>("/v1/planting-projects/field-ops-summary")
    ).data;
  },
  async monitoringSummary() {
    return (
      await api.get<{
        project_count: number;
        tree_count: number;
        open_violations: number;
        survival_due: number;
        by_segment: Record<string, number>;
        projects: Array<{
          id: string;
          code: string;
          name: string;
          segment: string;
          compliance_mode: string;
          status: string;
          open_violations: number;
          survival_due: number;
          tree_count: number;
          target_tree_count: number | null;
          progress_pct: number | null;
        }>;
        recent_violations: Array<{
          id: string;
          project_id: string;
          project_code: string;
          project_name: string;
          segment: string;
          violation_type: string;
          severity: string;
          message: string;
          tree_id: string | null;
          created_at: string | null;
        }>;
        stale_satellite_work_areas: number;
        work_area_monitoring: Array<{
          id: string;
          name: string;
          project_id: string | null;
          project_name: string | null;
          segment: string | null;
          last_satellite_at: string | null;
          days_since_scan: number | null;
          latest_ndvi: number | null;
          tree_count: number | null;
        }>;
        unread_alerts_by_kind: Record<string, number>;
        recent_jobs: Array<{
          job_name: string;
          status: string;
          result: Record<string, unknown>;
          error: string | null;
          finished_at: string | null;
        }>;
      }>("/v1/planting-projects/monitoring-summary")
    ).data;
  },
  async triggerSatelliteScan(projectId: string) {
    return (
      await api.post<{ scanned: number; failed: number }>(
        `/v1/planting-projects/${projectId}/satellite-scan`,
      )
    ).data;
  },
  async listMembers(projectId: string) {
    return (
      await api.get<
        Array<{
          id: string;
          project_id: string;
          user_id: string;
          role: string;
          contractor_name: string | null;
          work_area_ids: string[] | null;
          user_email: string | null;
          user_name: string | null;
        }>
      >(`/v1/planting-projects/${projectId}/members`)
    ).data;
  },
  async addMember(
    projectId: string,
    payload: {
      user_id: string;
      role: "field_supervisor" | "field_worker";
      contractor_name?: string;
      work_area_ids?: string[];
    },
  ) {
    return (await api.post(`/v1/planting-projects/${projectId}/members`, payload)).data;
  },
  async removeMember(projectId: string, memberId: string) {
    await api.delete(`/v1/planting-projects/${projectId}/members/${memberId}`);
  },
};

export const uploads = {
  async presignImage(file: File) {
    const presign = (
      await api.post<{ upload_url: string; s3_key: string; content_type: string }>(
        "/v1/uploads/presign",
        { filename: file.name, content_type: file.type || "image/jpeg" },
      )
    ).data;
    await axios.put(presign.upload_url, file, {
      headers: { "Content-Type": presign.content_type },
    });
    return presign.s3_key;
  },
};

export const trees = {
  async list(params?: {
    page?: number;
    page_size?: number;
    health?: string;
    project_id?: string;
    work_area_id?: string;
  }) {
    return (await api.get("/v1/trees", { params })).data as {
      items: Tree[];
      page: number;
      page_size: number;
      total: number;
    };
  },
  async create(payload: {
    program_code?: string;
    species_text?: string;
    planted_at?: string;
    latitude: number;
    longitude: number;
    altitude_m?: number;
    accuracy_m?: number;
    plantation_id?: string;
    work_area_id?: string;
    photo_keys?: string[];
    metadata?: Record<string, unknown>;
  }) {
    return (await api.post("/v1/trees", payload)).data;
  },
  async get(id: string) {
    return (await api.get<TreeDetail>(`/v1/trees/${id}`)).data;
  },
  async regeotag(
    id: string,
    payload: {
      latitude: number;
      longitude: number;
      accuracy_m?: number;
      survival_status?: string;
      remarks?: string;
    },
  ) {
    return (await api.post<TreeDetail>(`/v1/trees/${id}/regeotag`, payload)).data;
  },
  async timeline(id: string) {
    return (await api.get(`/v1/trees/${id}/timeline`)).data as {
      tree_id: string;
      registered_at: string;
      current: {
        health: string;
        carbon_kg: number;
        satellite_verified: boolean;
      };
    };
  },
  async analyses(id: string) {
    return (await api.get<TreeAnalysis[]>(`/v1/trees/${id}/analyses`)).data;
  },
  async passportPdfUrl(id: string) {
    const res = await api.get(`/v1/trees/${id}/passport.pdf`, { responseType: "blob" });
    return URL.createObjectURL(res.data);
  },
  async imageBlobUrl(treeId: string, imageId: string) {
    const res = await api.get(`/v1/trees/${treeId}/images/${imageId}/file`, {
      responseType: "blob",
    });
    return URL.createObjectURL(res.data);
  },
  async analyze(id: string) {
    return (await api.post("/v1/tree-analysis", { tree_id: id, mode: "full" })).data;
  },
  async satellite(id: string) {
    return (await api.get<SatelliteSeries>(`/v1/satellite-monitoring/${id}`)).data;
  },
};

export const satelliteHealth = {
  async analyzeTree(treeId: string) {
    return (
      await api.post<import("@/components/satellite-health-panel").SatelliteHealthAnalysis>(
        `/v1/satellite-health/trees/${treeId}`,
      )
    ).data;
  },
  async latestTree(treeId: string) {
    return (
      await api.get<import("@/components/satellite-health-panel").SatelliteHealthAnalysis>(
        `/v1/satellite-health/trees/${treeId}/latest`,
      )
    ).data;
  },
  async analyzeFence(fenceId: string) {
    return (
      await api.post<import("@/components/satellite-health-panel").SatelliteHealthAnalysis>(
        `/v1/satellite-health/plantation-fences/${fenceId}`,
      )
    ).data;
  },
  async latestFence(fenceId: string) {
    return (
      await api.get<import("@/components/satellite-health-panel").SatelliteHealthAnalysis>(
        `/v1/satellite-health/plantation-fences/${fenceId}/latest`,
      )
    ).data;
  },
};

export const bhoonidhi = {
  async status() {
    return (await api.get("/v1/bhoonidhi/status")).data as {
      configured: boolean;
      api_url: string;
      ip_whitelist_required: boolean;
      registration_email: string;
      default_collections: string[];
      message: string;
    };
  },
  async fenceCatalog(fenceId: string, params?: { days_back?: number; limit?: number }) {
    return (await api.get(`/v1/bhoonidhi/plantation-fences/${fenceId}/catalog`, { params }))
      .data as {
      fence_id: string;
      fence_name: string;
      search: {
        provider: string;
        returned: number;
        limit: number;
        scenes: Array<{
          id: string;
          collection: string | null;
          datetime: string | null;
          online: string | null;
          download_path: string | null;
          properties: Record<string, unknown>;
        }>;
      };
    };
  },
};

export const plantationFences = {
  async list(params?: { page?: number; page_size?: number }) {
    return (await api.get("/v1/plantation-fences", { params })).data as {
      items: PlantationFence[];
      page: number;
      page_size: number;
      total: number;
    };
  },
  async create(payload: { name: string; boundary: GeoJsonPolygon }) {
    return (await api.post<PlantationFence>("/v1/plantation-fences", payload)).data;
  },
  async get(id: string) {
    return (await api.get<PlantationFence>(`/v1/plantation-fences/${id}`)).data;
  },
  async remove(id: string) {
    await api.delete(`/v1/plantation-fences/${id}`);
  },
  async scan(id: string) {
    return (await api.post<PlantationSatelliteRecord>(`/v1/plantation-fences/${id}/scan`))
      .data;
  },
  async satellite(id: string) {
    return (
      await api.get<PlantationSatelliteSeries>(`/v1/plantation-fences/${id}/satellite-monitoring`)
    ).data;
  },
  async weather(id: string, days = 5) {
    return (
      await api.get(`/v1/plantation-fences/${id}/weather`, { params: { days } })
    ).data as import("@/components/weather-forecast").WeatherForecast;
  },
  async biodiversity(id: string) {
    return (await api.get(`/v1/plantation-fences/${id}/biodiversity`)).data as FenceBiodiversity;
  },
  async ecosystemHealth(id: string) {
    return (await api.get(`/v1/plantation-fences/${id}/ecosystem-health`)).data as EcosystemHealth;
  },
  async pestIntel(id: string) {
    return (await api.get(`/v1/plantation-fences/${id}/pest-intel`)).data;
  },
};

export type FenceBiodiversity = {
  fence_id: string;
  fence_name: string;
  recording_count: number;
  avg_health_score: number;
  avg_shannon_index: number;
  avg_simpson_index: number;
  total_species_detected: number;
  threatened_species_count: number;
  taxon_breakdown: Record<string, number>;
  species_list: Array<{
    scientific_name: string;
    common_name: string;
    taxon_group: string;
    call_count: number;
    iucn_status: string;
  }>;
};

export type EcosystemHealth = {
  fence_id: string;
  fence_name: string;
  area_ha: number | null;
  bioacoustic: FenceBiodiversity;
  ndvi_mean: number | null;
  ndvi_trend: string | null;
  ndvi_series: Array<{ date: string; ndvi: number }>;
  satellite_health: Record<string, unknown>;
  correlation_score: number | null;
  ecosystem_health_score: number;
  interpretation: string;
};

export const weather = {
  async forecast(latitude: number, longitude: number, days = 5) {
    return (
      await api.get("/v1/weather/forecast", {
        params: { latitude, longitude, days },
      })
    ).data as import("@/components/weather-forecast").WeatherForecast;
  },
};

export const alerts = {
  async list(unreadOnly = false) {
    return (
      await api.get("/v1/alerts", { params: unreadOnly ? { unread_only: true } : {} })
    ).data as AlertItem[];
  },
  async markRead(alertId: string) {
    return (await api.post(`/v1/alerts/${alertId}/read`)).data;
  },
  async getPreferences() {
    return (await api.get("/v1/alerts/preferences")).data as NotificationPreferences;
  },
  async updatePreferences(prefs: Partial<NotificationPreferences>) {
    return (await api.patch("/v1/alerts/preferences", prefs)).data as NotificationPreferences;
  },
};

export type AlertItem = {
  id: string;
  kind: string;
  severity: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  tree_id: string | null;
  payload?: Record<string, unknown>;
};

export type NotificationPreferences = {
  satellite_health: {
    enabled: boolean;
    channels: string[];
    sms_on_critical: boolean;
  };
  survival_survey?: {
    enabled: boolean;
    survey_interval_days: number;
    channels: string[];
  };
  threat_watch?: {
    enabled: boolean;
    channels: string[];
    sms_on_critical: boolean;
  };
};

export const dashboard = {
  async get() {
    return (await api.get<Dashboard>("/v1/dashboard")).data;
  },
  async threatWatch() {
    return (
      await api.get<import("@/components/dashboard/threat-watch-panel").ThreatWatchData>(
        "/v1/dashboard/threat-watch",
      )
    ).data;
  },
};

export type IntelligenceSummary = {
  generated_at: string;
  integrations: { status: string; integrations: Record<string, unknown> };
  threat_summary: {
    sites_monitored: number;
    weather_alerts_count: number;
    pest_high_count: number;
    locust_watch_count: number;
    highest_risk: string;
  };
  threat_sites: Array<{
    work_area_id: string;
    work_area_name: string;
    project_id: string | null;
    project_name: string | null;
    composite_risk: string;
    pest_control_needed: boolean;
    disease_control_needed: boolean;
    rain_mm_next_48h: number;
    ndvi_trend: string | null;
    tree_count: number;
    forecast_summary: string;
    weather_alerts: Array<{ kind: string; severity: string; title: string; message: string }>;
    early_warnings: Array<{
      kind: string;
      severity: string;
      title: string;
      message: string;
      work_area_id?: string;
      work_area_name?: string;
    }>;
  }>;
  pest_hotspots: Array<{
    work_area_id: string;
    work_area_name: string;
    project_id: string | null;
    project_name: string | null;
    composite_risk: string;
    pest_control_needed: boolean;
    disease_control_needed: boolean;
    rain_mm_next_48h: number;
    forecast_summary: string;
  }>;
  weather_alerts: Array<{
    work_area_id: string;
    work_area_name: string;
    project_id: string | null;
    alert: { kind: string; severity: string; title: string; message: string };
  }>;
  early_warnings: Array<{
    work_area_id: string;
    work_area_name: string;
    project_id: string | null;
    kind: string;
    severity: string;
    title: string;
    message: string;
  }>;
  biodiversity: {
    work_areas_with_snapshots: number;
    unique_species_in_latest_snapshots: number;
  };
  satellite_fusion?: {
    summary: {
      work_areas_tracked: number;
      stale_sentinel_scans: number;
      aligned_dual_source: number;
      sentinel_configured: boolean;
      bhoonidhi_configured: boolean;
    };
    sites: Array<{
      work_area_id: string;
      work_area_name: string;
      fusion_status: string;
      recommended_action: string;
      sentinel: { latest_ndvi: number | null; days_since_scan: number | null; ndvi_trend: string };
      bhoonidhi: { scenes_available: number; latest_scene_at: string | null };
    }>;
  };
  highest_risk: string;
  weather_alert_count: number;
  pest_high_count: number;
  project_count: number;
  tree_count: number;
};

export const intelligence = {
  async summary(siteLimit = 15, options?: { fast?: boolean }) {
    return (
      await api.get<IntelligenceSummary>("/v1/intelligence/summary", {
        params: { site_limit: siteLimit, fast: options?.fast ?? true },
        timeout: 45_000,
      })
    ).data;
  },
  async integrations() {
    return (
      await api.get<{ status: string; integrations: Record<string, unknown> }>(
        "/v1/intelligence/integrations",
      )
    ).data;
  },
  async satelliteFusion(siteLimit = 15, liveBhoonidhiLimit = 5) {
    return (
      await api.get<{
        generated_at: string;
        summary: {
          work_areas_tracked: number;
          sites_in_view: number;
          stale_sentinel_scans: number;
          aligned_dual_source: number;
          sentinel_only: number;
          bhoonidhi_only: number;
          sentinel_configured: boolean;
          bhoonidhi_configured: boolean;
        };
        sites: Array<{
          work_area_id: string;
          work_area_name: string;
          project_id: string | null;
          project_name: string | null;
          fusion_status: string;
          recommended_action: string;
          sentinel: {
            latest_ndvi: number | null;
            days_since_scan: number | null;
            ndvi_trend: string;
            stale?: boolean;
          };
          bhoonidhi: {
            scenes_available: number;
            latest_scene_at: string | null;
            collections: string[];
          };
        }>;
      }>("/v1/intelligence/satellite-fusion", {
        params: { site_limit: siteLimit, live_bhoonidhi_limit: liveBhoonidhiLimit },
      })
    ).data;
  },
};

export const carbon = {
  async estimate(payload: {
    species: string;
    dbh_cm?: number;
    height_m?: number;
    age_years?: number;
    methodology?: "IPCC_AR6" | "VERRA_VM0047" | "GOLD_STANDARD_LUF";
    price_usd_per_credit?: number;
  }) {
    return (await api.post("/v1/carbon/estimate", payload)).data;
  },
};

export const assistant = {
  async query(prompt: string) {
    return (
      await api.post<{ answer: string; calculations: Record<string, number>; citations: string[] }>(
        "/v1/assistant/query",
        { prompt }
      )
    ).data;
  },
};

export type BioacousticSpecies = {
  scientific_name: string;
  common_name: string;
  taxon_group: string;
  confidence: number;
  call_count: number;
  iucn_status: string;
  population_trend: string;
  threat_status: string;
  iucn_taxon_id: string | null;
  iucn_url: string | null;
  gbif_usage_key?: number | null;
  regional_occurrence_match?: boolean | null;
  needs_review?: boolean;
  is_native?: boolean;
  time_intervals?: Array<{ start_sec: number; end_sec: number }>;
  metadata_sources?: { gbif?: boolean; iucn?: string };
  pipeline_source?: string;
};

export type RegionalFauna = {
  latitude: number;
  longitude: number;
  radius_km: number;
  provider: string;
  species_count: number;
  taxon_breakdown: Record<string, number>;
  species: Array<{
    scientific_name: string;
    common_name: string;
    taxon_group: string;
    gbif_usage_key: number;
    occurrence_count: number;
    iucn_status: string;
    iucn_url: string | null;
  }>;
  iucn_live: boolean;
};

export type BioacousticRecording = {
  id: string;
  s3_key: string;
  duration_seconds: number;
  recorded_at: string;
  latitude: number | null;
  longitude: number | null;
  plantation_fence_id: string | null;
  status: string;
  preprocessing?: {
    analysis_pipeline?: string;
    spl_metrics?: {
      avg_db_spl_approx?: number;
      max_db_spl_approx?: number;
      background_db_spl_approx?: number;
      snr_db_approx?: number;
      warning_high_noise?: boolean;
      environment_hint?: string;
    };
    ecoacoustic_indices?: EcoacousticIndices;
  };
  species_detections: BioacousticSpecies[];
  total_species_count: number | null;
  total_calls_detected: number | null;
  shannon_diversity_index: number | null;
  simpson_diversity_index: number | null;
  bioacoustic_health_score: number | null;
  ai_confidence_score: number | null;
  analysis_summary: string | null;
  analysis_error: string | null;
  analyzed_at: string | null;
  created_at: string;
};

export type EcoacousticIndices = {
  acoustic_complexity_index?: number;
  acoustic_diversity_index?: number;
  acoustic_evenness_index?: number;
  bioacoustic_index?: number;
  ndsi?: number;
  aci_normalized?: number;
};

export type BioacousticAnalyzeJob = {
  recording_id: string;
  status: string;
  celery_task_id: string | null;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const bioacoustic = {
  async presign(filename: string, contentType = "audio/webm") {
    return (
      await api.post<{ upload_url: string; s3_key: string; content_type: string }>(
        "/v1/uploads/presign",
        { filename, content_type: contentType }
      )
    ).data;
  },
  async uploadDirect(form: FormData) {
    const uploadBase = resolveDirectUploadApiBaseUrl();
    const tok =
      typeof window !== "undefined" ? localStorage.getItem("byot_access_token") : null;
    const { data } = await axios.post<BioacousticRecording>(
      `${uploadBase}/v1/bioacoustic/recordings/upload`,
      form,
      {
        headers: {
          ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
        },
        maxBodyLength: 25 * 1024 * 1024,
        maxContentLength: 25 * 1024 * 1024,
      }
    );
    return data;
  },
  async register(payload: {
    s3_key: string;
    duration_seconds: number;
    latitude: number;
    longitude: number;
    plantation_fence_id?: string;
  }) {
    return (await api.post<BioacousticRecording>("/v1/bioacoustic/recordings", payload)).data;
  },
  async list() {
    return (await api.get<BioacousticRecording[]>("/v1/bioacoustic/recordings")).data;
  },
  async get(id: string) {
    return (await api.get<BioacousticRecording>(`/v1/bioacoustic/recordings/${id}`)).data;
  },
  async pollUntilAnalyzed(id: string, attempts = 90, intervalMs = 2000) {
    for (let i = 0; i < attempts; i++) {
      const rec = await bioacoustic.get(id);
      if (rec.status === "analyzed") return rec;
      if (rec.status === "failed") {
        throw new Error(rec.analysis_error || "Bioacoustic analysis failed");
      }
      await sleep(intervalMs);
    }
    throw new Error("Bioacoustic analysis timed out");
  },
  async analyze(id: string, options?: { force?: boolean }) {
    const job = (
      await api.post<BioacousticAnalyzeJob>(
        `/v1/bioacoustic/recordings/${id}/analyze`,
        undefined,
        { params: options?.force ? { force: true } : undefined }
      )
    ).data;
    if (job.status === "analyzed") {
      return bioacoustic.get(id);
    }
    return bioacoustic.pollUntilAnalyzed(id);
  },
  async summary(plantationFenceId?: string) {
    return (await api.get("/v1/bioacoustic/summary", {
      params: plantationFenceId ? { plantation_fence_id: plantationFenceId } : undefined,
    })).data as {
      total_recordings: number;
      analyzed_recordings: number;
      avg_health_score: number;
      avg_shannon_index: number;
      avg_simpson_index: number;
      total_species_detected: number;
      threatened_species_count: number;
      taxon_breakdown: Record<string, number>;
      recent_recordings: BioacousticRecording[];
    };
  },
  async regionalFauna(latitude: number, longitude: number, taxonGroup?: string) {
    return (
      await api.get<RegionalFauna>("/v1/bioacoustic/regional-fauna", {
        params: {
          latitude,
          longitude,
          ...(taxonGroup ? { taxon_group: taxonGroup } : {}),
        },
      })
    ).data;
  },
  async queueReport(plantationFenceId: string, kind: "biodiversity" | "esg" = "biodiversity") {
    return (
      await api.post(`/v1/reports?kind=${kind}&format=pdf&plantation_fence_id=${plantationFenceId}`)
    ).data as { id: string; status: string; download_ready?: boolean };
  },
};

export type CreditLedgerStatus = "estimated" | "verified" | "buffered" | "issued";

export type CreditLedger = {
  id: string;
  project_id: string;
  organization_id: string | null;
  methodology: string;
  status: CreditLedgerStatus;
  tree_count: number;
  gross_credits_tco2e: number;
  buffer_pct: number;
  buffer_withheld_tco2e: number;
  net_credits_tco2e: number;
  issued_credits_tco2e: number | null;
  registry_reference: string | null;
  engine_version: string;
  strata: Array<{
    species: string;
    age_cohort: string;
    tree_count: number;
    carbon_kg: number;
    co2e_kg: number;
    credits_tco2e: number;
  }>;
  last_computed_at: string;
  disclaimer: string;
  events: Array<{
    id: string;
    from_status: string | null;
    to_status: string;
    notes: string | null;
    registry_reference: string | null;
    created_at: string;
  }>;
};

export const credits = {
  async orgSummary() {
    return (
      await api.get<{
        project_count: number;
        by_status: Record<string, number>;
        total_gross_credits_tco2e: number;
        total_buffer_withheld_tco2e: number;
        total_net_credits_tco2e: number;
        total_issued_credits_tco2e: number;
      }>("/v1/credits/summary")
    ).data;
  },
  async projectLedger(projectId: string) {
    return (await api.get<CreditLedger>(`/v1/credits/projects/${projectId}`)).data;
  },
  async syncProject(
    projectId: string,
    methodology: "IPCC_AR6" | "VERRA_VM0047" | "GOLD_STANDARD_LUF" = "VERRA_VM0047",
  ) {
    return (
      await api.post<CreditLedger>(`/v1/credits/projects/${projectId}/sync`, { methodology })
    ).data;
  },
  async transitionProject(
    projectId: string,
    payload: {
      to_status: CreditLedgerStatus;
      notes?: string;
      registry_reference?: string;
    },
  ) {
    return (
      await api.post<CreditLedger>(`/v1/credits/projects/${projectId}/transition`, payload)
    ).data;
  },
};

export type FrameworkProfileCode =
  | "ipcc_ar6"
  | "verra_vm0047"
  | "gold_standard_luf"
  | "redd_plus"
  | "paris_ndc"
  | "ngt_campa"
  | "esg_general";

export type FrameworkProfile = {
  code: FrameworkProfileCode;
  title: string;
  short_label: string;
  methodology: string;
  description: string;
  reference: string;
};

export const reporting = {
  async frameworks() {
    return (await api.get<FrameworkProfile[]>("/v1/reporting/frameworks")).data;
  },
};

export type ChecklistCode =
  | "verra_vm0047"
  | "gold_standard_luf"
  | "redd_plus"
  | "ngt_campa"
  | "esg_general";

export type ChecklistAnswer = "yes" | "no" | "partial" | "na";

export type ChecklistEligibilityStatus =
  | "not_started"
  | "in_progress"
  | "eligible"
  | "gaps_identified"
  | "not_eligible";

export type ChecklistSummary = {
  code: ChecklistCode;
  title: string;
  short_label: string;
  completion_pct: number;
  score_pct: number;
  eligibility_status: ChecklistEligibilityStatus;
  updated_at: string | null;
};

export type ChecklistItem = {
  id: string;
  category: string;
  question: string;
  guidance: string;
  required: boolean;
  auto_key: string | null;
  answer: ChecklistAnswer | null;
  notes: string | null;
  source: "user" | "auto" | null;
  suggested_answer: ChecklistAnswer | null;
};

export type ProjectChecklistState = {
  checklist: {
    code: ChecklistCode;
    title: string;
    short_label: string;
    framework_reference: string;
    description: string;
    disclaimer: string;
  };
  project_id: string;
  responses: Record<string, { answer?: ChecklistAnswer; notes?: string }>;
  items: ChecklistItem[];
  completion_pct: number;
  score_pct: number;
  eligibility_status: ChecklistEligibilityStatus;
  gaps: Array<{ item_id: string; question: string; answer: ChecklistAnswer; category: string }>;
  answered_required: number;
  required_count: number;
  updated_at: string | null;
};

export const compliance = {
  async checklists() {
    return (
      await api.get<
        Array<{
          code: ChecklistCode;
          title: string;
          short_label: string;
          framework_reference: string;
          description: string;
          disclaimer: string;
          item_count: number;
        }>
      >("/v1/compliance/checklists")
    ).data;
  },
  async projectSummaries(projectId: string) {
    return (await api.get<ChecklistSummary[]>(`/v1/compliance/projects/${projectId}/checklists`))
      .data;
  },
  async projectChecklist(projectId: string, code: ChecklistCode) {
    return (
      await api.get<ProjectChecklistState>(
        `/v1/compliance/projects/${projectId}/checklists/${code}`,
      )
    ).data;
  },
  async saveProjectChecklist(
    projectId: string,
    code: ChecklistCode,
    answers: Record<string, { answer?: ChecklistAnswer; notes?: string }>,
  ) {
    return (
      await api.put<ProjectChecklistState>(
        `/v1/compliance/projects/${projectId}/checklists/${code}`,
        { answers },
      )
    ).data;
  },
};

export type WebhookEventType =
  | "tree.registered"
  | "tree.updated"
  | "compliance.violation.resolved"
  | "project.mrv.exported"
  | "project.evidence_bundle.generated"
  | "project.framework_report.exported"
  | "project.credit_ledger.updated"
  | "compliance.checklist.updated"
  | "webhook.test";

export type WebhookEndpoint = {
  id: string;
  label: string;
  url: string;
  events: WebhookEventType[];
  enabled: boolean;
  signing_secret_preview: string;
  created_at: string;
  updated_at: string;
};

export type WebhookEndpointCreated = WebhookEndpoint & { signing_secret: string };

export type WebhookDelivery = {
  id: string;
  webhook_id: string;
  event_type: string;
  status: string;
  attempt_count: number;
  response_status: number | null;
  error_message: string | null;
  delivered_at: string | null;
  created_at: string;
  payload: Record<string, unknown>;
};

export const webhooks = {
  async events() {
    return (await api.get<WebhookEventType[]>("/v1/webhooks/events")).data;
  },
  async list() {
    return (await api.get<WebhookEndpoint[]>("/v1/webhooks")).data;
  },
  async create(payload: { label: string; url: string; events: WebhookEventType[] }) {
    return (await api.post<WebhookEndpointCreated>("/v1/webhooks", payload)).data;
  },
  async update(id: string, payload: Partial<{ label: string; url: string; events: WebhookEventType[]; enabled: boolean }>) {
    return (await api.patch<WebhookEndpoint>(`/v1/webhooks/${id}`, payload)).data;
  },
  async remove(id: string) {
    return (await api.delete<{ status: string }>(`/v1/webhooks/${id}`)).data;
  },
  async rotateSecret(id: string) {
    return (await api.post<WebhookEndpointCreated>(`/v1/webhooks/${id}/rotate-secret`)).data;
  },
  async test(id: string) {
    return (await api.post<WebhookDelivery>(`/v1/webhooks/${id}/test`)).data;
  },
  async deliveries(limit = 50) {
    return (await api.get<WebhookDelivery[]>("/v1/webhooks/deliveries", { params: { limit } })).data;
  },
};

export type VerificationLink = {
  id: string;
  token: string;
  resource_type: "planting_project" | "tree";
  resource_id: string;
  label: string;
  public_url: string;
  expires_at: string | null;
  revoked_at: string | null;
  view_count: number;
  last_viewed_at: string | null;
  created_at: string;
};

export type PublicVerificationPayload = {
  resource_type: "planting_project" | "tree";
  snapshot_sha256: string;
  generated_at: string;
  disclaimer: string;
  project?: {
    code: string;
    name: string;
    segment: string;
    status: string;
    compliance_mode: string;
  };
  summary?: {
    tree_count: number;
    work_area_count: number;
    open_violations: number;
    native_species_pct: number | null;
  };
  credit_ledger?: {
    status: string | null;
    net_credits_tco2e: number | null;
    methodology: string | null;
  };
  checklists?: Array<{ code: string; eligibility_status: string; score_pct: number }>;
  sample_trees?: Array<{
    public_code: string;
    species: string;
    health: string;
    carbon_kg: number;
    geo_tagged: boolean;
  }>;
  tree?: {
    public_code: string;
    species: string;
    health: string;
    status: string;
    carbon_kg: number;
    satellite_verified: boolean;
  };
  link?: { label: string; created_at: string; view_count: number };
};

export const verification = {
  async publicSnapshot(token: string) {
    return (await api.get<PublicVerificationPayload>(`/v1/public/verify/${token}`)).data;
  },
  async list(params?: { project_id?: string }) {
    return (await api.get<VerificationLink[]>("/v1/verification-links", { params })).data;
  },
  async create(payload: {
    resource_type: "planting_project" | "tree";
    resource_id: string;
    label?: string;
    expires_in_days?: number;
  }) {
    return (await api.post<VerificationLink>("/v1/verification-links", payload)).data;
  },
  async revoke(id: string) {
    return (await api.delete<{ status: string }>(`/v1/verification-links/${id}`)).data;
  },
};

export type AuditLog = {
  id: string;
  actor_user_id: string | null;
  organization_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  ip: string | null;
  user_agent: string | null;
  diff: Record<string, unknown> | null;
  created_at: string;
};

export const audit = {
  async logs(params?: {
    page?: number;
    page_size?: number;
    action?: string;
    resource_type?: string;
    resource_id?: string;
  }) {
    return (
      await api.get<{ items: AuditLog[]; total: number; page: number; page_size: number }>(
        "/v1/audit/logs",
        { params },
      )
    ).data;
  },
};
