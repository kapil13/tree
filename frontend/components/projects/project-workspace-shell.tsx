"use client";

import Link from "next/link";
import { Leaf } from "lucide-react";
import type { PlantingProject } from "@/lib/api";
import { PROJECT_FOCUSED_LAYOUT_MARKER } from "@/lib/project-focused-ui";
import { ProjectWorkspaceNav } from "@/components/projects/project-workspace-nav";
import type { ProjectSecondaryTab } from "@/lib/project-focused-ui";

type ProjectWorkspaceShellProps = {
  project: PlantingProject;
  projectId: string;
  registerHref: string;
  activeSection: "overview" | ProjectSecondaryTab;
  openViolations?: number;
  children: React.ReactNode;
};

export function ProjectWorkspaceShell({
  project,
  projectId,
  registerHref,
  activeSection,
  openViolations = 0,
  children,
}: ProjectWorkspaceShellProps) {
  const surveyDays =
    (project.metadata?.survey_interval_days as number | undefined) ?? 30;

  return (
    <div
      className="mx-auto max-w-6xl space-y-4 md:space-y-6"
      data-project-layout={PROJECT_FOCUSED_LAYOUT_MARKER}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link href="/projects" className="text-sm text-forest-700 hover:underline">
            ← All projects
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{project.name}</h1>
          <p className="text-sm text-stone-500">
            {project.code} · {project.segment.replace(/_/g, " ")} ·{" "}
            {project.compliance_mode} mode · survival survey every {surveyDays} days
          </p>
        </div>
        <Link href={registerHref} className="btn-primary w-full shrink-0 sm:w-auto">
          <Leaf className="h-4 w-4" />
          Register tree
        </Link>
      </div>

      <ProjectWorkspaceNav
        projectId={projectId}
        active={activeSection}
        openViolations={openViolations}
        variant="mobile"
      />

      {children}

      <ProjectWorkspaceNav
        projectId={projectId}
        active={activeSection}
        openViolations={openViolations}
        variant="footer"
      />
    </div>
  );
}
