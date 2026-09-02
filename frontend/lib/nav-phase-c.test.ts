import { describe, expect, it } from "vitest";
import { alertsHref } from "./alerts-links";
import { fieldOpsHref } from "./field-ops-links";
import {
  portfolioComplianceHref,
  portfolioHealthHref,
  portfolioMonitoringHref,
  portfolioThreatsHref,
} from "./portfolio-health-links";

describe("nav phase C link helpers", () => {
  it("builds portfolio health hrefs with optional project scope", () => {
    expect(portfolioHealthHref()).toBe("/portfolio-health");
    expect(portfolioComplianceHref()).toBe("/portfolio-health?tab=compliance");
    expect(portfolioMonitoringHref()).toBe("/portfolio-health?tab=monitoring");
    expect(portfolioMonitoringHref("proj-1")).toBe(
      "/portfolio-health?tab=monitoring&project=proj-1",
    );
    expect(portfolioThreatsHref()).toBe("/portfolio-health?tab=threats");
    expect(portfolioHealthHref("monitoring", { projectId: "proj-1" })).toBe(
      "/portfolio-health?tab=monitoring&project=proj-1",
    );
  });

  it("builds field ops and alerts hrefs", () => {
    expect(fieldOpsHref()).toBe("/field-ops");
    expect(fieldOpsHref({ section: "attention" })).toBe("/field-ops?section=attention");
    expect(alertsHref()).toBe("/alerts");
    expect(alertsHref({ sar: "sar_integrity_at_risk" })).toBe(
      "/alerts?sar=sar_integrity_at_risk",
    );
  });
});
