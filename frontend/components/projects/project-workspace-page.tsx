"use client";

import { useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ProjectFocusedOverview } from "@/components/projects/project-focused-overview";
import { ProjectSecondarySection } from "@/components/projects/project-secondary-section";
import { ProjectWorkspaceShell } from "@/components/projects/project-workspace-shell";
import {
  parseProjectSecondarySegment,
  resolveLegacyProjectTabHref,
  type ProjectSecondaryTab,
} from "@/lib/project-focused-ui";
import { useProjectWorkspace } from "@/lib/use-project-workspace";

export function ProjectWorkspacePage({
  section,
}: {
  section: "overview" | ProjectSecondaryTab;
}) {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const legacyTab = searchParams.get("tab");
  const autoDraw = searchParams.get("draw") === "1";

  const { project, workAreas, survivalDue, registerHref, setupStatus, isLoading } =
    useProjectWorkspace(projectId);

  useEffect(() => {
    if (section !== "overview" || !legacyTab) return;
    const href = resolveLegacyProjectTabHref(projectId, legacyTab);
    if (href) router.replace(href);
  }, [section, legacyTab, projectId, router]);

  useEffect(() => {
    if (section !== "overview" || typeof window === "undefined") return;
    if (window.location.hash !== "#work-areas") return;
    const el = document.getElementById("work-areas");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [section, isLoading]);

  if (isLoading || !project) {
    return <p className="text-sm text-stone-500">Loading project workspace…</p>;
  }

  const openViolations = project.summary?.open_violations ?? 0;

  return (
    <ProjectWorkspaceShell
      project={project}
      projectId={projectId}
      registerHref={registerHref}
      canRegisterTree={setupStatus?.canRegisterTree ?? true}
      registerBlockReason={setupStatus?.blockReason}
      activeSection={section}
      openViolations={openViolations}
    >
      {section === "overview" ? (
        <ProjectFocusedOverview
          project={project}
          projectId={projectId}
          workAreas={workAreas}
          survivalDue={survivalDue}
          registerHref={registerHref}
          setupStatus={setupStatus ?? undefined}
          autoDraw={autoDraw}
        />
      ) : (
        <ProjectSecondarySection
          tab={section}
          project={project}
          projectId={projectId}
          workAreas={workAreas}
        />
      )}
    </ProjectWorkspaceShell>
  );
}

export function ProjectSecondaryRoutePage({ tab }: { tab: ProjectSecondaryTab }) {
  const parsed = parseProjectSecondarySegment(tab);
  if (!parsed) {
    return <p className="text-sm text-stone-500">Unknown project section.</p>;
  }
  return <ProjectWorkspacePage section={parsed} />;
}
