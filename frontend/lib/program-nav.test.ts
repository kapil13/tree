import { describe, expect, it } from "vitest";
import type { User } from "@/lib/api";
import { programNavBoosters } from "@/lib/program-nav";

function user(partial: Partial<User> & Pick<User, "role">): User {
  return {
    id: "u1",
    email: "x@example.com",
    full_name: "Test",
    organization_id: "o1",
    ...partial,
  };
}

describe("program-nav Phase C", () => {
  it("adds BRSR booster for corporate audience", () => {
    const boosters = programNavBoosters(
      user({
        role: "corporate",
        audience: "corporate_esg",
        enrolled_program_codes: ["corporate_esg"],
        has_professional_program: true,
      }),
    );
    expect(boosters.some((item) => item.href.includes("brsr"))).toBe(true);
  });

  it("adds stewardship for citizen BYOT", () => {
    const boosters = programNavBoosters(
      user({
        role: "user",
        audience: "general",
        enrolled_program_codes: ["byot"],
        has_professional_program: false,
      }),
    );
    expect(boosters.some((item) => item.href === "/stewardship")).toBe(true);
  });

  it("adds community rollups for NGO audience", () => {
    const boosters = programNavBoosters(
      user({
        role: "ngo",
        audience: "ngo_community",
        enrolled_program_codes: ["ngo_community"],
        has_professional_program: true,
      }),
    );
    expect(boosters.some((item) => item.href.includes("district-wise"))).toBe(true);
  });
});
