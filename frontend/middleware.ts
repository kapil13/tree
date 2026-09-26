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
  "/verification",
  "/stewardship",
] as const;

/** Routes that must not be indexed. Prefix match is boundary-safe (`/p` ≠ `/privacy`). */
const NOINDEX_PREFIXES = [
  "/auth",
  "/login",
  "/signup",
  "/verify",
  "/impact",
  "/p",
  "/presentation",
  "/presentationa",
  ...PROTECTED_PREFIXES,
] as const;

const NOINDEX_ROBOTS_HEADER = "noindex, nofollow";

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

function isNoindexPath(pathname: string): boolean {
  return NOINDEX_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

function applyNoindex(response: NextResponse): NextResponse {
  response.headers.set("X-Robots-Tag", NOINDEX_ROBOTS_HEADER);
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/presentationa" || pathname.startsWith("/presentationa/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/presentationa/, "/presentation");
    return NextResponse.redirect(url, 301);
  }
  if (!isProtectedPath(pathname)) {
    if (isNoindexPath(pathname)) {
      return applyNoindex(NextResponse.next());
    }
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
    return applyNoindex(NextResponse.redirect(loginUrl));
  }

  return applyNoindex(NextResponse.next());
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
    "/verification/:path*",
    "/stewardship/:path*",
    "/auth/:path*",
    "/login/:path*",
    "/signup/:path*",
    "/verify/:path*",
    "/impact/:path*",
    "/p/:path*",
    "/presentation/:path*",
    "/presentationa/:path*",
  ],
};
