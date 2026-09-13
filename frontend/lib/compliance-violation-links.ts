import { projectComplianceHref } from "@/lib/compliance-links";

/** Deep link for resolving a compliance violation from field ops or portfolio rows. */
export function violationActionHref(
  projectId: string,
  treeId?: string | null,
): string {
  if (treeId) return `/trees/${treeId}`;
  return projectComplianceHref(projectId, "issues");
}
