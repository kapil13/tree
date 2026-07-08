/**
 * Thin axios wrapper for the BYOT REST API.
 * Reads `byot_access_token` from localStorage and sends it as Bearer.
 */
import axios, { AxiosError, AxiosInstance } from "axios";

/** Browser calls same-origin `/api/...`; Next.js proxies to the backend. */
function resolveApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) return "/api";
  const base = raw.replace(/\/$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
}

export const API_URL = resolveApiBaseUrl();

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const tok = localStorage.getItem("byot_access_token");
    if (tok) config.headers.Authorization = `Bearer ${tok}`;
  }
  return config;
});

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
        return "Cannot reach the API on port 8000. Start the backend: make dev-start (or ./scripts/dev-start.sh), then run make dev-status. Ensure Postgres.app (:5432) and Redis are running.";
      }
      return err.message;
    }
    const data = err.response?.data as {
      error?: ApiError;
      detail?: string | { msg: string }[];
    } | undefined;
    if (data?.error?.message) return data.error.message;
    if (typeof data?.detail === "string") {
      if (err.response.status === 404 && data.detail === "Not Found") {
        return "API route not found (404). Rebuild the frontend: make fix-frontend";
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
};

export const auth = {
  async register(payload: {
    email: string;
    password: string;
    full_name: string;
    role?: string;
    organization_name?: string;
  }) {
    return (await api.post<User>("/v1/auth/register", payload)).data;
  },
  async login(email: string, password: string) {
    return (await api.post<Tokens>("/v1/auth/login", { email, password })).data;
  },
  async me() {
    return (await api.get<User>("/v1/auth/me")).data;
  },
};

export const trees = {
  async list(params?: { page?: number; page_size?: number; health?: string }) {
    return (await api.get("/v1/trees", { params })).data as {
      items: Tree[];
      page: number;
      page_size: number;
      total: number;
    };
  },
  async create(payload: {
    species_text?: string;
    planted_at?: string;
    latitude: number;
    longitude: number;
    altitude_m?: number;
    accuracy_m?: number;
    photo_keys?: string[];
  }) {
    return (await api.post("/v1/trees", payload)).data;
  },
  async get(id: string) {
    return (await api.get(`/v1/trees/${id}`)).data;
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
};

export const dashboard = {
  async get() {
    return (await api.get<Dashboard>("/v1/dashboard")).data;
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
