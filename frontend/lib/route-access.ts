import type { User } from "@/lib/api";
import { canSeeNavItem, isOrgAdmin, type NavAudience, viewerReadOnlyMessage } from "@/lib/nav-access";
import { canAccessPlatformPath } from "@/lib/platform-access";

type RouteRule = {
  prefix: string;
  audience: NavAudience | NavAudience[];
  excludeViewers?: boolean;
};

const ROUTE_RULES: RouteRule[] = [
  { prefix: "/trees/new", audience: "can_write" },
  { prefix: "/field-ops", audience: ["professional", "field_supervisor"], excludeViewers: true },
  { prefix: "/projects", audience: ["professional", "field_supervisor", "field_worker"] },
  { prefix: "/portfolio-health", audience: ["professional", "field_supervisor"] },
  { prefix: "/monitoring", audience: ["professional", "field_supervisor"] },
  { prefix: "/intelligence", audience: ["professional", "field_supervisor"] },
  { prefix: "/satellite", audience: ["professional", "field_supervisor"] },
  { prefix: "/bioacoustic", audience: "professional" },
  { prefix: "/reports", audience: ["professional", "field_supervisor"] },
  { prefix: "/settings/team", audience: "org_admin" },
];

export function canAccessPath(user: User | null | undefined, pathname: string): boolean {
  if (!user) return false;

  if (pathname.startsWith("/platform")) {
    return canAccessPlatformPath(user, pathname);
  }

  for (const rule of ROUTE_RULES) {
    if (pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)) {
      return canSeeNavItem(user, rule.audience, { excludeViewers: rule.excludeViewers });
    }
  }

  return true;
}

export function routeAccessDeniedMessage(pathname: string): string {
  if (pathname.startsWith("/settings/team")) {
    return "Organization admin access is required to manage your team.";
  }
  if (pathname.startsWith("/trees/new")) {
    return viewerReadOnlyMessage("trees");
  }
  if (pathname.startsWith("/field-ops")) {
    return "Field operations are limited to supervisors and program leads.";
  }
  if (pathname.startsWith("/platform")) {
    return "Platform administration access is required.";
  }
  return "Your role does not include access to this section.";
}
