"use client";

import { useParams } from "next/navigation";
import { AuditIntakePanel } from "@/components/audit/audit-intake-panel";
import { ProjectWorkspaceShell } from "@/components/projects/project-workspace-shell";
import { useProjectWorkspace } from "@/lib/use-project-workspace";
import { isMonitoringOnlyProject } from "@/lib/project-monitoring";
import Link from "next/link";
import { projectOverviewHref } from "@/lib/project-focused-ui";

export default function ProjectAuditIntakePage() {
  const params = useParams();
  const projectId = params.id as string;
  const { project, registerHref, setupStatus, isLoading } = useProjectWorkspace(projectId);

  if (isLoading || !project) {
    return <p className="text-sm text-stone-500">Loading…</p>;
  }

  if (!isMonitoringOnlyProject(project)) {
    return (
      <div className="card space-y-2">
        <p className="text-sm text-stone-600">
          Audit intake is available for Estate &amp; Forest Watch projects only.
        </p>
        <Link href={projectOverviewHref(projectId)} className="text-sm text-forest-700 underline">
          Back to project overview
        </Link>
      </div>
    );
  }

  const openViolations = project.summary?.open_violations ?? 0;

  return (
    <ProjectWorkspaceShell
      project={project}
      projectId={projectId}
      registerHref={registerHref}
      canRegisterTree={setupStatus?.canRegisterTree ?? true}
      registerBlockReason={setupStatus?.blockReason}
      monitoringMode={true}
      satelliteWatchEnabled={setupStatus?.satelliteWatchEnabled ?? true}
      activeSection="overview"
      openViolations={openViolations}
    >
      <AuditIntakePanel projectId={projectId} />
    </ProjectWorkspaceShell>
  );
}
