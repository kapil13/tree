"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { PortfolioHealthTab } from "@/lib/portfolio-health-links";
import { useProjectContext } from "@/lib/project-context";
import {
  planPortfolioScopeSync,
  resolvePortfolioProjectName,
} from "@/lib/portfolio-project-scope";

export function usePortfolioProjectScope(tab: PortfolioHealthTab) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { projectId: contextProjectId, setProjectId, projects, selectedProject } =
    useProjectContext();

  const projectIdFromUrl = searchParams.get("project");
  const projectId = projectIdFromUrl ?? contextProjectId;

  const projectName = useMemo(
    () => resolvePortfolioProjectName(projectId, projects, selectedProject),
    [projectId, projects, selectedProject],
  );

  const seededProjectFromUrl = useRef(false);

  useEffect(() => {
    if (
      projectIdFromUrl &&
      !contextProjectId &&
      !seededProjectFromUrl.current
    ) {
      seededProjectFromUrl.current = true;
      setProjectId(projectIdFromUrl);
      return;
    }

    const plan = planPortfolioScopeSync(projectIdFromUrl, contextProjectId, tab);
    if (plan.setContextProjectId) {
      setProjectId(plan.setContextProjectId);
      return;
    }
    if (plan.replaceHref) {
      router.replace(plan.replaceHref, { scroll: false });
    }
  }, [projectIdFromUrl, contextProjectId, tab, setProjectId, router]);

  return { projectId, projectName };
}
