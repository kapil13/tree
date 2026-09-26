import { describe, expect, it } from "vitest";
import {
  applyProjectTreePrefill,
  applySuggestedNextPrefill,
  formatChainageDisplay,
  formatChainageLabel,
  nextChainageLabelAfter,
  parseChainageLabel,
  uniqueSpeciesChips,
} from "./tree-registration-prefill";
import type { PlantingProject } from "./api";

describe("applyProjectTreePrefill", () => {
  it("prefills CAMPA legal context from scheme refs", () => {
    const project = {
      id: "p-campa",
      code: "CAMPA-TEST",
      scheme_code: "campa_ca",
      metadata: {
        scheme_refs: {
          pca_number: "PCA/RAJ/2025/1842",
          forest_diversion_id: "FC-8821-2024",
          state_campa_account: "Rajasthan State CAMPA",
          state_name: "Rajasthan",
          ca_land_parcel_id: "Block-A",
        },
      },
      active_standard: {
        rules: {
          pit_size_cm: { length: 45, width: 45, depth: 45 },
          spacing_m: { min: 3 },
          guard_type_required: true,
          species_native_pct_min: 80,
        },
      },
    } as unknown as PlantingProject;

    const result = applyProjectTreePrefill({}, project);
    expect(result.legal_basis).toBe("compensatory_afforestation");
    expect(result.land_category).toBe("forest");
    expect(result.permit_reference).toBe("PCA/RAJ/2025/1842");
    expect(result.site_zone).toBe("Block-A");
    expect(result.implementing_agency).toBe("Rajasthan State CAMPA");
    expect(result.pit_size_cm).toBe("45×45×45");
    expect(result.spacing_m).toBe(3);
    expect(result.guard_type).toBe("bamboo");
    expect(result.species_native).toBe(true);
  });

  it("prefills compliance defaults for project mode", () => {
    const project = {
      id: "p-campa",
      code: "CAMPA-TEST",
      scheme_code: "campa_ca",
      metadata: {
        scheme_refs: {
          state_campa_account: "Rajasthan State CAMPA",
        },
      },
      active_standard: { rules: {} },
    } as unknown as PlantingProject;

    const result = applyProjectTreePrefill({}, project, { surveyorName: "Field Officer" });
    expect(result.survival_status).toBe("live");
    expect(result.surveyor_name).toBe("Field Officer");
    expect(result.maintenance_responsible).toBe("Rajasthan State CAMPA");
  });

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

  it("prefills pit spacing and guard from active standard", () => {
    const project = {
      id: "p2",
      code: "NH-48",
      active_standard: {
        rules: {
          pit_size_cm: { length: 60, width: 60, depth: 60 },
          spacing_m: { min: 6 },
          guard_type_required: true,
        },
      },
    } as unknown as PlantingProject;

    const result = applyProjectTreePrefill({}, project);
    expect(result.pit_size_cm).toBe("60×60×60");
    expect(result.spacing_m).toBe(6);
    expect(result.guard_type).toBe("bamboo");
  });
});

describe("applySuggestedNextPrefill", () => {
  it("updates chainage and GPS for the next gap", () => {
    const result = applySuggestedNextPrefill(
      { species_text: "Neem", chainage_km: "1+000", latitude: "26.1", longitude: "75.1" },
      {
        chainage_label: "1+006",
        chainage_display: "KM 1+006",
        latitude: 26.876,
        longitude: 75.745,
      },
    );
    expect(result.species_text).toBe("Neem");
    expect(result.chainage_km).toBe("1+006");
    expect(result.latitude).toBe("26.876");
    expect(result.longitude).toBe("75.745");
    expect(result.accuracy_m).toBe("");
  });
});

describe("formatChainageLabel", () => {
  it("formats decimal km as chainage label", () => {
    expect(formatChainageLabel(142.38)).toBe("142+380");
    expect(formatChainageDisplay(142.38)).toBe("KM 142+380");
  });

  it("parses chainage label back to decimal km", () => {
    expect(parseChainageLabel("142+380")).toBe(142.38);
    expect(parseChainageLabel("1+000")).toBe(1);
  });

  it("computes next chainage after spacing", () => {
    expect(nextChainageLabelAfter("1+000", 6)).toBe("1+006");
    expect(nextChainageLabelAfter("142+380", 6)).toBe("142+386");
  });
});

describe("uniqueSpeciesChips", () => {
  it("deduplicates common and scientific names", () => {
    const chips = uniqueSpeciesChips(["Khejri", "Prosopis cineraria", "Neem", "Khejri"]);
    expect(chips).toEqual(["Khejri", "Prosopis cineraria", "Neem"]);
  });
});
