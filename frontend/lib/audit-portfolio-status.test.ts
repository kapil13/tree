import { describe, expect, it } from "vitest";
import {
  auditAttestationEnabled,
  auditEngagementStatusLabel,
  auditEngagementStatusTone,
} from "./audit-portfolio-status";

describe("audit-portfolio-status", () => {
  it("labels known engagement statuses", () => {
    expect(auditEngagementStatusLabel("under_review")).toBe("Under review");
    expect(auditEngagementStatusLabel("no_engagement")).toBe("No engagement");
  });

  it("gates attestation-enabled statuses", () => {
    expect(auditAttestationEnabled("export_ready")).toBe(true);
    expect(auditAttestationEnabled("field_verified")).toBe(false);
  });

  it("returns tone classes for status chips", () => {
    expect(auditEngagementStatusTone("attested")).toContain("emerald");
    expect(auditEngagementStatusTone("sampling_planned")).toContain("amber");
  });
});
