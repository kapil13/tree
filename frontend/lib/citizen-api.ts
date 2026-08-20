import { api } from "@/lib/api";

export type CitizenProfile = {
  user_id: string;
  points: number;
  badges: Array<{ id: string; label: string; description: string; earned_at?: string }>;
  stewardship_streak: number;
  last_stewardship_at: string | null;
  onboarding_steps: string[];
  trees_owned: number;
  trees_adopted: number;
  badge_catalog: Array<{ id: string; label: string; description: string; points: number }>;
};

export type StewardshipTree = {
  id: string;
  public_code: string;
  species_text: string | null;
  relationship: string;
  owner_name?: string | null;
  nickname?: string | null;
  current_health: string;
  survival_status?: string | null;
  registered_at: string;
  last_geotag_at: string | null;
  stewardship_checkins: number;
  days_since_planted: number | null;
  next_checkin_due: boolean;
  adopted_at?: string | null;
};

export type StewardshipSummary = {
  owned: StewardshipTree[];
  adopted: StewardshipTree[];
  due_count: number;
  due_tree_ids: string[];
};

export const citizen = {
  async profile() {
    return (await api.get<CitizenProfile>("/v1/citizen/profile")).data;
  },
  async stewardship() {
    return (await api.get<StewardshipSummary>("/v1/citizen/stewardship")).data;
  },
  async adoptable(params?: { page?: number; page_size?: number }) {
    return (
      await api.get<{ items: StewardshipTree[]; total: number; page: number; page_size: number }>(
        "/v1/citizen/adoptable",
        { params },
      )
    ).data;
  },
  async adoptTree(treeId: string, payload?: { nickname?: string }) {
    return (
      await api.post<{ points: number; new_badges: CitizenProfile["badges"] }>(
        `/v1/citizen/trees/${treeId}/adopt`,
        payload ?? {},
      )
    ).data;
  },
  async relinquishTree(treeId: string) {
    await api.delete(`/v1/citizen/trees/${treeId}/adopt`);
  },
  async adoptByCode(payload: { public_code: string; nickname?: string }) {
    return (
      await api.post<{ points: number; new_badges: CitizenProfile["badges"] }>(
        "/v1/citizen/adopt-by-code",
        payload,
      )
    ).data;
  },
  async signupStart(payload: { full_name: string; phone: string; password: string; captcha_token?: string }) {
    return (
      await api.post<{ signup_token: string; dev_hint?: string | null; sms_enabled?: boolean }>(
        "/v1/citizen/signup/start",
        payload,
      )
    ).data;
  },
  async signupComplete(payload: { signup_token: string; code: string }) {
    return (
      await api.post<{
        access_token: string;
        refresh_token: string;
        token_type: string;
        expires_in: number;
      }>("/v1/citizen/signup/complete", payload)
    ).data;
  },
  async markOnboardingStep(stepId: string) {
    await api.post(`/v1/citizen/onboarding/${stepId}`);
  },
};
