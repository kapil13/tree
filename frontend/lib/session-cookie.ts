export const SESSION_COOKIE = "byot_session";

/** Presence flag for edge middleware; the JWT stays in localStorage. */
export function setSessionCookie(maxAgeSeconds = 60 * 60 * 24 * 7): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${SESSION_COOKIE}=1; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

export function clearSessionCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function syncSessionCookieFromToken(): void {
  if (typeof window === "undefined") return;
  const token = localStorage.getItem("byot_access_token");
  if (token) {
    setSessionCookie();
  } else {
    clearSessionCookie();
  }
}
