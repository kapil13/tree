/**
 * Thin axios wrapper for the BYOT REST API.
 * Reads `byot_access_token` from localStorage and sends it as Bearer.
 */
import axios, { AxiosError, AxiosInstance } from "axios";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "/api";

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
    const data = err.response?.data as { error?: ApiError; detail?: string | { msg: string }[] } | undefined;
    if (data?.error?.message) return data.error.message;
    if (typeof data?.detail === "string") return data.detail;
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
  async uploadPhoto(file: File) {
    const form = new FormData();
    form.append("file", file);
    return (
      await api.post<{ key: string; preview_url: string | null }>(
        "/v1/trees/uploads/photo",
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      )
    ).data;
  },
  async get(id: string) {
    return (await api.get(`/v1/trees/${id}`)).data;
  },
  async analyze(id: string) {
    return (await api.post("/v1/tree-analysis", { tree_id: id, mode: "full" })).data;
  },
  async satellite(id: string) {
    return (await api.get(`/v1/satellite-monitoring/${id}`)).data as {
      tree_id: string;
      points: { ts: string; ndvi: number; provider?: string }[];
      latest: {
        ndvi_mean: number | null;
        presence_confirmed: boolean | null;
        scene_acquired_at: string;
        provider: string;
      } | null;
    };
  },
  async scanSatellite(id: string) {
    return (
      await api.post("/v1/satellite/scan", null, { params: { tree_id: id } })
    ).data;
  },
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
