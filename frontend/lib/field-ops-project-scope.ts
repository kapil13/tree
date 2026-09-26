import { fieldOpsHref } from "@/lib/field-ops-links";
import { resolvePortfolioProjectName } from "@/lib/portfolio-project-scope";

export type FieldOpsScopeSyncPlan = {
  setContextProjectId?: string;
  replaceHref?: string;
};

/** Pure planner for URL ↔ project-context sync on /field-ops. */
export function planFieldOpsScopeSync(
  urlProjectId: string | null,
  contextProjectId: string | null,
): FieldOpsScopeSyncPlan {
  if (urlProjectId === contextProjectId) return {};

  if (urlProjectId && !contextProjectId) {
    return { replaceHref: fieldOpsHref() };
  }

  if (contextProjectId) {
    return { replaceHref: fieldOpsHref({ projectId: contextProjectId }) };
  }

  return {};
}

export { resolvePortfolioProjectName as resolveFieldOpsProjectName };
