import { describe, expect, it } from "vitest";
import {
  citiesForDistrict,
  EMPTY_PROJECT_LOCATION,
  projectLocationToMetadata,
  syncSchemeRefsFromLocation,
  validateProjectLocation,
} from "@/lib/project-location";

describe("project-location", () => {
  it("validates required hierarchy fields without city for rural", () => {
    const errors = validateProjectLocation({ ...EMPTY_PROJECT_LOCATION });
    expect(errors.financial_year).toBeTruthy();
    expect(errors.state_code).toBeTruthy();
    expect(errors.district_code).toBeTruthy();
    expect(errors.block_code).toBeUndefined();
    expect(errors.village_code).toBeUndefined();
  });

  it("requires city for urban locations", () => {
    const errors = validateProjectLocation({
      ...EMPTY_PROJECT_LOCATION,
      financial_year: "2026-27",
      state_code: "08",
      district_code: "104",
      area_type: "urban",
    });
    expect(errors.city_name).toBeTruthy();
    expect(errors.block_code).toBeUndefined();
  });

  it("allows rural save with district only", () => {
    const errors = validateProjectLocation({
      ...EMPTY_PROJECT_LOCATION,
      financial_year: "2026-27",
      state_code: "08",
      state_name: "Rajasthan",
      district_code: "104",
      district_name: "Alwar",
      area_type: "rural",
    });
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("syncs scheme refs from rural location", () => {
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

  it("syncs scheme refs from urban location", () => {
    const refs = syncSchemeRefsFromLocation(
      { ulb_name: "" },
      {
        ...EMPTY_PROJECT_LOCATION,
        area_type: "urban",
        city_name: "Alwar",
        urban_local_body: "Ward 5",
      },
    );
    expect(refs.city_name).toBe("Alwar");
    expect(refs.ulb_name).toBe("Alwar");
    expect(refs.urban_local_body).toBe("Ward 5");
  });

  it("strips empty metadata values", () => {
    const meta = projectLocationToMetadata({
      ...EMPTY_PROJECT_LOCATION,
      state_name: "Rajasthan",
      financial_year: "2026-27",
    });
    expect(meta).toEqual({ state_name: "Rajasthan", financial_year: "2026-27", area_type: "rural" });
  });

  it("prefers district-matching cities for urban picker", () => {
    const cities = [
      { name: "Jaipur" },
      { name: "Alwar" },
      { name: "Rajgarh (Alwar)" },
    ];
    expect(citiesForDistrict(cities, "Alwar").map((c) => c.name)).toEqual(["Alwar"]);
    expect(citiesForDistrict(cities, "Unknown").map((c) => c.name)).toEqual([
      "Jaipur",
      "Alwar",
      "Rajgarh (Alwar)",
    ]);
  });
});
