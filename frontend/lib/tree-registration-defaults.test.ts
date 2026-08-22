import { describe, expect, it } from "vitest";
import {
  deriveTreeRegistrationDefaults,
  enrichTreePayloadMetadata,
  validateTreeRegistrationDefaults,
} from "./tree-registration-defaults";
import type { PlantingProject } from "./api";

describe("deriveTreeRegistrationDefaults", () => {
  it("maps CAMPA scheme refs to tree registration fields", () => {
    const defaults = deriveTreeRegistrationDefaults({
      schemeCode: "campa_ca",
      schemeRefs: {
        pca_number: "PCA/RAJ/2025/1842",
        forest_diversion_id: "FC-8821",
        state_campa_account: "Rajasthan State CAMPA",
        state_name: "Rajasthan",
        ca_land_parcel_id: "Block-A",
      },
      projectCode: "CAMPA-1",
      projectName: "Demo CA Site",
    });
    expect(defaults.permit_reference).toBe("PCA/RAJ/2025/1842");
    expect(defaults.site_zone).toBe("Block-A");
    expect(defaults.implementing_agency).toBe("Rajasthan State CAMPA");
    expect(defaults.maintenance_responsible).toBe("Rajasthan State CAMPA");
    expect(defaults.legal_basis).toBe("compensatory_afforestation");
  });

  it("validates required defaults", () => {
    const errors = validateTreeRegistrationDefaults({
      permit_reference: "",
      site_zone: "Block-A",
      implementing_agency: "Agency",
      maintenance_responsible: "Agency",
    });
    expect(errors.permit_reference).toBeTruthy();
  });
});

describe("enrichTreePayloadMetadata", () => {
  it("injects stored defaults into empty payload metadata", () => {
    const project = {
      id: "p1",
      code: "CAMPA-1",
      name: "Demo",
      scheme_code: "campa_ca",
      program_code: "government_nhai",
      metadata: {
        scheme_refs: { pca_number: "PCA/1", state_name: "Rajasthan", state_campa_account: "RCAMPA" },
        tree_registration_defaults: {
          permit_reference: "PCA/1",
          site_zone: "Block 1",
          implementing_agency: "RCAMPA",
          maintenance_responsible: "RCAMPA",
        },
      },
    } as unknown as PlantingProject;

    const merged = enrichTreePayloadMetadata({}, project, { surveyorName: "Asha" });
    expect(merged.permit_reference).toBe("PCA/1");
    expect(merged.site_zone).toBe("Block 1");
    expect(merged.implementing_agency).toBe("RCAMPA");
    expect(merged.maintenance_responsible).toBe("RCAMPA");
    expect(merged.surveyor_name).toBe("Asha");
    expect(merged.survival_status).toBe("live");
  });
});
