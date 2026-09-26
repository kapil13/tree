import { api } from "@/lib/api";

export type SiteVisitStats = {
  total: number;
  today: number;
  unique_today: number;
};

const VISITOR_SESSION_KEY = "byot_visitor_id";

export function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(VISITOR_SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(VISITOR_SESSION_KEY, id);
  }
  return id;
}

export function hasRecordedPath(path: string): boolean {
  if (typeof window === "undefined") return true;
  return sessionStorage.getItem(`byot_visit_${path}`) === "1";
}

export function markPathRecorded(path: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(`byot_visit_${path}`, "1");
}

export const siteVisits = {
  async stats() {
    return (await api.get<SiteVisitStats>("/v1/public/visits/stats")).data;
  },
  async record(payload: { visitor_id: string; path: string; locale?: string | null }) {
    return (
      await api.post<{ recorded: boolean }>("/v1/public/visits", payload, {
        validateStatus: (status) => status < 500,
      })
    ).data;
  },
};
