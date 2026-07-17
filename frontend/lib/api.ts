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
      detail?: string | { msg: string }[];
    } | undefined;
    if (data?.error?.message) return data.error.message;
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
  bioacoustic?: {
    total_recordings: number;
    avg_health_score: number;
    avg_shannon_index: number;
    total_species_detected: number;
  };
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
  async biodiversity(id: string) {
    return (await api.get(`/v1/plantation-fences/${id}/biodiversity`)).data as FenceBiodiversity;
  },
  async ecosystemHealth(id: string) {
    return (await api.get(`/v1/plantation-fences/${id}/ecosystem-health`)).data as EcosystemHealth;
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
    ).data as { id: string; status: string };
  },
};
