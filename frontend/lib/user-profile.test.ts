import { describe, expect, it } from "vitest";
import { ageFromDateOfBirth } from "./user-profile";

describe("ageFromDateOfBirth", () => {
  it("calculates age in full years", () => {
    expect(ageFromDateOfBirth("2000-01-01")).toBeGreaterThanOrEqual(25);
    expect(ageFromDateOfBirth(null)).toBeNull();
  });
});
