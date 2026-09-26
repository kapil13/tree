import { describe, expect, it } from "vitest";
import { scopeFieldOpsSummary, type FieldOpsSummaryData } from "./field-ops-scope";

const baseSummary: FieldOpsSummaryData = {
  project_count: 2,
  tree_count: 300,
  open_violations: 5,
  survival_due: 12,
  audit_plots_due: 3,
  by_segment: { general: 1, nhai_highway: 1 },
  by_scheme: { campa: 2 },
  projects: [
    {
      id: "p1",
      code: "P1",
      name: "Alpha",
      segment: "general",
      compliance_mode: "standard",
      status: "active",
      open_violations: 2,
      survival_due: 4,
      audit_plots_due: 1,
      tree_count: 100,
      target_tree_count: 200,
      progress_pct: 50,
    },
    {
      id: "p2",
      code: "P2",
      name: "Beta",
      segment: "nhai_highway",
      compliance_mode: "standard",
      status: "active",
      open_violations: 3,
      survival_due: 8,
      audit_plots_due: 2,
      tree_count: 200,
      target_tree_count: 400,
      progress_pct: 50,
    },
  ],
  recent_violations: [
    {
      id: "v1",
      project_id: "p1",
      project_code: "P1",
      project_name: "Alpha",
      segment: "general",
      violation_type: "missing_photo",
      severity: "medium",
      message: "Photo required",
      tree_id: "t1",
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "v2",
      project_id: "p2",
      project_code: "P2",
      project_name: "Beta",
      segment: "nhai_highway",
      violation_type: "geotag_due",
      severity: "low",
      message: "Geotag due",
      tree_id: null,
      created_at: "2026-01-02T00:00:00Z",
    },
  ],
};

describe("scopeFieldOpsSummary", () => {
  it("returns the raw summary when no project is selected", () => {
    expect(scopeFieldOpsSummary(baseSummary, null)).toEqual(baseSummary);
    expect(scopeFieldOpsSummary(baseSummary, undefined)).toEqual(baseSummary);
  });

  it("scopes totals and lists to one project", () => {
    const scoped = scopeFieldOpsSummary(baseSummary, "p1");

    expect(scoped.project_count).toBe(1);
    expect(scoped.projects).toHaveLength(1);
    expect(scoped.projects[0]?.id).toBe("p1");
    expect(scoped.tree_count).toBe(100);
    expect(scoped.open_violations).toBe(2);
    expect(scoped.survival_due).toBe(4);
    expect(scoped.audit_plots_due).toBe(1);
    expect(scoped.by_segment).toEqual({ general: 1 });
    expect(scoped.by_scheme).toEqual({});
    expect(scoped.recent_violations).toHaveLength(1);
    expect(scoped.recent_violations[0]?.id).toBe("v1");
  });

  it("prefers field brief totals when provided", () => {
    const scoped = scopeFieldOpsSummary(baseSummary, "p1", {
      tree_count: 111,
      open_violations: 9,
      survival_due: 7,
      audit_plots_due: 2,
    });

    expect(scoped.tree_count).toBe(111);
    expect(scoped.open_violations).toBe(9);
    expect(scoped.survival_due).toBe(7);
    expect(scoped.audit_plots_due).toBe(2);
  });
});
