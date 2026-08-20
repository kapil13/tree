"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { plantingProjects } from "@/lib/api";

export function useProjectWorkspace(projectId: string) {
  const projectQuery = useQuery({
    queryKey: ["planting-project", projectId],
    queryFn: () => plantingProjects.get(projectId),
  });

  const workAreasQuery = useQuery({
    queryKey: ["project-work-areas", projectId],
    queryFn: () => plantingProjects.workAreas(projectId),
    enabled: !!projectId,
  });

  const survivalDueQuery = useQuery({
    queryKey: ["project-survival-due", projectId],
    queryFn: () => plantingProjects.survivalDue(projectId),
    enabled: !!projectId,
  });

  const project = projectQuery.data;
  const workAreas = workAreasQuery.data ?? [];

  const registerHref = useMemo(() => {
    if (!project) return `/trees/new?project=${projectId}`;
    return `/trees/new?project=${project.id}${
      workAreas[0] ? `&work_area=${workAreas[0].id}` : ""
    }`;
  }, [project, projectId, workAreas]);

  return {
    project,
    workAreas,
    survivalDue: survivalDueQuery.data,
    registerHref,
    isLoading:
      projectQuery.isLoading ||
      workAreasQuery.isLoading ||
      survivalDueQuery.isLoading,
  };
}
