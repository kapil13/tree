import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
  verifySessionCookieValue,
} from "@/lib/session-cookie-server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/settings",
  "/platform",
  "/projects",
  "/intelligence",
  "/trees",
  "/satellite",
  "/field-ops",
  "/monitoring",
  "/portfolio-health",
  "/bioacoustic",
  "/alerts",
  "/assistant",
  "/reports",
  "/map",
  "/tools",
  "/onboarding",
] as const;

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const raw = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const valid = await verifySessionCookieValue(raw);
  if (!valid) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth";
    loginUrl.search = "";
    loginUrl.searchParams.set("mode", "signin");
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/settings/:path*",
    "/platform/:path*",
    "/projects/:path*",
    "/intelligence/:path*",
    "/trees/:path*",
    "/satellite/:path*",
    "/field-ops/:path*",
    "/monitoring/:path*",
    "/portfolio-health/:path*",
    "/bioacoustic/:path*",
    "/alerts/:path*",
    "/assistant/:path*",
    "/reports/:path*",
    "/map/:path*",
    "/tools/:path*",
    "/onboarding/:path*",
  ],
};
