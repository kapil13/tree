"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { planMapScopeSync, resolveMapProjectName } from "@/lib/map-project-scope";
import { useProjectContext } from "@/lib/project-context";

export function useMapProjectScope() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { projectId: contextProjectId, setProjectId, projects, selectedProject } =
    useProjectContext();

  const projectIdFromUrl = searchParams.get("project");
  const projectId = projectIdFromUrl ?? contextProjectId;

  const projectName = useMemo(
    () => resolveMapProjectName(projectId, projects, selectedProject),
    [projectId, projects, selectedProject],
  );

  const seededProjectFromUrl = useRef(false);

  useEffect(() => {
    if (projectIdFromUrl && !contextProjectId && !seededProjectFromUrl.current) {
      seededProjectFromUrl.current = true;
      setProjectId(projectIdFromUrl);
      return;
    }

    const plan = planMapScopeSync(projectIdFromUrl, contextProjectId);
    if (plan.setContextProjectId) {
      setProjectId(plan.setContextProjectId);
      return;
    }
    if (plan.replaceHref) {
      router.replace(plan.replaceHref, { scroll: false });
    }
  }, [projectIdFromUrl, contextProjectId, setProjectId, router]);

  return { projectId, projectName };
}
