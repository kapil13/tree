import { describe, expect, it } from "vitest";
import type { User } from "@/lib/api";
import {
  canAttestMeasurements,
  canSeeNavItem,
  isOrgViewer,
  isVerifier,
} from "@/lib/nav-access";

function user(overrides: Partial<User> & Pick<User, "role">): User {
  return {
    id: "u1",
    email: "x@example.com",
    full_name: "Test",
    organization_id: null,
    ...overrides,
  };
}

describe("nav-access Phase B", () => {
  it("detects org verifier role", () => {
    expect(isVerifier(user({ role: "verifier" }))).toBe(true);
    expect(isVerifier(user({ role: "government", org_role: "verifier" }))).toBe(true);
    expect(isVerifier(user({ role: "government", org_role: "manager" }))).toBe(false);
  });

  it("hides verification nav from org viewers", () => {
    const viewer = user({
      role: "government",
      org_role: "viewer",
      has_professional_program: true,
    });
    expect(isOrgViewer(viewer)).toBe(true);
    expect(canSeeNavItem(viewer, "verifier")).toBe(false);
    expect(canSeeNavItem(viewer, "professional")).toBe(true);
  });

  it("allows verifier attest capability", () => {
    expect(canAttestMeasurements(user({ role: "verifier" }))).toBe(true);
    expect(canAttestMeasurements(user({ role: "government", org_role: "manager" }))).toBe(false);
  });
});
