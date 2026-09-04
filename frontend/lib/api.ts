/**
 * Thin axios wrapper for the BYOT REST API.
 * Reads `byot_access_token` from localStorage and sends it as Bearer.
 */
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { authErrorMessage, paymentErrorMessage } from "@/lib/auth-payment-messages";
import { orgFeatureDisabledMessage } from "@/lib/org-feature-flags";
import { humanizeValidationErrors } from "@/lib/tree-validation-errors";
import { useAuth } from "@/lib/auth-store";

function isAranyixHost(host: string): boolean {
  return host === "aranyix.tech" || host === "www.aranyix.tech" || host.endsWith(".aranyix.tech");
}

function normalizeApiBase(raw: string): string {
  const base = raw.replace(/\/$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
}

/** Resolve API base URL at call time (never rely on module-load / SSR values in the browser). */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (isAranyixHost(host)) {
      // Production default: same-origin /api via Caddy (see infrastructure/hostinger/Caddyfile).
      // Override only when NEXT_PUBLIC_API_URL is set at frontend build time.
      const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
      if (raw) return normalizeApiBase(raw);
      return "/api";
    }
    if (host === "localhost" || host === "127.0.0.1") {
      const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
      if (!raw) return "/api";
      return normalizeApiBase(raw);
    }
  }
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) return "/api";
  return normalizeApiBase(raw);
}

/** @deprecated Use getApiBaseUrl() — kept for logging only. */
export const API_URL = typeof window !== "undefined" ? getApiBaseUrl() : "/api";

function resolveDirectUploadApiBaseUrl(): string {
  return getApiBaseUrl();
}

export const api: AxiosInstance = axios.create({
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    // Axios default Content-Type: application/json breaks multipart boundary.
    const headers = config.headers;
    if (headers && typeof headers.delete === "function") {
      headers.delete("Content-Type");
      headers.delete("content-type");
    }
  }
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
    const { data } = await axios.post<Tokens>(`${getApiBaseUrl()}/v1/auth/refresh`, {
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
      void useAuth.getState().logout();
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
        if (host === "www.aranyix.tech") {
          return "Cannot reach the API on www.aranyix.tech (SSL not configured). Open https://aranyix.tech instead (no www).";
        }
        const reqUrl = `${err.config?.baseURL ?? ""}${err.config?.url ?? ""}`;
        if (/minio|:9000|\/media\/|amazonaws|cloudfront|stub\.local/i.test(reqUrl)) {
          return "Photo storage is not reachable from the browser. Upload through the API instead — rebuild/redeploy the frontend.";
        }
        const base = getApiBaseUrl();
        const sameOriginProbe =
          typeof window !== "undefined"
            ? `${window.location.origin}/api/v1/health/live`
            : "https://aranyix.tech/api/v1/health/live";
        return `Cannot reach the API (${base}). Open ${sameOriginProbe} in a new tab — if that works, hard refresh (Ctrl+Shift+R). If not, on the VPS run: cd infrastructure/hostinger && ./recover-backend.sh`;
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
    const apiErr = data?.error;
    if (apiErr) {
      const details = apiErr.details as
        | {
            compliance_errors?: Array<{ message: string }>;
            validation_errors?: string[];
          }
        | undefined;
      if (details?.compliance_errors?.length) {
        return details.compliance_errors.map((e) => e.message).join("; ");
      }
      if (details?.validation_errors?.length) {
        return humanizeValidationErrors(details.validation_errors);
      }
      if (apiErr.message && apiErr.message !== "Error") {
        return apiErr.message;
      }
    }
    if (typeof data?.detail === "object" && !Array.isArray(data.detail)) {
      const detail = data.detail as {
        code?: string;
        message?: string;
        compliance_errors?: Array<{ message: string }>;
        validation_errors?: string[];
      };
      if (detail.code === "ai_scan_limit_exceeded" && detail.message) {
        return detail.message;
      }
      if (detail.compliance_errors?.length) {
        return detail.compliance_errors.map((e) => e.message).join("; ");
      }
      if (detail.validation_errors?.length) {
        return humanizeValidationErrors(detail.validation_errors);
      }
    }
    if (typeof data?.detail === "string") {
      if (err.response.status === 404 && data.detail === "Not Found") {
        return "API route not found (404). Rebuild the frontend: make fix-frontend";
      }
      if (data.detail === "storage_upload_failed") {
        return "Photo storage failed. Check MinIO/S3 on the server.";
      }
      if (data.detail === "empty_file") {
        return "That photo file is empty. Choose a JPG or PNG and try again.";
      }
      if (data.detail === "image_too_large") {
        return "Photo is too large (max 12 MB). Compress the JPG and try again.";
      }
      if (data.detail === "recording_create_failed") {
        return "Could not save recording. Run database migration: alembic upgrade head";
      }
      if (data.detail === "credit_ledger_migration_required") {
        return "Credit ledger database migration required. On the server run: alembic upgrade head.";
      }
      if (data.detail === "emissions_migration_required") {
        return "GHG emissions tables need migration. On the VPS run: cd infrastructure/hostinger && docker compose -f docker-compose.prod.yml --env-file .env.production exec backend alembic upgrade head";
      }
      if (data.detail === "tropomi_fetch_failed") {
        return "TROPOMI CH₄ scan failed (Copernicus Sentinel Hub). Check SENTINEL_HUB_CLIENT_ID/SECRET on the server and retry.";
      }
      if (data.detail === "met_fetch_failed") {
        return "Wind data for dispersion could not be fetched from Open-Meteo. Retry in a few minutes.";
      }
      if (data.detail === "fusion_requires_dispersion") {
        return "Run a dispersion simulation before fusion assessment.";
      }
      if (data.detail === "fusion_requires_scan") {
        return "Run a TROPOMI CH₄ scan before fusion assessment.";
      }
      if (data.detail === "mixed_gas_types") {
        return "Dispersion runs must use sources of the same gas. Select one gas for the plume simulation.";
      }
      const paymentMsg = paymentErrorMessage(data.detail);
      if (paymentMsg) return paymentMsg;
      const authMsg = authErrorMessage(data.detail);
      if (authMsg) return authMsg;
      if (data.detail === "viewer_read_only") {
        return "Your viewer role is read-only. Ask your program manager to change your access.";
      }
      if (data.detail.startsWith("org_feature_disabled:")) {
        const key = data.detail.slice("org_feature_disabled:".length);
        return orgFeatureDisabledMessage(key);
      }
      if (err.response.status === 500 && err.config?.url?.includes("/credits/")) {
        return `${data.detail}. Credit ledger may need migration 0015_credit_ledger — run: alembic upgrade head on the server.`;
      }
      if (err.response.status === 503 && err.config?.url?.includes("/credits/")) {
        return "Credit ledger tables need migration. On the server run: alembic upgrade head";
      }
      if (
        err.response.status === 503 &&
        (err.config?.url?.includes("/dispersion/") ||
          err.config?.url?.includes("/emission-sources") ||
          err.config?.url?.includes("/satellite-scan"))
      ) {
        return "GHG emissions tables need migration. On the VPS run: cd infrastructure/hostinger && docker compose -f docker-compose.prod.yml --env-file .env.production exec backend alembic upgrade head";
      }
      if (err.response.status === 500 && err.config?.url?.includes("/satellite-scan")) {
        return "TROPOMI scan failed on the server. Run alembic upgrade head, verify Sentinel Hub credentials, then check backend logs.";
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
  organization_name?: string | null;
  is_org_admin?: boolean;
  org_role?: string | null;
  enrolled_program_codes?: string[];
  has_professional_program?: boolean;
  onboarding_status?: string;
  pending_program_code?: string | null;
  pending_access_request_id?: string | null;
  permissions?: string[];
  platform_access?: {
    website_cms: boolean;
    users_admin: boolean;
    program_access_admin: boolean;
    billing_admin: boolean;
    ops_admin: boolean;
  };
  impersonation?: {
    admin_user_id: string;
    admin_email: string;
    read_only?: boolean;
  } | null;
  locale?: string;
  phone?: string | null;
  date_of_birth?: string | null;
  date_of_marriage?: string | null;
  city?: string | null;
  state?: string | null;
  age?: number | null;
  has_password?: boolean;
  audience?: string | null;
  audience_onboarding_required?: boolean;
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
  status: "draft" | "pending" | "approved" | "rejected" | "withdrawn";
  message: string | null;
  org_profile?: Record<string, unknown> | null;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export type OnboardingState = {
  status: string;
  program_code: string | null;
  program_name: string | null;
  access_request_id: string | null;
  admin_note: string | null;
};

export type OrgProfilePayload = {
  organization_name: string;
  organization_type: "government" | "corporate" | "ngo";
  designation: string;
  city: string;
  state: string;
  country?: string;
  work_email?: string;
  contact_phone?: string;
  website?: string;
  registered_address?: string;
  registration_id?: string;
  department?: string;
  use_case_summary: string;
};

export type AiScanMeterStatus = {
  tier: "byot_metered" | "professional_unlimited" | "platform_admin";
  complimentary_limit: number;
  complimentary_used: number;
  purchased_balance: number;
  remaining_complimentary: number;
  remaining_total: number | null;
  can_scan: boolean;
  requires_payment: boolean;
  payment_enabled: boolean;
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
  work_area_name?: string | null;
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
  taken_at?: string | null;
};

export type TreeRiskScore = {
  gps_photo_match: boolean;
  duplicate_photo: boolean;
  duplicate_coordinate: boolean;
  ai_confidence_low: boolean;
  regeotag_mismatch: boolean;
  composite_risk: number;
  field_score?: number | null;
  satellite_score?: number | null;
  fusion_score?: number | null;
  credit_eligible?: boolean;
  fusion_details?: Record<string, unknown>;
  details: Record<string, unknown>;
};

export type TreeDetail = {
  id: string;
  public_code: string;
  owner_user_id: string;
  program_code: string | null;
  species_text: string | null;
  status: string;
  verification_status: string;
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
  risk_score: TreeRiskScore | null;
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

export type ScanHistoryRow = {
  scan_date: string;
  fence_id: string;
  fence_name: string;
  ndvi_mean: number | null;
  ndvi_change_vs_baseline: number | null;
  cloud_cover_pct: number | null;
  ndvi_provider: string | null;
  sar_provider: string | null;
  forest_integrity_score: number | null;
  integrity_grade: string | null;
  sar_monitoring_mode: string | null;
  sar_ground_status: string | null;
  sar_risk_level: string | null;
  scene_ids: string[];
};

export type ScanHistoryResponse = {
  project_id?: string | null;
  fence_id?: string | null;
  rows: ScanHistoryRow[];
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
    co2e_kg_lower_90?: number | null;
    co2e_kg_upper_90?: number | null;
    uncertainty_pct?: number | null;
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

export type OtpConfig = {
  sms_enabled: boolean;
  sms_configured: boolean;
  sms_template_configured: boolean;
  email_enabled: boolean;
  email_configured: boolean;
  invite_sms_enabled: boolean;
  invite_sms_configured: boolean;
  dev_otp_allowed: boolean;
};

export const auth = {
  async captchaConfig() {
    return (await api.get<CaptchaConfig>("/v1/auth/captcha-config")).data;
  },
  async otpConfig() {
    return (await api.get<OtpConfig>("/v1/auth/otp-config")).data;
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
    signup_category?: string;
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
      await api.post<{ status: string; dev_hint?: string | null; email_enabled?: boolean }>(
        "/v1/auth/signup/send-email-otp",
        payload,
      )
    ).data;
  },
  async signupComplete(payload: { signup_token: string; code: string; signup_category?: string }) {
    return (await api.post<Tokens>("/v1/auth/signup/complete", payload)).data;
  },
  async login(email: string, password: string, captcha_token?: string) {
    return (await api.post<Tokens>("/v1/auth/login", { email, password, captcha_token })).data;
  },
  async requestPasswordReset(email: string, captcha_token?: string) {
    return (
      await api.post<{ status: string; dev_hint?: string | null; email_enabled?: boolean }>(
        "/v1/auth/password-reset/request",
        { email, captcha_token },
      )
    ).data;
  },
  async confirmPasswordReset(payload: {
    email: string;
    code: string;
    password: string;
    captcha_token?: string;
  }) {
    return (await api.post<Tokens>("/v1/auth/password-reset/confirm", payload)).data;
  },
  async me() {
    return (await api.get<User>("/v1/auth/me")).data;
  },
  async updateProfile(payload: import("@/lib/user-profile").UserProfilePayload) {
    return (await api.patch<User>("/v1/auth/me", payload)).data;
  },
  async changePassword(payload: { current_password: string; new_password: string }) {
    return (await api.post<{ status: string }>("/v1/auth/me/password", payload)).data;
  },
  async onboardingState() {
    return (await api.get<OnboardingState>("/v1/auth/onboarding")).data;
  },
  async submitOnboardingOrgProfile(payload: OrgProfilePayload) {
    return (await api.post<OnboardingState>("/v1/auth/onboarding/org-profile", payload)).data;
  },
  async refresh(refreshToken: string) {
    return (
      await api.post<Tokens>("/v1/auth/refresh", { refresh_token: refreshToken })
    ).data;
  },
  async logout(refreshToken: string) {
    return (await api.post<{ status: string }>("/v1/auth/logout", { refresh_token: refreshToken })).data;
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

export const aiScans = {
  async usage() {
    return (await api.get<AiScanMeterStatus>("/v1/ai-scans/usage")).data;
  },
};

export type ScanPack = {
  sku: string;
  label: string;
  description: string;
  credits: number;
  amount_paise: number;
  amount_inr: number;
  currency: string;
};

export type PaymentCheckoutSession = {
  order: {
    id: string;
    sku: string;
    credits_granted: number;
    amount_paise: number;
    currency: string;
    razorpay_order_id: string;
    status: string;
  };
  razorpay_key_id: string;
  amount_paise: number;
  currency: string;
  credits: number;
  label: string;
};

export type PaymentOrder = {
  id: string;
  sku: string;
  credits_granted: number;
  amount_paise: number;
  currency: string;
  razorpay_order_id: string;
  status: string;
  paid_at: string | null;
  created_at: string;
};

export const payments = {
  async catalog() {
    return (
      await api.get<{
        items: ScanPack[];
        payments_enabled: boolean;
        razorpay_key_id: string | null;
      }>("/v1/payments/catalog")
    ).data;
  },
  async createOrder(sku: string) {
    return (await api.post<PaymentCheckoutSession>("/v1/payments/orders", { sku })).data;
  },
  async verify(payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) {
    return (await api.post("/v1/payments/verify", payload)).data;
  },
  async listOrders() {
    return (await api.get<PaymentOrder[]>("/v1/payments/orders")).data;
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
  | "nagar_van_urban"
  | "sahakar_van_coop"
  | "ngo_watershed"
  | "nutri_garden"
  | "estate_monitoring"
  | "general";

export type ComplianceMode = "open" | "guided" | "strict";

export type CentralScheme = {
  code: string;
  label: string;
  description: string;
  ministry: string;
  group: "central" | "convergence" | "corporate" | "cooperative" | "state";
  program_codes: string[];
  default_segment: ProjectSegment;
  default_compliance_mode: ComplianceMode;
  default_template_code: string | null;
  checklist_codes: string[];
  framework_profiles: string[];
  convergence_allowed: string[];
  legacy_plantation_category: string | null;
  state_codes?: string[];
  kpi_targets: {
    survival_pct_min?: number | null;
    geo_tagged_pct_min?: number | null;
    min_trees?: number | null;
    scan_coverage_pct_min?: number | null;
    max_days_since_scan?: number | null;
  };
  metadata_sections: Record<string, unknown>[];
};

export const centralSchemes = {
  async list(params?: { programCode?: string; audience?: string; stateCode?: string }) {
    return (
      await api.get<{ items: CentralScheme[] }>("/v1/schemes", {
        params: {
          program_code: params?.programCode,
          audience: params?.audience,
          state_code: params?.stateCode,
        },
      })
    ).data.items;
  },
  async get(code: string) {
    return (await api.get<CentralScheme>(`/v1/schemes/${code}`)).data;
  },
};

export const audienceOnboarding = {
  async presets() {
    return (await api.get<{ items: import("@/lib/audience").AudiencePreset[] }>(
      "/v1/onboarding/audience-presets",
    )).data.items;
  },
  async select(audience: string) {
    return (await api.post<{ audience: string }>("/v1/onboarding/audience", { audience })).data;
  },
};

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
  scheme_code: string | null;
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

export type EmissionSource = {
  id: string;
  project_id: string;
  work_area_id: string;
  name: string;
  source_type: string;
  gas_type: string;
  geometry_kind: string;
  geometry: { type: string; coordinates: unknown };
  emission_rate_g_s: number | null;
  annual_emission_tons: number | null;
  release_height_m: number;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type EmissionGasCatalogItem = {
  code: string;
  label: string;
  symbol: string;
  unit_rate: string;
  unit_annual: string;
  satellite_supported: boolean;
  fusion_supported: boolean;
  suggested_source_types: string[];
};

export type EmissionSourceCatalogItem = {
  code: string;
  label: string;
  description: string;
};

export type EmissionCatalog = {
  gases: EmissionGasCatalogItem[];
  source_types: EmissionSourceCatalogItem[];
};

export type DispersionRunResult = {
  simulation_id: string;
  project_id: string;
  work_area_id: string;
  gas_type: string;
  emission_rate_g_s: number;
  wind_speed_ms: number;
  wind_direction_deg: number;
  stability_class: string;
  max_concentration_ug_m3: number;
  downwind_km: number;
  crosswind_km: number;
  inside_boundary: Record<string, unknown>;
  downwind_impact: Record<string, unknown>;
  contours: Array<{ threshold_ug_m3: number; geojson: Record<string, unknown> }>;
  met_snapshot: Record<string, unknown>;
};

export type TropomiScanResult = {
  id: string;
  project_id: string;
  work_area_id: string;
  gas_type: string;
  provider: string;
  buffer_km: number;
  roi_geojson: Record<string, unknown>;
  series: Array<{
    time: string;
    mean_ppb: number | null;
    min_ppb: number | null;
    max_ppb: number | null;
  }>;
  summary: {
    latest_time: string;
    latest_mean_ppb: number | null;
    baseline_ppb: number | null;
    anomaly_ppb: number | null;
    months: number;
  };
  status: string;
  created_at: string;
  updated_at: string;
};

export type EmissionFusionResult = {
  id: string;
  project_id: string;
  work_area_id: string;
  dispersion_simulation_id: string;
  satellite_scan_id: string;
  emission_source_ids: string[];
  alignment_score: number;
  verdict: "consistent" | "uncertain" | "misaligned" | "no_signal";
  result: {
    alignment_score: number;
    verdict: "consistent" | "uncertain" | "misaligned" | "no_signal";
    summary: string;
    anomaly_ppb: number | null;
    baseline_ppb: number | null;
    latest_mean_ppb: number | null;
    wind_speed_ms: number;
    wind_direction_deg: number;
    plume_extends_outside: boolean;
    downwind_km: number;
    scan_buffer_km: number;
    sources: Array<{
      emission_source_id: string;
      source_name: string;
      gas_type: string;
      emission_rate_g_s: number | null;
      alignment_score: number;
      verdict: string;
      wind_direction_deg: number;
      downwind_bearing_deg: number | null;
      bearing_delta_deg: number | null;
      findings: Array<{ category: string; name: string; severity: string; message: string }>;
    }>;
    findings: Array<{ category: string; name: string; severity: string; message: string }>;
    pipeline: string;
  };
  status: string;
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

export type RegistrationContext = {
  project_id: string;
  program_code: string | null;
  compliance_mode: ComplianceMode;
  inherited_standard: {
    pit_size_cm: { length?: number; width?: number; depth?: number } | null;
    pit_size_label: string | null;
    spacing_m_min: number | null;
    guard_type_required: boolean;
    require_pit_photo: boolean;
    chainage_enabled: boolean;
    min_photos: number | null;
    allowed_species: string[] | null;
    species_native_pct_min: number | null;
  };
  standard_name: string | null;
  progress: {
    tree_count: number;
    target_tree_count: number | null;
    progress_pct: number | null;
    work_area_count: number;
  };
  suggested_next: {
    work_area_id: string;
    work_area_name: string;
    chainage_km: number;
    chainage_label: string;
    chainage_display: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
  work_areas: Array<{
    id: string;
    name: string;
    geometry_type: string;
    tree_count: number;
  }>;
};

export type SpeciesSuggestion = {
  common_name: string;
  scientific_name: string | null;
  score: number;
  reasons: string[];
};

export type SpeciesSuggestions = {
  suggestions: SpeciesSuggestion[];
  binding: boolean;
  disclaimer: string;
  context: {
    state_code: string | null;
    state_name: string | null;
    district_code: string | null;
    district_name: string | null;
    segment: string;
    scheme_code: string | null;
    scheme_label: string | null;
    segment_label: string | null;
    has_location: boolean;
    climate_zone: string | null;
    climate_zone_label: string | null;
    climate_zone_description: string | null;
  };
};

export type ClimateZone = {
  code: string;
  label: string;
  description: string;
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
  async list(params?: {
    page?: number;
    page_size?: number;
    segment?: string;
    scheme_code?: string;
    status?: string;
  }) {
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
    scheme_code?: string;
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
  async updateSchemeMetadata(
    id: string,
    payload: {
      scheme_refs: Record<string, unknown>;
      funding_sources?: Record<string, unknown>[];
      convergence?: Record<string, unknown>[];
    },
  ) {
    return (
      await api.patch<PlantingProject>(`/v1/planting-projects/${id}/scheme-metadata`, payload)
    ).data;
  },
  async getRuleOverride(id: string) {
    return (await api.get<{
      project_id: string;
      template_code: string | null;
      project_compliance_mode: string;
      effective_compliance_mode: string;
      has_project_override: boolean;
      base_rules: Record<string, unknown>;
      effective_rules: Record<string, unknown>;
      override: {
        enabled: boolean;
        rules: Record<string, unknown>;
        compliance_mode?: string | null;
        publish_note?: string | null;
        updated_at: string | null;
      };
    }>(`/v1/planting-projects/${id}/rule-override`)).data;
  },
  async updateRuleOverride(
    id: string,
    payload: {
      enabled: boolean;
      rules: Record<string, unknown>;
      compliance_mode?: string | null;
      publish_note?: string | null;
    },
  ) {
    return (await api.put(`/v1/planting-projects/${id}/rule-override`, payload)).data;
  },
  async schemeKpis(id: string) {
    return (
      await api.get<{
        scheme_code: string | null;
        scheme_label?: string;
        ministry?: string;
        targets: Record<string, number>;
        metrics: Record<string, number>;
        checks: Record<string, boolean>;
        status: string;
      }>(`/v1/planting-projects/${id}/scheme-kpis`)
    ).data;
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
  async registrationContext(projectId: string, workAreaId?: string) {
    return (
      await api.get<RegistrationContext>(
        `/v1/planting-projects/${projectId}/registration-context`,
        { params: workAreaId ? { work_area_id: workAreaId } : undefined },
      )
    ).data;
  },
  async speciesSuggestions(
    projectId: string,
    params?: {
      state_code?: string;
      state_name?: string;
      district_code?: string;
      district_name?: string;
    },
  ) {
    return (
      await api.get<SpeciesSuggestions>(
        `/v1/planting-projects/${projectId}/species-suggestions`,
        { params },
      )
    ).data;
  },
  async speciesSuggestionsPreview(params?: {
    state_code?: string;
    state_name?: string;
    district_code?: string;
    district_name?: string;
    scheme_code?: string;
    segment?: string;
    template_code?: string;
  }) {
    return (
      await api.get<SpeciesSuggestions>(`/v1/planting-projects/species-suggestions/preview`, {
        params,
      })
    ).data;
  },
  async climateZone(params: { state_code: string; district_code?: string }) {
    return (
      await api.get<ClimateZone>(`/v1/planting-projects/climate-zone`, { params })
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
  async listEmissionSources(projectId: string, workAreaId?: string, gasType?: string) {
    return (
      await api.get<EmissionSource[]>(`/v1/planting-projects/${projectId}/emission-sources`, {
        params: {
          ...(workAreaId ? { work_area_id: workAreaId } : {}),
          ...(gasType ? { gas_type: gasType } : {}),
        },
      })
    ).data;
  },
  async getEmissionCatalog() {
    return (await api.get<EmissionCatalog>(`/v1/planting-projects/emissions-catalog`)).data;
  },
  async createEmissionSource(
    projectId: string,
    payload: {
      work_area_id: string;
      name: string;
      source_type: string;
      gas_type: string;
      geometry_kind: "point" | "area";
      point?: { type: "Point"; coordinates: number[] };
      area?: GeoJsonPolygon;
      emission_rate_g_s?: number;
      annual_emission_tons?: number;
      release_height_m?: number;
    },
  ) {
    return (
      await api.post<EmissionSource>(
        `/v1/planting-projects/${projectId}/emission-sources`,
        payload,
      )
    ).data;
  },
  async updateEmissionSource(
    projectId: string,
    sourceId: string,
    payload: {
      name?: string;
      source_type?: string;
      gas_type?: string;
      emission_rate_g_s?: number;
      annual_emission_tons?: number;
      release_height_m?: number;
      status?: "active" | "inactive";
    },
  ) {
    return (
      await api.patch<EmissionSource>(
        `/v1/planting-projects/${projectId}/emission-sources/${sourceId}`,
        payload,
      )
    ).data;
  },
  async deleteEmissionSource(projectId: string, sourceId: string) {
    await api.delete(`/v1/planting-projects/${projectId}/emission-sources/${sourceId}`);
  },
  async runDispersion(
    projectId: string,
    payload: {
      work_area_id: string;
      emission_source_ids: string[];
      duration_hours?: number;
      downwind_km?: number;
      crosswind_km?: number;
      met_hour_index?: number;
    },
  ) {
    return (
      await api.post<DispersionRunResult>(
        `/v1/planting-projects/${projectId}/dispersion/run`,
        payload,
      )
    ).data;
  },
  async getLatestDispersion(projectId: string, workAreaId: string) {
    return (
      await api.get<DispersionRunResult | null>(
        `/v1/planting-projects/${projectId}/dispersion/latest`,
        { params: { work_area_id: workAreaId } },
      )
    ).data;
  },
  async runTropomiScan(
    projectId: string,
    workAreaId: string,
    payload?: { months?: number; buffer_km?: number },
  ) {
    return (
      await api.post<TropomiScanResult>(
        `/v1/planting-projects/${projectId}/work-areas/${workAreaId}/satellite-scan`,
        payload ?? {},
      )
    ).data;
  },
  async listTropomiScans(projectId: string, workAreaId: string, limit = 5) {
    return (
      await api.get<TropomiScanResult[]>(
        `/v1/planting-projects/${projectId}/work-areas/${workAreaId}/satellite-scans`,
        { params: { limit } },
      )
    ).data;
  },
  async runEmissionFusion(projectId: string, workAreaId: string) {
    return (
      await api.post<EmissionFusionResult>(
        `/v1/planting-projects/${projectId}/work-areas/${workAreaId}/emission-fusion`,
        {},
      )
    ).data;
  },
  async getLatestEmissionFusion(projectId: string, workAreaId: string) {
    return (
      await api.get<EmissionFusionResult | null>(
        `/v1/planting-projects/${projectId}/work-areas/${workAreaId}/emission-fusion/latest`,
      )
    ).data;
  },
  async exportMrv(projectId: string, format: "pdf" | "xlsx" = "pdf") {
    const response = await api.get(`/v1/planting-projects/${projectId}/mrv-export`, {
      params: { format },
      responseType: "blob",
    });
    return response.data as Blob;
  },
  async scanHistory(
    projectId: string,
    opts?: { fenceId?: string; limit?: number },
  ) {
    return (
      await api.get<ScanHistoryResponse>(`/v1/planting-projects/${projectId}/scan-history`, {
        params: {
          fence_id: opts?.fenceId,
          limit: opts?.limit,
        },
      })
    ).data;
  },
  async exportMonitoringDossier(projectId: string) {
    const response = await api.get(`/v1/planting-projects/${projectId}/monitoring-dossier`, {
      params: { _t: Date.now() },
      responseType: "blob",
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
    });
    return response.data as Blob;
  },
  async exportEmissionsCompliance(projectId: string, workAreaId: string) {
    const response = await api.get(`/v1/planting-projects/${projectId}/emissions-export`, {
      params: { work_area_id: workAreaId, format: "pdf" },
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
  async listSafeguardDocuments(projectId: string) {
    return (
      await api.get<SafeguardDocument[]>(
        `/v1/planting-projects/${projectId}/safeguards/documents`,
      )
    ).data;
  },
  async createSafeguardDocument(
    projectId: string,
    payload: {
      doc_type: SafeguardDocType;
      title: string;
      s3_key: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    return (
      await api.post<SafeguardDocument>(
        `/v1/planting-projects/${projectId}/safeguards/documents`,
        payload,
      )
    ).data;
  },
  async deleteSafeguardDocument(projectId: string, documentId: string) {
    await api.delete(
      `/v1/planting-projects/${projectId}/safeguards/documents/${documentId}`,
    );
  },
  async exportCampaStatePack(projectId: string) {
    const response = await api.get(
      `/v1/planting-projects/${projectId}/campa-state-export`,
      { responseType: "blob" },
    );
    return response.data as Blob;
  },
  async exportGreenCreditPortalPack(projectId: string) {
    const response = await api.get(
      `/v1/planting-projects/${projectId}/green-credit-portal-export`,
      { responseType: "blob" },
    );
    return response.data as Blob;
  },
  async carbonIntegrity(projectId: string) {
    return (
      await api.get<import("@/components/projects/project-permanence-panel").CarbonIntegrityEnvelope>(
        `/v1/planting-projects/${projectId}/carbon-integrity`,
      )
    ).data;
  },
  async integrityFusion(projectId: string) {
    return (await api.get<IntegrityFusionDetail>(`/v1/planting-projects/${projectId}/integrity-fusion`))
      .data;
  },
  async refreshIntegrityFusion(projectId: string) {
    return (
      await api.post<IntegrityFusionDetail & { refreshed_count: number }>(
        `/v1/planting-projects/${projectId}/integrity-fusion/refresh`,
      )
    ).data;
  },
  async exportIntegrityFusion(projectId: string, format: "json" | "csv" = "json") {
    const response = await api.get(
      `/v1/planting-projects/${projectId}/integrity-fusion/export`,
      { params: { format }, responseType: "blob" },
    );
    return response.data as Blob;
  },
  async registryReadiness(projectId: string) {
    return (
      await api.get<RegistryReadiness>(`/v1/planting-projects/${projectId}/registry-readiness`)
    ).data;
  },
  async backfillIntegrityFusion(params?: { limit?: number; async?: boolean }) {
    return (
      await api.post<{
        status?: string;
        task_id?: string;
        limit_projects?: number;
        projects_processed?: number;
        trees_refreshed?: number;
      }>("/v1/planting-projects/integrity-fusion/backfill", null, {
        params: {
          limit: params?.limit ?? 50,
          async: params?.async ?? false,
        },
      })
    ).data;
  },
  async exportLeakageWorksheet(projectId: string) {
    const response = await api.get(
      `/v1/planting-projects/${projectId}/leakage-worksheet`,
      { responseType: "blob" },
    );
    return response.data as Blob;
  },
  async exportEsfPs5Pack(projectId: string) {
    const response = await api.get(`/v1/planting-projects/${projectId}/esf-ps5-export`, {
      responseType: "blob",
    });
    return response.data as Blob;
  },
  async exportEsfPs6Pack(projectId: string) {
    const response = await api.get(`/v1/planting-projects/${projectId}/esf-ps6-export`, {
      responseType: "blob",
    });
    return response.data as Blob;
  },
  async exportUndpSesPack(projectId: string) {
    const response = await api.get(`/v1/planting-projects/${projectId}/undp-ses-export`, {
      responseType: "blob",
    });
    return response.data as Blob;
  },
  async exportMultilateralAuditPack(projectId: string) {
    const response = await api.get(
      `/v1/planting-projects/${projectId}/multilateral-audit-pack`,
      { responseType: "blob" },
    );
    return response.data as Blob;
  },
  async exportEudrDueDiligence(projectId: string, format: "xlsx" | "zip" = "xlsx") {
    const response = await api.get(
      `/v1/planting-projects/${projectId}/eudr-due-diligence`,
      { params: { format }, responseType: "blob" },
    );
    return response.data as Blob;
  },
  async exportSbtiFlagProject(projectId: string) {
    const response = await api.get(`/v1/planting-projects/${projectId}/sbti-flag`, {
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
        by_scheme: Record<string, number>;
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
  async scanHistoryPortfolio(limit = 96) {
    return (
      await api.get<ScanHistoryResponse>("/v1/planting-projects/scan-history", {
        params: { limit },
      })
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
        stale_sar_work_areas?: number;
        sar_at_risk_work_areas?: number;
        sar_aligned_work_areas?: number;
        sar_divergent_work_areas?: number;
        sar_gap_fill_work_areas?: number;
        sar_live_providers?: number;
        sar_stub_providers?: number;
        sar_avg_forest_integrity?: number | null;
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
          last_sar_at?: string | null;
          days_since_sar_scan?: number | null;
          sar_provider?: string | null;
          sar_forest_integrity?: number | null;
          sar_integrity_grade?: string | null;
          sar_monitoring_mode?: string | null;
          sar_ground_status?: string | null;
          sar_stale?: boolean;
          sar_live?: boolean;
          sar_at_risk?: boolean;
          sar_recommended_action?: string | null;
        }>;
        unread_alerts_by_kind: Record<string, number>;
        unread_sar_alerts_by_kind?: Record<string, number>;
        open_sar_field_verifications?: Array<{
          id: string;
          project_id: string | null;
          work_area_id: string | null;
          work_area_name: string | null;
          severity: string;
          message: string;
          alert_kind: string | null;
          forest_integrity_score: number | null;
          monitoring_mode: string | null;
          created_at: string | null;
          deep_link: string | null;
        }>;
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
  async listRiskAssessments(projectId: string) {
    return (
      await api.get<
        Array<{
          id: string;
          project_id: string;
          nprt_score: number;
          buffer_pct: number;
          assessed_at: string;
          factors: Record<string, unknown>;
          notes: string | null;
        }>
      >(`/v1/planting-projects/${projectId}/risk-assessments`)
    ).data;
  },
  async createRiskAssessment(
    projectId: string,
    payload: { nprt_score: number; factors?: Record<string, unknown>; notes?: string },
  ) {
    return (
      await api.post<{
        id: string;
        nprt_score: number;
        buffer_pct: number;
        assessed_at: string;
      }>(`/v1/planting-projects/${projectId}/risk-assessments`, payload)
    ).data;
  },
  async vm0047Summary(projectId: string) {
    return (await api.get<Vm0047Summary>(`/v1/planting-projects/${projectId}/vm0047/summary`)).data;
  },
  async createBaseline(
    projectId: string,
    payload: {
      scenario?: string;
      land_cover_class?: string;
      description?: string;
      baseline_emissions_tco2e?: number;
      baseline_removals_tco2e?: number;
    },
  ) {
    return (await api.post(`/v1/planting-projects/${projectId}/baselines`, payload)).data;
  },
  async createAdditionality(
    projectId: string,
    payload: { status?: string; score_pct: number; narrative?: string; factors?: Record<string, unknown> },
  ) {
    return (await api.post(`/v1/planting-projects/${projectId}/additionality`, payload)).data;
  },
  async createLeakage(
    projectId: string,
    payload: {
      leakage_type?: string;
      estimated_leakage_tco2e?: number;
      mitigation_tco2e?: number;
      notes?: string;
    },
  ) {
    return (await api.post(`/v1/planting-projects/${projectId}/leakage`, payload)).data;
  },
  async upsertCarbonPools(
    projectId: string,
    payload: {
      deadwood_ratio?: number;
      litter_ratio?: number;
      soc_tco2e_per_ha?: number;
      area_ha?: number;
    },
  ) {
    return (await api.put(`/v1/planting-projects/${projectId}/carbon-pools`, payload)).data;
  },
};

export type Vm0047Summary = {
  standard: string;
  project_id: string;
  project_code: string;
  methodology: string;
  ledger: {
    gross_credits_tco2e: number;
    buffer_withheld_tco2e: number;
    net_credits_tco2e: number;
    status: string;
  };
  quantification: {
    incremental_after_baseline_tco2e: number;
    creditable_after_leakage_tco2e: number;
    includes_other_pools: boolean;
  };
  readiness_status: string;
  gaps: string[];
  disclaimer: string;
};

export const uploads = {
  /** Send the photo to the API; the server writes MinIO. Browser never PUTs to minio:9000. */
  async uploadImage(file: File) {
    const form = new FormData();
    form.append("file", file, file.name || "photo.jpg");
    const { data } = await api.post<{ s3_key: string; content_type: string }>(
      "/v1/uploads/image",
      form,
      {
        timeout: 120_000,
        maxBodyLength: 15 * 1024 * 1024,
        maxContentLength: 15 * 1024 * 1024,
      },
    );
    return data.s3_key;
  },
  /** @deprecated Use uploadImage — kept for callers that have not switched yet. */
  async presignImage(file: File) {
    return this.uploadImage(file);
  },
};

export const trees = {
  async list(params?: {
    page?: number;
    page_size?: number;
    health?: string;
    project_id?: string;
    work_area_id?: string;
    bbox?: string;
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
      altitude_m?: number;
      survival_status?: string;
      remarks?: string;
      photo_key?: string;
      dbh_cm?: number;
      height_m?: number;
      canopy_m?: number;
      method?: string;
      instrument?: string;
    },
  ) {
    return (await api.post<TreeDetail>(`/v1/trees/${id}/regeotag`, payload)).data;
  },
  async addImage(treeId: string, s3Key: string, options?: { isPrimary?: boolean }) {
    return (
      await api.post<TreeImage>(`/v1/trees/${treeId}/images`, null, {
        params: {
          s3_key: s3Key,
          is_primary: options?.isPrimary ?? false,
        },
      })
    ).data;
  },
  async measurements(id: string, params?: { page?: number; page_size?: number }) {
    return (await api.get(`/v1/trees/${id}/measurements`, { params })).data as {
      items: import("@/components/trees/tree-measurements-panel").TreeMeasurement[];
      page: number;
      page_size: number;
      total: number;
    };
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
  async downloadScene(params: { id: string; collection: string }) {
    const res = await api.get("/v1/bhoonidhi/download", {
      params: { id: params.id, collection: params.collection },
      responseType: "blob",
    });
    const blob = res.data as Blob;
    if (blob.type.includes("json")) {
      const text = await blob.text();
      let message = "Bhoonidhi download failed";
      try {
        const payload = JSON.parse(text) as { detail?: string; Description?: string };
        message = payload.detail || payload.Description || message;
      } catch {
        message = text.slice(0, 200) || message;
      }
      throw new Error(message);
    }
    const disposition = res.headers["content-disposition"] as string | undefined;
    const match = disposition?.match(/filename=\"?([^\";]+)\"?/i);
    const filename = match?.[1] || `${params.id}.zip`;
    return { blob, filename };
  },
};

export type SarStatus = {
  configured: boolean;
  provider: string;
  pipeline: string;
  message: string;
  gee_available: boolean;
  sar_enabled?: boolean;
  sar_provider?: string;
  sar_fallback_provider?: string | null;
  live_data_provider?: string;
  monthly_sweep_schedule?: string;
  worker_queue?: string;
};

export const sar = {
  async status() {
    return (await api.get<SarStatus>("/v1/sar/status")).data;
  },
  async scanFence(fenceId: string) {
    return (
      await api.post<SarScanResponse>(`/v1/sar/work-areas/${fenceId}/scan`, undefined, {
        timeout: 120_000,
      })
    ).data;
  },
  async fenceMonitoring(fenceId: string) {
    return (
      await api.get<{
        fence_id: string;
        latest: SarRecord | null;
        points: SarRecord[];
        sar_configured: boolean;
      }>(`/v1/sar/work-areas/${fenceId}/monitoring`)
    ).data;
  },
  async scanTree(treeId: string) {
    return (
      await api.post<SarScanResponse>(`/v1/sar/trees/${treeId}/scan`, undefined, {
        timeout: 120_000,
      })
    ).data;
  },
  async treeMonitoring(treeId: string) {
    return (
      await api.get<{
        tree_id: string;
        latest: SarRecord | null;
        points: SarRecord[];
        sar_configured: boolean;
      }>(`/v1/sar/trees/${treeId}/monitoring`)
    ).data;
  },
  async treeFusion(treeId: string) {
    return (await api.get<SarFusion>(`/v1/sar/trees/${treeId}/fusion`)).data;
  },
  async fenceFusion(fenceId: string) {
    return (await api.get<SarFusion>(`/v1/sar/work-areas/${fenceId}/fusion`)).data;
  },
  async portfolioExport() {
    return (
      await api.get<string>("/v1/sar/portfolio-export", {
        responseType: "text",
      })
    ).data;
  },
  async portfolioReportPdf() {
    return (
      await api.get<Blob>("/v1/sar/portfolio-report", {
        responseType: "blob",
      })
    ).data;
  },
};

export type SarFinding = {
  category: string;
  name: string;
  confidence: number;
  severity: string;
  evidence: string;
};

export type SarAnalysis = {
  risk_level: string;
  ground_status: string;
  summary: string;
  findings: SarFinding[];
  wetland_probability: number;
  double_bounce_index: number;
  ground_moisture_index: number;
  canopy_ground_mismatch: boolean;
  pipeline: string;
};

export type SarFusion = {
  forest_integrity_score: number;
  integrity_grade: string;
  monitoring_mode: string;
  summary: string;
  optical_ndvi: number | null;
  optical_stale: boolean;
  sar_analysis: SarAnalysis;
  findings: SarFinding[];
  pipeline: string;
};

export type SarScanResponse = {
  tree_id?: string;
  fence_id?: string;
  record: SarRecord;
  analysis: SarAnalysis;
  fusion?: SarFusion | null;
};

export type SarRecord = {
  id: string;
  provider: string;
  scene_id: string;
  scene_acquired_at: string;
  l_band_hh_db?: number | null;
  s_band_hh_db?: number | null;
  double_bounce_index?: number | null;
  wetland_probability?: number | null;
  ground_moisture_index?: number | null;
  canopy_ground_mismatch?: boolean | null;
  frequency_bands?: string[];
  polarimetric_composite?: Record<string, number> | null;
  coherence?: number | null;
  analysis?: SarAnalysis | null;
  fusion?: SarFusion | null;
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
  async scanHistory(id: string, limit = 48) {
    return (
      await api.get<ScanHistoryResponse>(`/v1/plantation-fences/${id}/scan-history`, {
        params: { limit },
      })
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
  async list(options?: { unreadOnly?: boolean; limit?: number; cursor?: string }) {
    const params: Record<string, string | number | boolean> = {};
    if (options?.unreadOnly) params.unread_only = true;
    if (options?.limit) params.limit = options.limit;
    if (options?.cursor) params.cursor = options.cursor;
    const { data } = await api.get<{ items: AlertItem[]; next_cursor: string | null }>(
      "/v1/alerts",
      { params },
    );
    return data;
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
    daily_digest?: boolean;
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
  compliance?: {
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

export type ExecutiveBrief = {
  generated_at: string;
  cache_hit: boolean;
  headline: string;
  lines: string[];
  priority_alert?: {
    title: string;
    severity: string;
    kind?: string;
    work_area_name: string;
    alert_id?: string | null;
  } | null;
  metrics: Record<string, unknown>;
  llm_enriched: boolean;
  highest_risk: string;
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
      sar_ground_risk_sites?: number;
      sar_divergent_sites?: number;
      sar_avg_forest_integrity?: number | null;
      sar_provider?: string;
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
      sar?: {
        forest_integrity_score?: number | null;
        monitoring_mode?: string | null;
        ground_status?: string | null;
      };
    }>;
  };
  highest_risk: string;
  weather_alert_count: number;
  pest_high_count: number;
  project_count: number;
  tree_count: number;
};

export const intelligence = {
  async brief(options?: { llm?: boolean; refresh?: boolean }) {
    return (
      await api.get<ExecutiveBrief>("/v1/intelligence/brief", {
        params: { llm: options?.llm ?? false, refresh: options?.refresh ?? false },
        timeout: 30_000,
      })
    ).data;
  },
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
    measurement_method?: string;
    verification_tier?: string;
    nprt_score?: number;
    annual_mortality_pct?: number;
  }) {
    return (await api.post("/v1/carbon/estimate", payload)).data;
  },
};

export type PrivacyConsent = {
  id: string;
  purpose: string;
  policy_version: string;
  granted_at: string;
  withdrawn_at: string | null;
  active: boolean;
};

export const privacy = {
  async summary() {
    return (
      await api.get<{
        policy_version: string;
        consents: PrivacyConsent[];
        data_requests: Array<{ id: string; request_type: string; status: string; created_at: string }>;
        grievances: Array<{ id: string; subject: string; status: string; created_at: string }>;
      }>("/v1/privacy/summary")
    ).data;
  },
  async officer() {
    return (await api.get<{ name: string; email: string; policy_version: string }>("/v1/privacy/officer")).data;
  },
  async grantConsent(purpose: "essential" | "analytics" | "marketing") {
    return (await api.post<PrivacyConsent>("/v1/privacy/consent", { purpose })).data;
  },
  async withdrawConsent(purpose: string) {
    return (await api.delete<PrivacyConsent>(`/v1/privacy/consent/${purpose}`)).data;
  },
  async submitDataRequest(request_type: "access" | "correction" | "erasure" | "portability", notes?: string) {
    return (await api.post("/v1/privacy/data-requests", { request_type, notes })).data;
  },
  async downloadExport() {
    const res = await api.get("/v1/privacy/data-export", { responseType: "blob" });
    return res.data as Blob;
  },
  async deleteAccount(confirm_email: string, reason?: string) {
    return (await api.post("/v1/privacy/delete-account", { confirm_email, reason })).data;
  },
  async fileGrievance(subject: string, body: string) {
    return (await api.post("/v1/privacy/grievances", { subject, body })).data;
  },
};

export type AssistantAnswer = {
  answer: string;
  calculations: Record<string, unknown>;
  citations: string[];
  mode?: "llm" | "rules";
  provider?: "openai" | "gemini" | "rules" | null;
  llm_error?: string | null;
};

export const assistant = {
  async query(prompt: string) {
    return (await api.post<AssistantAnswer>("/v1/assistant/query", { prompt })).data;
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
    const { data } = await api.get<{ items: BioacousticRecording[]; next_cursor: string | null }>(
      "/v1/bioacoustic/recordings",
    );
    return data.items;
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

export type RegistryReadiness = {
  tree_count: number;
  credit_eligible_count: number;
  audit_ready_count: number;
  eligible_pct: number;
  audit_ready_pct: number;
  avg_fusion_score: number | null;
  verified_ready: boolean;
  issued_ready: boolean;
  claimable_tree_count: number;
  registry_issue_ready: boolean;
  blocking_trees: IntegrityFusionDetail["blocking_trees"];
  message: string;
};

export type CreditLedgerStatus = "estimated" | "verified" | "buffered" | "issued";

export type IntegrityFusionDetail = {
  tree_count: number;
  credit_eligible_count: number;
  audit_ready_count: number;
  eligible_pct: number;
  audit_ready_pct: number;
  avg_fusion_score: number | null;
  verified_ready: boolean;
  issued_ready: boolean;
  claimable_tree_count?: number;
  registry_issue_ready?: boolean;
  verified_requirements: { min_eligible_pct: number; min_avg_fusion: number };
  issued_requirements: { min_audit_ready_pct: number; min_avg_fusion: number };
  blocking_trees: Array<{
    tree_id: string;
    public_code: string;
    verification_status: string;
    fusion_score: number | null;
    credit_eligible: boolean;
    reasons: string[];
  }>;
  message: string;
  passed_for_verified?: boolean;
  passed_for_issued?: boolean;
  monitoring_ready?: boolean;
  monitoring_gate?: {
    passed: boolean;
    fence_count?: number;
    sar_avg_forest_integrity?: number | null;
    max_optical_stale_days?: number | null;
    reasons?: string[];
    message?: string;
  };
  blocking_sample?: string[];
  refreshed_count?: number;
};

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
  buffer_from_nprt?: boolean;
  nprt_score?: number;
  integrity_fusion?: IntegrityFusionDetail;
  events: Array<{
    id: string;
    from_status: string | null;
    to_status: string;
    notes: string | null;
    registry_reference: string | null;
    created_at: string;
  }>;
  serials?: Array<{
    id: string;
    serial_number: string;
    vintage_year: number;
    tco2e_amount: number;
    status: string;
    beneficiary?: string | null;
    retired_at?: string | null;
    integrity_snapshot?: Record<string, unknown>;
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
  async retireSerial(
    serialId: string,
    payload: {
      beneficiary: string;
      retirement_reason?: string;
      paris_article6?: boolean;
      corresponding_adjustment_ref?: string;
    },
  ) {
    return (await api.post(`/v1/credits/serials/${serialId}/retire`, payload)).data;
  },
  async downloadRetirementCertificate(serialId: string) {
    const response = await api.get(`/v1/credits/serials/${serialId}/certificate.pdf`, {
      responseType: "blob",
    });
    return response.data as Blob;
  },
  async greenCreditEstimate(projectId: string) {
    return (await api.get<GreenCreditEstimate>(`/v1/credits/projects/${projectId}/green-credit`)).data;
  },
};

export type GreenCreditEstimate = {
  standard: string;
  activity_type: string;
  land_bank_id: string | null;
  tree_count: number;
  eligible_trees: number;
  total_area_ha: number;
  trees_per_ha: number | null;
  min_trees_per_ha: number;
  density_eligible: boolean;
  land_bank_registered: boolean;
  monitoring_period_years: number;
  years_elapsed: number;
  vesting_fraction: number;
  full_green_credits: number;
  vested_green_credits: number;
  provisional_green_credits: number;
  eligibility_status: "eligible" | "gaps_identified" | "not_eligible";
  gaps: string[];
  disclaimer: string;
  computed_at: string;
  verifier_reference?: string | null;
};

export type VerificationSample = {
  id: string;
  project_id: string;
  sample_pct: number;
  method: string;
  status: string;
  item_count: number;
  by_status: Record<string, number>;
  created_at: string;
  items?: Array<{
    id: string;
    tree_id: string;
    tree_public_code: string | null;
    status: string;
    attestation_hash: string | null;
    signed_at: string | null;
  }>;
};

export const verificationWorkflow = {
  async createSample(projectId: string, payload: { sample_pct: number; method?: "random" | "stratified" }) {
    return (await api.post<VerificationSample>(`/v1/verification/projects/${projectId}/samples`, payload)).data;
  },
  async getSample(sampleId: string) {
    return (await api.get<VerificationSample>(`/v1/verification/samples/${sampleId}`)).data;
  },
  async attestItem(sampleId: string, itemId: string, payload: { status: "approved" | "rejected"; notes?: string }) {
    return (await api.post(`/v1/verification/samples/${sampleId}/items/${itemId}/attest`, payload)).data;
  },
  async downloadReport(sampleId: string) {
    const response = await api.get(`/v1/verification/samples/${sampleId}/report.pdf`, {
      responseType: "blob",
    });
    return response.data as Blob;
  },
};

export type PlotMonitoringSummary = {
  project_id: string;
  has_design: boolean;
  mode: string;
  stratification?: string | null;
  plot_area_m2?: number | null;
  plots_per_stratum?: number | null;
  total_plots?: number;
  visited_plots?: number;
  strata?: Array<Record<string, unknown>>;
  extrapolated_biomass_kg?: number | null;
  extrapolated_carbon_kg?: number | null;
  extrapolated_co2e_kg?: number | null;
  co2e_kg_lower_90?: number | null;
  co2e_kg_upper_90?: number | null;
  uncertainty_pct?: number | null;
  disclosure?: string | null;
  design_id?: string | null;
  status?: string | null;
  layout_seed?: number | null;
  stratum_count?: number | null;
};

export type PlotMonitoringPlot = {
  id: string;
  stratum_id: string;
  plot_code: string;
  status: string;
  center: { type: "Point"; coordinates: [number, number] };
};

export const plotMonitoring = {
  async summary(projectId: string) {
    return (await api.get<PlotMonitoringSummary>(`/v1/plot-monitoring/projects/${projectId}/summary`)).data;
  },
  async upsertDesign(
    projectId: string,
    payload: {
      mode: "full_census" | "plot_based" | "hybrid";
      stratification?: string;
      plots_per_stratum?: number;
      plot_area_m2?: number;
    },
  ) {
    return (await api.put<PlotMonitoringSummary>(`/v1/plot-monitoring/projects/${projectId}/design`, payload)).data;
  },
  async generatePlots(projectId: string) {
    return (await api.post<PlotMonitoringSummary>(`/v1/plot-monitoring/projects/${projectId}/generate-plots`)).data;
  },
  async listPlots(projectId: string) {
    return (await api.get<PlotMonitoringPlot[]>(`/v1/plot-monitoring/projects/${projectId}/plots`)).data;
  },
  async createVisit(
    plotId: string,
    payload: {
      observations?: Array<{
        species_text?: string;
        dbh_cm?: number;
        height_m?: number;
        alive?: boolean;
      }>;
      notes?: string;
    },
  ) {
    return (await api.post(`/v1/plot-monitoring/plots/${plotId}/visits`, payload)).data;
  },
};

export type FrameworkProfileCode =
  | "ipcc_ar6"
  | "verra_vm0047"
  | "gold_standard_luf"
  | "redd_plus"
  | "paris_ndc"
  | "ngt_campa"
  | "green_credit_india"
  | "esg_general"
  | "gim"
  | "mishti"
  | "nagar_van"
  | "sahakar_van";

export type FrameworkProfile = {
  code: FrameworkProfileCode;
  title: string;
  short_label: string;
  methodology: string;
  description: string;
  reference: string;
  disclaimer: string;
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
  | "green_credit_india"
  | "icvcm_ccp"
  | "esg_general"
  | "fra_tenure"
  | "article6_readiness"
  | "world_bank_esf"
  | "undp_ses"
  | "sbti_flag"
  | "eudr_supplier_mrv";

export type SafeguardDocType =
  | "gram_sabha_resolution"
  | "fpic_minutes"
  | "patta_cfr_reference"
  | "stakeholder_consultation_log";

export type SafeguardDocument = {
  id: string;
  project_id: string;
  doc_type: SafeguardDocType;
  doc_type_label: string;
  title: string;
  s3_key: string;
  metadata: Record<string, unknown>;
  uploaded_by_user_id: string | null;
  created_at: string | null;
};

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
  gaps: Array<{
    item_id: string;
    question: string;
    answer: ChecklistAnswer;
    category: string;
    auto_key?: string | null;
  }>;
  answered_required: number;
  required_count: number;
  updated_at: string | null;
};

export type ComplianceWorkflowStepStatus = "done" | "partial" | "pending" | "skipped";

export type ComplianceWorkflowStep = {
  id: string;
  title: string;
  description: string;
  status: ComplianceWorkflowStepStatus;
  action_label: string;
  action_tab?: string;
  action_href?: string;
  action_anchor?: string;
  metric?: string | null;
  optional?: boolean;
  quick_fix?: { survey_interval_days: number } | null;
  recommended_checklist?: ChecklistCode;
};

export type ComplianceWorkflow = {
  project_id: string;
  segment: string;
  compliance_mode: string;
  recommended_checklist: ChecklistCode;
  recommended_checklist_label: string;
  steps: ComplianceWorkflowStep[];
  progress: { done: number; partial: number; total: number; pct: number };
  auto_signals: Record<string, string>;
  checklist_summaries: ChecklistSummary[];
};

export type CompliancePortfolioProjectRow = {
  id: string;
  code: string;
  name: string;
  segment: string;
  compliance_mode: string;
  status: string;
  readiness_pct: number;
  open_violations: number;
  blocking_violations: number;
  safeguard_gaps: number;
  recommended_checklist: ChecklistCode;
  recommended_checklist_label: string;
  workflow_done: number;
  workflow_total: number;
};

export type CompliancePortfolioSummary = {
  project_count: number;
  open_violations: number;
  blocking_violations: number;
  avg_readiness_pct: number;
  projects_with_safeguard_gaps: number;
  safeguard_gap_count: number;
  projects_below_80_readiness: number;
  report_links: Array<{ label: string; tab: string }>;
  projects: CompliancePortfolioProjectRow[];
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
  async projectWorkflow(projectId: string) {
    return (
      await api.get<ComplianceWorkflow>(`/v1/compliance/projects/${projectId}/workflow`)
    ).data;
  },
  async portfolioSummary() {
    return (await api.get<CompliancePortfolioSummary>("/v1/compliance/portfolio-summary")).data;
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
    action_prefix?: string;
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

export type IndiaAdminOption = {
  code: string;
  name: string;
  lgd?: number;
  state_code?: string;
  state_name?: string;
  district_code?: string;
  block_code?: string;
  gram_panchayat_code?: string;
};

export type IndiaAdminListResponse<T extends IndiaAdminOption = IndiaAdminOption> = {
  items: T[];
  manual_fallback?: boolean;
  hint?: string | null;
};

export const indiaAdmin = {
  async financialYears() {
    return (await api.get<{ items: string[]; current: string }>("/v1/india-admin/financial-years"))
      .data;
  },
  async states() {
    return (await api.get<{ items: IndiaAdminOption[] }>("/v1/india-admin/states")).data;
  },
  async districts(stateCode: string) {
    return (
      await api.get<{ items: IndiaAdminOption[] }>("/v1/india-admin/districts", {
        params: { state_code: stateCode },
      })
    ).data;
  },
  async cities(stateCode: string) {
    return (
      await api.get<{ items: IndiaAdminOption[] }>("/v1/india-admin/cities", {
        params: { state_code: stateCode },
      })
    ).data;
  },
  async blocks(stateCode: string, districtCode: string) {
    return (
      await api.get<IndiaAdminListResponse>("/v1/india-admin/blocks", {
        params: { state_code: stateCode, district_code: districtCode },
      })
    ).data;
  },
  async gramPanchayats(params: { blockLgd: number }) {
    return (
      await api.get<IndiaAdminListResponse>("/v1/india-admin/gram-panchayats", {
        params: { block_lgd: params.blockLgd },
      })
    ).data;
  },
  async villages(params: { gramPanchayatCode: string }) {
    return (
      await api.get<IndiaAdminListResponse>("/v1/india-admin/villages", {
        params: { gram_panchayat_code: params.gramPanchayatCode },
      })
    ).data;
  },
};
