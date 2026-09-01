export const PORTFOLIO_HEALTH_TAB_IDS = [
  "overview",
  "compliance",
  "threats",
  "monitoring",
  "biodiversity",
] as const;

export type PortfolioHealthTab = (typeof PORTFOLIO_HEALTH_TAB_IDS)[number];

export function parsePortfolioHealthTab(value: string | null): PortfolioHealthTab | null {
  if (!value) return null;
  return PORTFOLIO_HEALTH_TAB_IDS.includes(value as PortfolioHealthTab)
    ? (value as PortfolioHealthTab)
    : null;
}

export function portfolioHealthHref(
  tab: PortfolioHealthTab = "overview",
  opts?: { projectId?: string | null },
): string {
  const params = new URLSearchParams();
  if (tab !== "overview") params.set("tab", tab);
  if (opts?.projectId) params.set("project", opts.projectId);
  const query = params.toString();
  return query ? `/portfolio-health?${query}` : "/portfolio-health";
}

export function portfolioComplianceHref(): string {
  return portfolioHealthHref("compliance");
}

export function portfolioMonitoringHref(projectId?: string | null): string {
  return portfolioHealthHref("monitoring", { projectId });
}

export function portfolioThreatsHref(): string {
  return portfolioHealthHref("threats");
}
