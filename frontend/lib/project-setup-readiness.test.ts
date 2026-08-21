import { describe, expect, it } from "vitest";
import { evaluateProjectSetup, missingSchemeRefKeys } from "./project-setup-readiness";
import type { PlantingProject, WorkArea } from "./api";

const campaProject = {
  id: "p1",
  code: "CAMPA-1",
  scheme_code: "campa_ca",
  compliance_mode: "strict",
  active_standard: { name: "CAMPA CA v1", rules: {} },
  metadata: {
    scheme_refs: {
      pca_number: "PCA/1",
      forest_diversion_id: "FC-1",
      apo_financial_year: "2025-26",
      state_name: "Rajasthan",
    },
  },
} as unknown as PlantingProject;

const workArea = { id: "wa1", name: "Block A" } as WorkArea;

describe("evaluateProjectSetup", () => {
  it("marks setup complete when refs, standard, and work area exist", () => {
    const status = evaluateProjectSetup({
      project: campaProject,
      workAreas: [workArea],
      scheme: {
        code: "campa_ca",
        metadata_sections: [
          {
            fields: [
              { key: "pca_number", required: true },
              { key: "forest_diversion_id", required: true },
              { key: "apo_financial_year", required: true },
              { key: "state_name", required: true },
            ],
          },
        ],
      } as never,
    });
    expect(status.setupComplete).toBe(true);
    expect(status.canRegisterTree).toBe(true);
  });

  it("blocks registration when scheme refs are missing", () => {
    const incomplete = {
      ...campaProject,
      metadata: { scheme_refs: { pca_number: "PCA/1" } },
    } as unknown as PlantingProject;
    const status = evaluateProjectSetup({
      project: incomplete,
      workAreas: [workArea],
      scheme: {
        code: "campa_ca",
        metadata_sections: [
          {
            fields: [
              { key: "pca_number", required: true },
              { key: "forest_diversion_id", required: true },
            ],
          },
        ],
      } as never,
    });
    expect(status.setupComplete).toBe(false);
    expect(status.canRegisterTree).toBe(false);
    expect(missingSchemeRefKeys(incomplete, status.steps.length ? {
      code: "campa_ca",
      metadata_sections: [{ fields: [{ key: "forest_diversion_id", required: true }] }],
    } as never : null)).toContain("forest_diversion_id");
  });
});
