import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  signSessionCookieValue,
} from "@/lib/session-cookie-server";

const DEFAULT_MAX_AGE = 60 * 60 * 24 * 7;

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function POST(request: Request) {
  let maxAgeSeconds = DEFAULT_MAX_AGE;
  try {
    const body = (await request.json()) as { maxAgeSeconds?: number };
    if (typeof body.maxAgeSeconds === "number" && Number.isFinite(body.maxAgeSeconds)) {
      maxAgeSeconds = Math.max(1, Math.floor(body.maxAgeSeconds));
    }
  } catch {
    // empty body → defaults
  }

  try {
    const value = await signSessionCookieValue(maxAgeSeconds);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE_NAME, value, cookieOptions(maxAgeSeconds));
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to sign session cookie";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", cookieOptions(0));
  return res;
}
