import { projectSecondaryHref } from "@/lib/project-focused-ui";
import { portfolioComplianceHref, portfolioMonitoringHref } from "@/lib/portfolio-health-links";

export { portfolioComplianceHref, portfolioMonitoringHref };

/** Project compliance workspace with optional section deep-link. */
export function projectComplianceHref(
  projectId: string,
  section?: string,
): string {
  const base = projectSecondaryHref(projectId, "compliance");
  return section ? `${base}?section=${section}` : base;
}

/** Operational compliance violations plantation report. */
export function complianceViolationsReportHref(): string {
  return "/reports/plantation/compliance-violations";
}

/** Map legacy compliance anchors to section query params. */
export function complianceAnchorToSection(anchor: string): string | null {
  if (anchor === "checklist") return "checklist";
  if (anchor === "violations") return "issues";
  if (anchor === "exports") return "exports";
  if (anchor === "safeguards") return "safeguards";
  if (anchor === "integrity") return "integrity";
  if (anchor === "emissions") return "emissions";
  return null;
}
