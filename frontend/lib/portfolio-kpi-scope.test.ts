import { describe, expect, it } from "vitest";
import type { CompliancePortfolioSummary, IntelligenceSummary } from "@/lib/api";
import {
  maxCompositeRisk,
  scopeCompliancePortfolioKpis,
  scopeOverviewPortfolioKpis,
  scopeThreatPortfolioKpis,
} from "./portfolio-kpi-scope";

const complianceSummary: CompliancePortfolioSummary = {
  project_count: 2,
  avg_readiness_pct: 70,
  open_violations: 6,
  blocking_violations: 2,
  safeguard_gap_count: 4,
  projects_with_safeguard_gaps: 2,
  projects_below_80_readiness: 1,
  report_links: [],
  projects: [
    {
      id: "p1",
      name: "Alpha",
      code: "A1",
      segment: "general",
      readiness_pct: 60,
      open_violations: 4,
      blocking_violations: 2,
      safeguard_gaps: 3,
      workflow_done: 1,
      workflow_total: 5,
      compliance_mode: "standard",
      status: "active",
      recommended_checklist: "ngt_campa",
      recommended_checklist_label: "General",
    },
    {
      id: "p2",
      name: "Beta",
      code: "B1",
      segment: "general",
      readiness_pct: 80,
      open_violations: 2,
      blocking_violations: 0,
      safeguard_gaps: 1,
      workflow_done: 4,
      workflow_total: 5,
      compliance_mode: "standard",
      status: "active",
      recommended_checklist: "ngt_campa",
      recommended_checklist_label: "General",
    },
  ],
};

const threatSummary: IntelligenceSummary = {
  generated_at: "2026-01-01T00:00:00Z",
  integrations: { status: "ok", integrations: {} },
  threat_summary: {
    sites_monitored: 2,
    weather_alerts_count: 2,
    pest_high_count: 2,
    locust_watch_count: 0,
    fire_watch_count: 1,
    flood_extent_watch_count: 1,
    highest_risk: "critical",
  },
  highest_risk: "critical",
  weather_alert_count: 2,
  pest_high_count: 2,
  weather_alerts: [
    {
      work_area_id: "w1",
      work_area_name: "A",
      project_id: "p1",
      alert: { kind: "rain", severity: "high", title: "Rain", message: "Heavy rain" },
    },
    {
      work_area_id: "w2",
      work_area_name: "B",
      project_id: "p2",
      alert: { kind: "wind", severity: "medium", title: "Wind", message: "Wind" },
    },
  ],
  pest_hotspots: [
    {
      work_area_id: "w1",
      work_area_name: "A",
      project_id: "p1",
      project_name: "Alpha",
      composite_risk: "high",
      pest_control_needed: true,
      disease_control_needed: false,
      rain_mm_next_48h: 10,
      forecast_summary: "Wet week ahead",
    },
    {
      work_area_id: "w2",
      work_area_name: "B",
      project_id: "p2",
      project_name: "Beta",
      composite_risk: "moderate",
      pest_control_needed: false,
      disease_control_needed: false,
      rain_mm_next_48h: 5,
      forecast_summary: "Dry week ahead",
    },
  ],
  early_warnings: [],
  threat_sites: [
    {
      work_area_id: "w1",
      work_area_name: "A",
      project_id: "p1",
      project_name: "Alpha",
      composite_risk: "high",
      pest_control_needed: true,
      disease_control_needed: false,
      rain_mm_next_48h: 10,
      ndvi_trend: "down",
      tree_count: 10,
      forecast_summary: "",
      fire_watch: { risk_level: "elevated" },
      flood_extent_watch: { risk_level: "none" },
      weather_alerts: [],
      early_warnings: [],
    },
    {
      work_area_id: "w2",
      work_area_name: "B",
      project_id: "p2",
      project_name: "Beta",
      composite_risk: "critical",
      pest_control_needed: false,
      disease_control_needed: false,
      rain_mm_next_48h: 5,
      ndvi_trend: "flat",
      tree_count: 20,
      forecast_summary: "",
      fire_watch: { risk_level: "none" },
      flood_extent_watch: { risk_level: "watch" },
      weather_alerts: [],
      early_warnings: [],
    },
  ],
  biodiversity: {
    work_areas_with_snapshots: 2,
    unique_species_in_latest_snapshots: 5,
  },
  project_count: 2,
  tree_count: 30,
};

describe("maxCompositeRisk", () => {
  it("returns the highest risk level", () => {
    expect(maxCompositeRisk(["low", "moderate", "high"])).toBe("high");
    expect(maxCompositeRisk(["critical", "low"])).toBe("critical");
    expect(maxCompositeRisk([])).toBe("low");
  });
});

describe("scopeCompliancePortfolioKpis", () => {
  it("returns org-wide totals when unscoped", () => {
    expect(scopeCompliancePortfolioKpis(complianceSummary, null)).toEqual({
      avgReadinessPct: 70,
      openViolations: 6,
      blockingViolations: 2,
      safeguardGapCount: 4,
      projectsWithSafeguardGaps: 2,
      projectsBelow80: 1,
      projectCount: 2,
    });
  });

  it("scopes totals to one project", () => {
    expect(scopeCompliancePortfolioKpis(complianceSummary, "p1")).toEqual({
      avgReadinessPct: 60,
      openViolations: 4,
      blockingViolations: 2,
      safeguardGapCount: 3,
      projectsWithSafeguardGaps: 1,
      projectsBelow80: 1,
      projectCount: 1,
    });
  });
});

describe("scopeThreatPortfolioKpis", () => {
  it("returns org-wide totals when unscoped", () => {
    expect(scopeThreatPortfolioKpis(threatSummary, null)).toEqual({
      highestRisk: "critical",
      weatherAlertCount: 2,
      fireWatchCount: 1,
      floodWatchCount: 1,
      pestHighCount: 2,
    });
  });

  it("scopes KPIs to one project", () => {
    expect(scopeThreatPortfolioKpis(threatSummary, "p1")).toEqual({
      highestRisk: "high",
      weatherAlertCount: 1,
      fireWatchCount: 1,
      floodWatchCount: 0,
      pestHighCount: 1,
    });
  });
});

describe("scopeOverviewPortfolioKpis", () => {
  it("uses brief totals when a project is selected", () => {
    expect(
      scopeOverviewPortfolioKpis({
        projectId: "p1",
        kpiTotalTrees: 500,
        monitoring: {
          stale_satellite_work_areas: 9,
          sar_at_risk_work_areas: 1,
          unread_alerts_by_kind: { weather: 4 },
          projects: [{ id: "p1", tree_count: 100, open_violations: 2 }],
          work_area_monitoring: [
            { project_id: "p1", days_since_scan: 40, sar_stale: true, sar_at_risk: false },
            { project_id: "p2", days_since_scan: 10, sar_stale: false, sar_at_risk: false },
          ],
        },
        fieldOps: {
          open_violations: 6,
          projects: [{ id: "p1", tree_count: 100, open_violations: 2 }],
        },
        brief: { tree_count: 111, open_violations: 9, unread_alerts: 2 },
        auditPortfolio: {
          audit_plots_due: 5,
          projects: [{ id: "p1", audit_plots_due: 2 }],
        },
      }),
    ).toEqual({
      treeCount: 111,
      openViolations: 9,
      sitesNeedingScan: 1,
      unreadAlerts: 2,
      auditPlotsDue: 2,
    });
  });
});
