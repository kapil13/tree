/** Scope org-wide field-ops summary to a single project when the picker is set. */

export type FieldOpsProjectRow = {
  id: string;
  code: string;
  name: string;
  segment: string;
  compliance_mode: string;
  status: string;
  open_violations: number;
  survival_due: number;
  audit_plots_due?: number;
  tree_count: number;
  target_tree_count: number | null;
  progress_pct: number | null;
};

export type FieldOpsSummaryData = {
  project_count: number;
  tree_count: number;
  open_violations: number;
  survival_due: number;
  audit_plots_due: number;
  by_segment: Record<string, number>;
  by_scheme: Record<string, number>;
  projects: FieldOpsProjectRow[];
  recent_violations: Array<{
    id: string;
    project_id: string;
    project_code: string;
    project_name: string;
    segment: string;
    violation_type: string;
    severity: string;
    message: string;
    tree_id: string | null;
    created_at: string | null;
  }>;
};

export type FieldBriefData = {
  tree_count: number;
  open_violations: number;
  survival_due: number;
  audit_plots_due: number;
};

export function scopeFieldOpsSummary(
  raw: FieldOpsSummaryData,
  projectId: string | null | undefined,
  brief?: FieldBriefData | null,
): FieldOpsSummaryData {
  if (!projectId) return raw;

  const projects = raw.projects.filter((p) => p.id === projectId);
  const project = projects[0];
  const recent_violations = raw.recent_violations.filter((v) => v.project_id === projectId);

  const by_segment: Record<string, number> = {};
  if (project?.segment) {
    by_segment[project.segment] = 1;
  }

  return {
    ...raw,
    projects,
    project_count: projects.length,
    tree_count: brief?.tree_count ?? project?.tree_count ?? 0,
    open_violations: brief?.open_violations ?? project?.open_violations ?? 0,
    survival_due: brief?.survival_due ?? project?.survival_due ?? 0,
    audit_plots_due: brief?.audit_plots_due ?? project?.audit_plots_due ?? 0,
    by_segment,
    by_scheme: {},
    recent_violations,
  };
}
