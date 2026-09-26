export const SESSION_COOKIE = "byot_session";

/** Presence flag for edge middleware; the JWT stays in localStorage. HttpOnly via API. */
export async function setSessionCookie(maxAgeSeconds = 60 * 60 * 24 * 7): Promise<void> {
  if (typeof window === "undefined") return;
  await fetch("/api/auth/session-cookie", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ maxAgeSeconds }),
  }).catch(() => undefined);
}

export async function clearSessionCookie(): Promise<void> {
  if (typeof window === "undefined") return;
  await fetch("/api/auth/session-cookie", {
    method: "DELETE",
    credentials: "include",
  }).catch(() => undefined);
}

export async function syncSessionCookieFromToken(): Promise<void> {
  if (typeof window === "undefined") return;
  const token =
    localStorage.getItem("byot_access_token") ||
    (() => {
      try {
        const raw = localStorage.getItem("byot-auth");
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { state?: { access?: string | null } };
        return parsed.state?.access ?? null;
      } catch {
        return null;
      }
    })();
  if (token) {
    await setSessionCookie();
  } else {
    await clearSessionCookie();
  }
}
