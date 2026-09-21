"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AuditWorkspace } from "@/components/audit/audit-workspace";
import { ProjectWorkspaceShell } from "@/components/projects/project-workspace-shell";
import { useSyncProjectContextFromRoute } from "@/lib/sync-project-context";
import { useProjectWorkspace } from "@/lib/use-project-workspace";
import { isMonitoringOnlyProject } from "@/lib/project-monitoring";
import { projectOverviewHref } from "@/lib/project-focused-ui";
import { satelliteHref } from "@/lib/satellite-links";

export default function ProjectAuditPage() {
  const t = useTranslations("projectPages");
  const params = useParams();
  const projectId = params.id as string;
  useSyncProjectContextFromRoute(projectId);
  const { project, workAreas, registerHref, setupStatus, isLoading } = useProjectWorkspace(projectId);

  if (isLoading || !project) {
    return <p className="text-sm text-stone-500">{t("auditLoading")}</p>;
  }

  if (!isMonitoringOnlyProject(project)) {
    return (
      <div className="card space-y-2">
        <p className="text-sm text-stone-600">{t("auditUnavailable")}</p>
        <Link href={projectOverviewHref(projectId)} className="text-sm text-forest-700 underline">
          {t("auditBackLink")}
        </Link>
      </div>
    );
  }

  const openViolations = project.summary?.open_violations ?? 0;
  const satHref = satelliteHref({
    fenceId: workAreas[0]?.id,
    projectId,
  });

  return (
    <ProjectWorkspaceShell
      project={project}
      projectId={projectId}
      registerHref={registerHref}
      canRegisterTree={setupStatus?.canRegisterTree ?? true}
      registerBlockReason={setupStatus?.blockReason}
      monitoringMode={true}
      satelliteWatchEnabled={setupStatus?.satelliteWatchEnabled ?? true}
      primaryWorkAreaId={workAreas[0]?.id}
      activeSection="audit"
      openViolations={openViolations}
    >
      <AuditWorkspace projectId={projectId} satelliteHref={satHref} />
    </ProjectWorkspaceShell>
  );
}
