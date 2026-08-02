import { describe, expect, it } from "vitest";
import { applyProjectTreePrefill, uniqueSpeciesChips } from "./tree-registration-prefill";
import type { PlantingProject } from "./api";

describe("applyProjectTreePrefill", () => {
  it("prefills government fields from scheme refs", () => {
    const project = {
      id: "p1",
      code: "DEMO-SAHAKAR-VAN",
      scheme_code: "sahakar_van",
      metadata: {
        scheme_refs: {
          village_name: "Sumel",
          district: "Jaipur",
          state_name: "Rajasthan",
          cooperative_society_name: "Sumel Mahila Mandal",
          amul_union_name: "GCMMF",
          nccf_project_ref: "NCCF/SV/2026/SUMEL",
        },
      },
      active_standard: {
        rules: { species_native_pct_min: 100 },
      },
    } as unknown as PlantingProject;

    const result = applyProjectTreePrefill({ species_text: "" }, project);
    expect(result.project_code).toBe("DEMO-SAHAKAR-VAN");
    expect(result.panchayat_village).toBe("Sumel");
    expect(result.community_name).toBe("Sumel Mahila Mandal");
    expect(result.species_native).toBe(true);
  });
});

describe("uniqueSpeciesChips", () => {
  it("deduplicates common and scientific names", () => {
    const chips = uniqueSpeciesChips(["Khejri", "Prosopis cineraria", "Neem", "Khejri"]);
    expect(chips).toEqual(["Khejri", "Prosopis cineraria", "Neem"]);
  });
});
