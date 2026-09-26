import { describe, expect, it } from "vitest";
import { resolveComplianceGapAction } from "./compliance-gap-actions";

describe("compliance-gap-actions", () => {
  const ctx = {
    projectId: "proj-1",
    primaryWorkAreaId: "fence-a",
    satelliteWatchEnabled: true,
  };

  it("deep-links NDVI scan gaps to project satellite workspace", () => {
    const action = resolveComplianceGapAction(
      { item_id: "initial_satellite_scan", auto_key: "work_area_scan_coverage" },
      ctx,
    );
    expect(action.label).toBe("Run NDVI scan");
    expect(action.href).toBe("/satellite?fence=fence-a&project=proj-1");
  });

  it("deep-links SAR integrity gaps to satellite workspace in monitoring mode", () => {
    const action = resolveComplianceGapAction(
      { item_id: "sar_integrity_watch", auto_key: "sar_permanence_risk" },
      ctx,
    );
    expect(action.label).toBe("Review SAR integrity");
    expect(action.href).toBe("/satellite?fence=fence-a&project=proj-1");
  });

  it("routes estate metadata gaps to setup wizard step 3", () => {
    const action = resolveComplianceGapAction(
      { item_id: "baseline_metadata", auto_key: "estate_metadata_complete" },
      ctx,
    );
    expect(action.label).toBe("Complete estate details");
    expect(action.href).toBe("/projects/proj-1/setup?step=3");
  });

  it("deep-links violation gaps to compliance issues section", () => {
    const action = resolveComplianceGapAction(
      { item_id: "open_violations", auto_key: "no_open_violations" },
      ctx,
    );
    expect(action.href).toBe("/projects/proj-1/compliance?section=issues");
  });

  it("routes mining lease gaps to project settings", () => {
    const action = resolveComplianceGapAction(
      { item_id: "mine_lease_linked", auto_key: "mine_lease_linked" },
      ctx,
    );
    expect(action.label).toBe("Add mine lease number");
    expect(action.href).toBe("/projects/proj-1/settings");
  });

  it("routes EC green belt gaps to work-area setup", () => {
    const action = resolveComplianceGapAction(
      { item_id: "ec_green_belt_met", auto_key: "ec_green_belt_compliant" },
      ctx,
    );
    expect(action.label).toBe("Map green belt areas");
    expect(action.href).toBe("/projects/proj-1/setup?step=4");
  });
});
