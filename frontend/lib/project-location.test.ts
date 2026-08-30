import { describe, expect, it } from "vitest";
import {
  EMPTY_PROJECT_LOCATION,
  projectLocationToMetadata,
  syncSchemeRefsFromLocation,
  validateProjectLocation,
} from "@/lib/project-location";

describe("project-location", () => {
  it("validates required hierarchy fields without city", () => {
    const errors = validateProjectLocation({ ...EMPTY_PROJECT_LOCATION });
    expect(errors.financial_year).toBeTruthy();
    expect(errors.state_code).toBeTruthy();
    expect(errors.district_code).toBeTruthy();
    expect(errors.city).toBeUndefined();
  });

  it("syncs scheme refs from location", () => {
    const refs = syncSchemeRefsFromLocation(
      { apo_financial_year: "", state_name: "" },
      {
        ...EMPTY_PROJECT_LOCATION,
        financial_year: "2026-27",
        state_name: "Rajasthan",
        district_name: "Jaipur",
        gram_panchayat_name: "Test GP",
        village_name: "Test Village",
      },
    );
    expect(refs.apo_financial_year).toBe("2026-27");
    expect(refs.state_name).toBe("Rajasthan");
    expect(refs.district).toBe("Jaipur");
    expect(refs.gram_panchayat).toBe("Test GP");
    expect(refs.village_name).toBe("Test Village");
  });

  it("strips empty metadata values", () => {
    const meta = projectLocationToMetadata({
      ...EMPTY_PROJECT_LOCATION,
      state_name: "Rajasthan",
      financial_year: "2026-27",
    });
    expect(meta).toEqual({ state_name: "Rajasthan", financial_year: "2026-27" });
  });
});
