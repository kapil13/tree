import type {
  CompliancePortfolioProjectRow,
  CompliancePortfolioSummary,
  IntelligenceSummary,
} from "@/lib/api";

const RISK_RANK: Record<string, number> = {
  low: 0,
  moderate: 1,
  high: 2,
  critical: 3,
};

export function matchesPortfolioProject(
  projectId: string | null | undefined,
  itemProjectId?: string | null,
) {
  if (!projectId) return true;
  return itemProjectId === projectId;
}

export function maxCompositeRisk(levels: string[]): string {
  if (levels.length === 0) return "low";
  return levels.reduce((max, level) =>
    (RISK_RANK[level] ?? 0) > (RISK_RANK[max] ?? 0) ? level : max,
  );
}

export function scopeCompliancePortfolioKpis(
  data: CompliancePortfolioSummary,
  projectId?: string | null,
) {
  if (!projectId) {
    return {
      avgReadinessPct: data.avg_readiness_pct,
      openViolations: data.open_violations,
      blockingViolations: data.blocking_violations,
      safeguardGapCount: data.safeguard_gap_count,
      projectsWithSafeguardGaps: data.projects_with_safeguard_gaps,
      projectsBelow80: data.projects_below_80_readiness,
      projectCount: data.project_count,
    };
  }

  const projects = data.projects.filter((p) => p.id === projectId);
  const avgReadinessPct = projects.length
    ? projects.reduce((sum, p) => sum + p.readiness_pct, 0) / projects.length
    : 0;

  return {
    avgReadinessPct,
    openViolations: projects.reduce((sum, p) => sum + p.open_violations, 0),
    blockingViolations: projects.reduce((sum, p) => sum + p.blocking_violations, 0),
    safeguardGapCount: projects.reduce((sum, p) => sum + p.safeguard_gaps, 0),
    projectsWithSafeguardGaps: projects.filter((p) => p.safeguard_gaps > 0).length,
    projectsBelow80: projects.filter((p) => p.readiness_pct < 80).length,
    projectCount: projects.length,
  };
}

export function scopeThreatPortfolioKpis(
  data: IntelligenceSummary,
  projectId?: string | null,
) {
  const threatSites = data.threat_sites.filter((site) =>
    matchesPortfolioProject(projectId, site.project_id),
  );
  const pestHotspots = data.pest_hotspots.filter((site) =>
    matchesPortfolioProject(projectId, site.project_id),
  );
  const weatherAlerts = data.weather_alerts.filter((item) =>
    matchesPortfolioProject(projectId, item.project_id),
  );

  const fireWatchCount = projectId
    ? threatSites.filter((site) => {
        const risk = site.fire_watch?.risk_level;
        return risk != null && risk !== "none";
      }).length
    : (data.threat_summary.fire_watch_count ?? 0);

  const floodWatchCount = projectId
    ? threatSites.filter((site) => {
        const risk = site.flood_extent_watch?.risk_level;
        return risk != null && risk !== "none";
      }).length
    : (data.threat_summary.flood_extent_watch_count ?? 0);

  const pestHighCount = projectId
    ? pestHotspots.filter(
        (site) => site.composite_risk === "high" || site.composite_risk === "critical",
      ).length
    : data.pest_high_count;

  return {
    highestRisk: projectId ? maxCompositeRisk(threatSites.map((s) => s.composite_risk)) : data.highest_risk,
    weatherAlertCount: projectId ? weatherAlerts.length : data.weather_alert_count,
    fireWatchCount,
    floodWatchCount,
    pestHighCount,
  };
}

type MonitoringSummaryLike = {
  open_violations?: number;
  stale_satellite_work_areas: number;
  sar_at_risk_work_areas?: number;
  work_area_monitoring?: Array<{
    project_id: string | null;
    days_since_scan: number | null;
    sar_stale?: boolean;
    sar_at_risk?: boolean;
  }>;
  projects: Array<{
    id: string;
    tree_count: number;
    open_violations: number;
  }>;
  unread_alerts_by_kind: Record<string, number>;
};

export function scopeOverviewPortfolioKpis({
  projectId,
  kpiTotalTrees,
  monitoring,
  fieldOps,
  brief,
  auditPortfolio,
}: {
  projectId?: string | null;
  kpiTotalTrees?: number;
  monitoring?: MonitoringSummaryLike | null;
  fieldOps?: {
    open_violations?: number;
    projects: Array<{ id: string; tree_count: number; open_violations: number }>;
  } | null;
  brief?: { tree_count: number; open_violations: number; unread_alerts: number } | null;
  auditPortfolio?: { audit_plots_due: number; projects: Array<{ id: string; audit_plots_due: number }> } | null;
}) {
  const scopedMonitoringProject = projectId
    ? monitoring?.projects.find((p) => p.id === projectId)
    : undefined;
  const scopedFieldProject = projectId
    ? fieldOps?.projects.find((p) => p.id === projectId)
    : undefined;

  const treeCount = projectId
    ? brief?.tree_count ?? scopedMonitoringProject?.tree_count ?? scopedFieldProject?.tree_count ?? 0
    : kpiTotalTrees ?? fieldOps?.projects.reduce((sum, p) => sum + p.tree_count, 0) ?? 0;

  const openViolations = projectId
    ? brief?.open_violations ??
      scopedMonitoringProject?.open_violations ??
      scopedFieldProject?.open_violations ??
      0
    : monitoring?.open_violations ?? fieldOps?.open_violations ?? 0;

  const workAreas =
    monitoring?.work_area_monitoring?.filter((row) =>
      matchesPortfolioProject(projectId, row.project_id),
    ) ?? [];

  const sitesNeedingScan = projectId
    ? workAreas.filter(
        (row) =>
          row.sar_at_risk ||
          row.sar_stale ||
          (row.days_since_scan != null && row.days_since_scan >= 30),
      ).length
    : (monitoring?.stale_satellite_work_areas ?? 0) + (monitoring?.sar_at_risk_work_areas ?? 0);

  const unreadAlerts = projectId
    ? brief?.unread_alerts ??
      Object.values(monitoring?.unread_alerts_by_kind ?? {}).reduce((a, b) => a + b, 0)
    : Object.values(monitoring?.unread_alerts_by_kind ?? {}).reduce((a, b) => a + b, 0);

  const auditPlotsDue = projectId
    ? auditPortfolio?.projects.find((p) => p.id === projectId)?.audit_plots_due ?? 0
    : auditPortfolio?.audit_plots_due ?? 0;

  return {
    treeCount,
    openViolations,
    sitesNeedingScan,
    unreadAlerts,
    auditPlotsDue,
  };
}

export type { CompliancePortfolioProjectRow };
