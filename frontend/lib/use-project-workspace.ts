"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { centralSchemes, plantingProjects } from "@/lib/api";
import { evaluateProjectSetup } from "@/lib/project-setup-readiness";
import { schemeByCode } from "@/lib/schemes";

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

  const schemesQuery = useQuery({
    queryKey: ["central-schemes"],
    queryFn: () => centralSchemes.list(),
    enabled: !!projectQuery.data?.scheme_code,
  });

  const project = projectQuery.data;
  const workAreas = workAreasQuery.data ?? [];
  const scheme = schemeByCode(schemesQuery.data ?? [], project?.scheme_code);

  const setupStatus = useMemo(() => {
    if (!project) return null;
    return evaluateProjectSetup({
      project,
      workAreas,
      scheme: scheme as import("@/lib/api").CentralScheme | null | undefined,
    });
  }, [project, workAreas, scheme]);

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
    setupStatus,
    isLoading:
      projectQuery.isLoading ||
      workAreasQuery.isLoading ||
      survivalDueQuery.isLoading,
  };
}
