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

  it("skips tree defaults for estate monitoring scheme", () => {
    const monitoringProject = {
      id: "p2",
      code: "EST-1",
      scheme_code: "estate_monitoring",
      compliance_mode: "guided",
      active_standard: { name: "Estate Watch v1", rules: { monitoring_only: true } },
      metadata: {
        scheme_refs: {
          estate_name: "Block A",
          managing_agency: "Forest Dept",
          state_name: "Rajasthan",
          forest_type: "natural_forest",
          total_area_ha: 100,
          baseline_year: 2024,
          monitoring_objective: "health_watch",
        },
      },
    } as unknown as PlantingProject;

    const status = evaluateProjectSetup({
      project: monitoringProject,
      workAreas: [workArea],
      scheme: {
        code: "estate_monitoring",
        metadata_sections: [
          {
            fields: [
              { key: "estate_name", required: true },
              { key: "managing_agency", required: true },
              { key: "state_name", required: true },
              { key: "forest_type", required: true },
              { key: "total_area_ha", required: true },
              { key: "baseline_year", required: true },
              { key: "monitoring_objective", required: true },
            ],
          },
        ],
      } as never,
    });

    expect(status.monitoringMode).toBe(true);
    expect(status.steps.some((s) => s.id === "tree_defaults")).toBe(false);
    expect(status.setupComplete).toBe(true);
    expect(status.satelliteWatchEnabled).toBe(true);
  });

  it("detects satellite watch opt-in on planting projects", () => {
    const watched = {
      ...campaProject,
      metadata: {
        ...campaProject.metadata,
        satellite_watch_enabled: true,
      },
    } as unknown as PlantingProject;
    const status = evaluateProjectSetup({
      project: watched,
      workAreas: [workArea],
      scheme: { code: "campa_ca", metadata_sections: [{ fields: [] }] } as never,
    });
    expect(status.monitoringMode).toBe(false);
    expect(status.satelliteWatchEnabled).toBe(true);
  });
});
