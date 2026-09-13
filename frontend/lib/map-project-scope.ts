import { mapHref } from "@/lib/map-links";
import { resolvePortfolioProjectName } from "@/lib/portfolio-project-scope";

export type MapScopeSyncPlan = {
  setContextProjectId?: string;
  replaceHref?: string;
};

export function planMapScopeSync(
  urlProjectId: string | null,
  contextProjectId: string | null,
): MapScopeSyncPlan {
  if (urlProjectId === contextProjectId) return {};

  if (urlProjectId && !contextProjectId) {
    return { replaceHref: mapHref() };
  }

  if (contextProjectId) {
    return { replaceHref: mapHref({ projectId: contextProjectId }) };
  }

  return {};
}

export { resolvePortfolioProjectName as resolveMapProjectName };
