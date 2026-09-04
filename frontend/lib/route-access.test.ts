import { describe, expect, it } from "vitest";
import {
  canAccessPath,
  routeAccessDeniedFeatureKey,
} from "@/lib/route-access";
import type { User } from "@/lib/api";
import type { OrgFeatureFlagKey } from "@/lib/use-org-feature-flags";

const proUser: User = {
  id: "user-1",
  email: "lead@example.com",
  role: "ngo",
  organization_id: "org-1",
  full_name: "Lead",
  has_professional_program: true,
};

function flags(disabled: OrgFeatureFlagKey): Map<OrgFeatureFlagKey, boolean> {
  return new Map([[disabled, false]]);
}

describe("route-access feature flags", () => {
  it("blocks satellite routes when satellite is disabled", () => {
    expect(canAccessPath(proUser, "/satellite", flags("satellite"))).toBe(false);
    expect(routeAccessDeniedFeatureKey("/satellite", flags("satellite"))).toBe("satellite");
  });

  it("blocks assistant when ai_scan is disabled", () => {
    expect(canAccessPath(proUser, "/assistant", flags("ai_scan"))).toBe(false);
    expect(routeAccessDeniedFeatureKey("/assistant", flags("ai_scan"))).toBe("ai_scan");
  });

  it("allows dashboard regardless of feature flags", () => {
    expect(canAccessPath(proUser, "/dashboard", flags("satellite"))).toBe(true);
  });
});
