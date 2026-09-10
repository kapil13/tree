import {
  portfolioHealthHref,
  type PortfolioHealthTab,
} from "@/lib/portfolio-health-links";

export type PortfolioScopeSyncPlan = {
  setContextProjectId?: string;
  replaceHref?: string;
};

/** Pure planner for URL ↔ project-context sync on portfolio-health. */
export function planPortfolioScopeSync(
  urlProjectId: string | null,
  contextProjectId: string | null,
  tab: PortfolioHealthTab,
): PortfolioScopeSyncPlan {
  if (urlProjectId && !contextProjectId) {
    return { replaceHref: portfolioHealthHref(tab) };
  }
  if (urlProjectId && urlProjectId !== contextProjectId) {
    return { setContextProjectId: urlProjectId };
  }
  if (!urlProjectId && contextProjectId) {
    return {
      replaceHref: portfolioHealthHref(tab, { projectId: contextProjectId }),
    };
  }
  return {};
}

export function resolvePortfolioProjectName(
  projectId: string | null | undefined,
  projects: Array<{ id: string; name: string }>,
  selectedProject?: { id: string; name: string },
): string | undefined {
  if (!projectId) return undefined;
  if (selectedProject?.id === projectId) return selectedProject.name;
  return projects.find((p) => p.id === projectId)?.name;
}
