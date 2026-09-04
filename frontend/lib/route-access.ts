import type { User } from "@/lib/api";
import { canSeeNavItem, isOrgAdmin, type NavAudience, viewerReadOnlyMessage } from "@/lib/nav-access";
import { canAccessPlatformPath } from "@/lib/platform-access";
import {
  isOrgFeatureEnabled,
  type OrgFeatureFlagKey,
} from "@/lib/use-org-feature-flags";

type RouteRule = {
  prefix: string;
  audience: NavAudience | NavAudience[];
  excludeViewers?: boolean;
  featureFlag?: OrgFeatureFlagKey;
};

const ROUTE_RULES: RouteRule[] = [
  { prefix: "/trees/new", audience: "can_write" },
  { prefix: "/field-ops", audience: ["professional", "field_supervisor"], excludeViewers: true },
  { prefix: "/projects", audience: ["professional", "field_supervisor", "field_worker"] },
  {
    prefix: "/portfolio-health",
    audience: ["professional", "field_supervisor"],
    featureFlag: "satellite",
  },
  {
    prefix: "/monitoring",
    audience: ["professional", "field_supervisor"],
    featureFlag: "satellite",
  },
  {
    prefix: "/intelligence",
    audience: ["professional", "field_supervisor"],
    featureFlag: "satellite",
  },
  {
    prefix: "/satellite",
    audience: ["professional", "field_supervisor"],
    featureFlag: "satellite",
  },
  { prefix: "/bioacoustic", audience: "professional", featureFlag: "bioacoustic" },
  { prefix: "/reports", audience: ["professional", "field_supervisor"], featureFlag: "reports" },
  { prefix: "/assistant", audience: "all", featureFlag: "ai_scan" },
  { prefix: "/settings/team", audience: "org_admin" },
];

function matchingRule(pathname: string): RouteRule | undefined {
  return ROUTE_RULES.find(
    (rule) => pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`),
  );
}

export function canAccessPath(
  user: User | null | undefined,
  pathname: string,
  featureFlags?: Map<OrgFeatureFlagKey, boolean>,
): boolean {
  if (!user) return false;

  if (pathname.startsWith("/platform")) {
    return canAccessPlatformPath(user, pathname);
  }

  const rule = matchingRule(pathname);
  if (rule) {
    if (!canSeeNavItem(user, rule.audience, { excludeViewers: rule.excludeViewers })) {
      return false;
    }
    if (rule.featureFlag && !isOrgFeatureEnabled(featureFlags, rule.featureFlag)) {
      return false;
    }
    return true;
  }

  return true;
}

export type RouteAccessMessageKey =
  | "teamAdmin"
  | "fieldOps"
  | "platform"
  | "default"
  | "treesNew"
  | "featureDisabled";

export function routeAccessDeniedKey(pathname: string): RouteAccessMessageKey {
  if (pathname.startsWith("/settings/team")) return "teamAdmin";
  if (pathname.startsWith("/trees/new")) return "treesNew";
  if (pathname.startsWith("/field-ops")) return "fieldOps";
  if (pathname.startsWith("/platform")) return "platform";
  return "default";
}

export function routeAccessDeniedFeatureKey(
  pathname: string,
  featureFlags?: Map<OrgFeatureFlagKey, boolean>,
): OrgFeatureFlagKey | undefined {
  const rule = matchingRule(pathname);
  if (!rule?.featureFlag) return undefined;
  if (isOrgFeatureEnabled(featureFlags, rule.featureFlag)) return undefined;
  return rule.featureFlag;
}

/** @deprecated Use routeAccessDeniedKey with useTranslations("access") in UI */
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
