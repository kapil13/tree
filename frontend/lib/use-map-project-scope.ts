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
  const treeIdFromUrl = searchParams.get("tree");
  const projectId = projectIdFromUrl ?? contextProjectId;

  const projectName = useMemo(
    () => resolveMapProjectName(projectId, projects, selectedProject),
    [projectId, projects, selectedProject],
  );

  const seededProjectFromUrl = useRef(false);

  useEffect(() => {
    if (treeIdFromUrl) {
      if (projectIdFromUrl && !contextProjectId && !seededProjectFromUrl.current) {
        seededProjectFromUrl.current = true;
        setProjectId(projectIdFromUrl);
      }
      return;
    }

    if (projectIdFromUrl && !contextProjectId && !seededProjectFromUrl.current) {
      seededProjectFromUrl.current = true;
      setProjectId(projectIdFromUrl);
      return;
    }

    const plan = planMapScopeSync(projectIdFromUrl, contextProjectId, {
      treeId: treeIdFromUrl,
    });
    if (plan.setContextProjectId) {
      setProjectId(plan.setContextProjectId);
      return;
    }
    if (plan.replaceHref) {
      router.replace(plan.replaceHref, { scroll: false });
    }
  }, [treeIdFromUrl, projectIdFromUrl, contextProjectId, setProjectId, router]);

  return { projectId, projectName };
}
