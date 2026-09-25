import { getApiBaseUrl } from "@/lib/api";

export type PublicLookup = "found" | "missing" | "unknown";

/** 404 means the id is unknown. Other failures must not pretend the URL is missing. */
export function classifyPublicStatus(status: number): PublicLookup {
  if (status === 404) return "missing";
  if (status >= 200 && status < 300) return "found";
  return "unknown";
}

/** Server-side lookup of a public API path such as `/v1/public/verify/:token`. */
export async function lookupPublicPath(path: string): Promise<PublicLookup> {
  const base = getApiBaseUrl().replace(/\/$/, "");
  if (!base.startsWith("http")) return "unknown";

  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  try {
    const response = await fetch(url, { cache: "no-store", redirect: "manual" });
    return classifyPublicStatus(response.status);
  } catch {
    return "unknown";
  }
}
