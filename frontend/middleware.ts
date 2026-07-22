import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";

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
  "/bioacoustic",
  "/alerts",
  "/assistant",
  "/reports",
  "/map",
] as const;

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  if (!request.cookies.get(SESSION_COOKIE)?.value) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
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
    "/bioacoustic/:path*",
    "/alerts/:path*",
    "/assistant/:path*",
    "/reports/:path*",
    "/map/:path*",
  ],
};
