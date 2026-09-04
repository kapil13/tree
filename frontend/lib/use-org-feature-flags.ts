"use client";

import { useQuery } from "@tanstack/react-query";
import { organizations, type OrgFeatureFlag } from "@/lib/organizations-api";
import { useAuth } from "@/lib/auth-store";
import { isFullPlatformAdmin } from "@/lib/platform-access";

export type OrgFeatureFlagKey =
  | "ai_scan"
  | "satellite"
  | "bioacoustic"
  | "reports"
  | "payments";

function toFlagMap(flags: OrgFeatureFlag[]): Map<OrgFeatureFlagKey, boolean> {
  const map = new Map<OrgFeatureFlagKey, boolean>();
  for (const flag of flags) {
    map.set(flag.key as OrgFeatureFlagKey, flag.enabled);
  }
  return map;
}

/** Resolved org feature flags for nav gating (undefined while loading or for platform admins). */
export function useOrgFeatureFlagMap() {
  const { user } = useAuth();
  const fullAdmin = isFullPlatformAdmin(user);

  const query = useQuery({
    queryKey: ["org-feature-flags"],
    queryFn: async () => toFlagMap((await organizations.myFeatureFlags()).flags),
    enabled: Boolean(user) && !fullAdmin && Boolean(user?.organization_id),
    staleTime: 120_000,
  });

  if (fullAdmin || !user?.organization_id) {
    return { flags: undefined as Map<OrgFeatureFlagKey, boolean> | undefined, isLoading: false };
  }

  return { flags: query.data, isLoading: query.isLoading };
}

export function isOrgFeatureEnabled(
  flags: Map<OrgFeatureFlagKey, boolean> | undefined,
  key?: OrgFeatureFlagKey,
): boolean {
  if (!key || !flags) return true;
  return flags.get(key) !== false;
}
