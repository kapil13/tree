import { describe, expect, it } from "vitest";
import type { User } from "@/lib/api";
import {
  auditPhasesForMode,
  coerceAuditPhaseForMode,
  defaultAuditPhaseForMode,
  isAuditPhaseVisibleInMode,
  resolveAuditWorkspaceMode,
} from "./audit-workspace-mode";

function user(overrides: Partial<User>): User {
  return {
    id: "u1",
    email: "u@example.com",
    role: "corporate",
    organization_id: "org-1",
    ...overrides,
  } as User;
}

describe("audit-workspace-mode", () => {
  it("resolves field, review, and full modes", () => {
    expect(resolveAuditWorkspaceMode(user({ role: "field_worker" }))).toBe("field");
    expect(resolveAuditWorkspaceMode(user({ role: "field_worker", has_professional_program: true }))).toBe(
      "full",
    );
    expect(resolveAuditWorkspaceMode(user({ role: "corporate", org_role: "viewer" }))).toBe("review");
    expect(resolveAuditWorkspaceMode(user({ role: "corporate" }))).toBe("full");
  });

  it("limits visible phases per mode", () => {
    expect(auditPhasesForMode("field")).toEqual(["sampling", "reconciliation"]);
    expect(isAuditPhaseVisibleInMode("export", "review")).toBe(true);
    expect(isAuditPhaseVisibleInMode("intake", "review")).toBe(false);
  });

  it("picks role-aware default phases", () => {
    expect(defaultAuditPhaseForMode("risk_assessed", "field")).toBe("sampling");
    expect(defaultAuditPhaseForMode("export_ready", "review")).toBe("attestation");
    expect(defaultAuditPhaseForMode("field_verified", "review")).toBe("export");
  });

  it("coerces invalid URL phases back into the active mode", () => {
    expect(coerceAuditPhaseForMode("intake", "field_verified", "field")).toBe("sampling");
    expect(coerceAuditPhaseForMode("intake", "export_ready", "review")).toBe("attestation");
  });
});
