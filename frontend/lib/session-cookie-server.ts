/**
 * Signed HttpOnly session-cookie helpers (HMAC-SHA256).
 *
 * Secret resolution:
 * 1. SESSION_COOKIE_SECRET
 * 2. NEXTAUTH_SECRET
 * 3. development only: "dev-session-secret"
 *
 * Cookie value format: `{expiresAtUnix}.{base64url_hmac}`
 * HMAC is over the expiresAtUnix decimal string.
 *
 * Edge-compatible (Web Crypto) so middleware can verify.
 */

export const SESSION_COOKIE_NAME = "byot_session";

function sessionCookieSecret(): string {
  const fromEnv =
    process.env.SESSION_COOKIE_SECRET || process.env.NEXTAUTH_SECRET || "";
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "development") {
    return "dev-session-secret";
  }
  return "";
}

function base64UrlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i]!);
  }
  const b64 =
    typeof btoa === "function"
      ? btoa(binary)
      : Buffer.from(arr).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function hmacSha256Base64Url(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return base64UrlEncode(sig);
}

/** Build a signed session cookie value valid for `maxAgeSeconds`. */
export async function signSessionCookieValue(maxAgeSeconds: number): Promise<string> {
  const secret = sessionCookieSecret();
  if (!secret) {
    throw new Error(
      "SESSION_COOKIE_SECRET (or NEXTAUTH_SECRET) is required outside development",
    );
  }
  const expiresAtUnix = Math.floor(Date.now() / 1000) + Math.max(1, Math.floor(maxAgeSeconds));
  const payload = String(expiresAtUnix);
  const mac = await hmacSha256Base64Url(payload, secret);
  return `${payload}.${mac}`;
}

/**
 * Verify a signed session cookie.
 * Accepts legacy value `"1"` only when NODE_ENV === "development".
 */
export async function verifySessionCookieValue(value: string | undefined | null): Promise<boolean> {
  if (!value) return false;

  if (value === "1") {
    return process.env.NODE_ENV === "development";
  }

  const secret = sessionCookieSecret();
  if (!secret) return false;

  const dot = value.indexOf(".");
  if (dot <= 0 || dot === value.length - 1) return false;

  const expiresAtStr = value.slice(0, dot);
  const mac = value.slice(dot + 1);
  if (!/^\d+$/.test(expiresAtStr) || !mac) return false;

  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expected = await hmacSha256Base64Url(expiresAtStr, secret);
  return timingSafeEqualString(mac, expected);
}
