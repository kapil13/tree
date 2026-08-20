"use client";

import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ProjectFocusedDetail } from "@/components/projects/project-focused-detail";
import { plantingProjects } from "@/lib/api";
import {
  parseProjectSecondaryTab,
  type ProjectSecondaryTab,
} from "@/lib/project-focused-ui";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const secondaryTab = parseProjectSecondaryTab(searchParams.get("tab"));

  const { data: project, isLoading } = useQuery({
    queryKey: ["planting-project", projectId],
    queryFn: () => plantingProjects.get(projectId),
  });

  const { data: workAreas = [] } = useQuery({
    queryKey: ["project-work-areas", projectId],
    queryFn: () => plantingProjects.workAreas(projectId),
    enabled: !!projectId,
  });

  const { data: survivalDue } = useQuery({
    queryKey: ["project-survival-due", projectId],
    queryFn: () => plantingProjects.survivalDue(projectId),
    enabled: !!projectId,
  });

  function navigateSecondary(next: ProjectSecondaryTab) {
    router.push(`/projects/${projectId}?tab=${next}`);
  }

  if (isLoading || !project) {
    return <p className="text-sm text-stone-500">Loading project workspace…</p>;
  }

  return (
    <ProjectFocusedDetail
      project={project}
      projectId={projectId}
      workAreas={workAreas}
      survivalDue={survivalDue}
      secondaryTab={secondaryTab}
      onNavigateSecondary={navigateSecondary}
    />
  );
}
