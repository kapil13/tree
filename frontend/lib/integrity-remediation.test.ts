import { describe, expect, it } from "vitest";
import {
  auditBlockerLabel,
  resolveIntegrityRemediation,
  resolveMonitoringGateRemediation,
} from "./integrity-remediation";

describe("integrity-remediation", () => {
  const ctx = {
    treeId: "tree-1",
    projectId: "proj-1",
    workAreaId: "fence-a",
    satelliteWatchEnabled: true,
  };

  it("labels audit blockers in plain language", () => {
    expect(auditBlockerLabel("insufficient_photos")).toBe("Need at least 2 photos");
    expect(auditBlockerLabel("unknown_code")).toBe("unknown code");
  });

  it("links photo blockers to follow-up photo anchor on tree detail", () => {
    const action = resolveIntegrityRemediation("insufficient_photos", ctx);
    expect(action.actionLabel).toBe("Add follow-up photo");
    expect(action.href).toBe("/trees/tree-1#follow-up-photo");
  });

  it("links regeotag mismatch to survival survey anchor", () => {
    const action = resolveIntegrityRemediation("regeotag_mismatch", ctx);
    expect(action.actionLabel).toBe("Run survival survey");
    expect(action.href).toBe("/trees/tree-1#survival");
  });

  it("deep-links monitoring gate SAR issues to satellite workspace", () => {
    const action = resolveMonitoringGateRemediation("sar_integrity_below_minimum", ctx);
    expect(action.href).toBe("/satellite?fence=fence-a&project=proj-1");
  });

  it("deep-links optical scan stale to satellite workspace", () => {
    const action = resolveMonitoringGateRemediation("optical_scan_stale", ctx);
    expect(action.href).toBe("/satellite?fence=fence-a&project=proj-1");
  });
});
