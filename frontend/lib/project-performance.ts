import type { CompliancePortfolioSummary } from "@/lib/api";

type MonitoringProject = {
  id: string;
  code: string;
  name: string;
  progress_pct: number | null;
};

type WorkAreaMonitoring = {
  project_id: string | null;
  sar_forest_integrity?: number | null;
  latest_ndvi?: number | null;
  days_since_scan?: number | null;
  sar_at_risk?: boolean;
};

export type ProjectPerformanceRow = {
  id: string;
  shortName: string;
  name: string;
  integrityScore: number;
  secondaryLabel: "ndvi" | "stale" | "readiness";
  secondaryValue: string;
  secondaryDown?: boolean;
  href: string;
};

function mean(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function buildProjectPerformanceRows(
  monitoring: {
    projects?: MonitoringProject[];
    work_area_monitoring?: WorkAreaMonitoring[];
  } | null | undefined,
  complianceSummary: CompliancePortfolioSummary | null | undefined,
): ProjectPerformanceRow[] {
  const projects = monitoring?.projects ?? [];
  if (projects.length === 0) return [];

  const workAreasByProject = new Map<string, WorkAreaMonitoring[]>();
  for (const area of monitoring?.work_area_monitoring ?? []) {
    if (!area.project_id) continue;
    const list = workAreasByProject.get(area.project_id) ?? [];
    list.push(area);
    workAreasByProject.set(area.project_id, list);
  }

  const complianceById = new Map(
    (complianceSummary?.projects ?? []).map((project) => [project.id, project]),
  );

  return projects
    .map((project) => {
      const areas = workAreasByProject.get(project.id) ?? [];
      const sarScores = areas
        .map((area) => area.sar_forest_integrity)
        .filter((score): score is number => score != null);
      const ndvis = areas
        .map((area) => area.latest_ndvi)
        .filter((ndvi): ndvi is number => ndvi != null);
      const staleDays = areas.reduce(
        (max, area) => Math.max(max, area.days_since_scan ?? 0),
        0,
      );

      const compliance = complianceById.get(project.id);
      const integrityScore = sarScores.length
        ? Math.round(mean(sarScores))
        : Math.round(compliance?.readiness_pct ?? project.progress_pct ?? 0);

      let secondaryLabel: ProjectPerformanceRow["secondaryLabel"] = "readiness";
      let secondaryValue = `${Math.round(compliance?.readiness_pct ?? project.progress_pct ?? 0)}%`;
      let secondaryDown = (compliance?.readiness_pct ?? 100) < 80;

      if (ndvis.length > 0) {
        const ndviMean = mean(ndvis);
        secondaryLabel = "ndvi";
        secondaryValue = ndviMean.toFixed(2);
        secondaryDown = ndviMean < 0.45;
      } else if (staleDays >= 14) {
        secondaryLabel = "stale";
        secondaryValue = String(staleDays);
        secondaryDown = true;
      }

      return {
        id: project.id,
        shortName: truncate(project.code || project.name, 12),
        name: project.name,
        integrityScore,
        secondaryLabel,
        secondaryValue,
        secondaryDown,
        href: `/projects/${project.id}`,
      };
    })
    .sort((a, b) => a.integrityScore - b.integrityScore);
}

export function integrityBarColor(score: number) {
  if (score < 70) return "#dc2626";
  if (score < 80) return "#d97706";
  return "#16a34a";
}
