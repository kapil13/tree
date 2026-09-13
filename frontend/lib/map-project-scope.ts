import { mapHref } from "@/lib/map-links";
import { resolvePortfolioProjectName } from "@/lib/portfolio-project-scope";

export type MapScopeSyncPlan = {
  setContextProjectId?: string;
  replaceHref?: string;
};

export function planMapScopeSync(
  urlProjectId: string | null,
  contextProjectId: string | null,
  options?: { treeId?: string | null },
): MapScopeSyncPlan {
  if (urlProjectId === contextProjectId) return {};

  const treeId = options?.treeId ?? undefined;

  if (urlProjectId && !contextProjectId) {
    return { replaceHref: mapHref({ treeId }) };
  }

  if (contextProjectId) {
    return { replaceHref: mapHref({ projectId: contextProjectId, treeId }) };
  }

  return {};
}

export { resolvePortfolioProjectName as resolveMapProjectName };
