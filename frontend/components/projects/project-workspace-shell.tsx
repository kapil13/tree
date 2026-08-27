"use client";

import Link from "next/link";
import { AlertTriangle, Leaf, ShieldCheck } from "lucide-react";
import type { PlantingProject } from "@/lib/api";
import { PROJECT_FOCUSED_LAYOUT_MARKER } from "@/lib/project-focused-ui";
import { ProjectWorkspaceNav } from "@/components/projects/project-workspace-nav";
import type { ProjectSecondaryTab } from "@/lib/project-focused-ui";
import { OperationalStatusBar, type OperationalTone } from "@/components/ui";
import { cn } from "@/lib/cn";

type ProjectWorkspaceShellProps = {
  project: PlantingProject;
  projectId: string;
  registerHref: string;
  canRegisterTree?: boolean;
  registerBlockReason?: string;
  activeSection: "overview" | ProjectSecondaryTab;
  openViolations?: number;
  children: React.ReactNode;
};

function projectStatus(
  openViolations: number,
  progressPct: number | null | undefined,
): { tone: OperationalTone; label: string; summary: string } {
  if (openViolations > 0) {
    return {
      tone: openViolations >= 3 ? "critical" : "attention",
      label: `${openViolations} open compliance violation${openViolations === 1 ? "" : "s"}`,
      summary: "Resolve planting rule breaches before audit exports. Review the compliance tab for evidence and remediation.",
    };
  }
  if (progressPct != null && progressPct < 25) {
    return {
      tone: "watch",
      label: "Early registration phase",
      summary: `${progressPct.toFixed(0)}% of target trees registered. Map work areas and accelerate field registration.`,
    };
  }
  return {
    tone: "healthy",
    label: "Project operational",
    summary: "No open violations. Continue survival surveys, satellite monitoring, and compliance checks.",
  };
}

export function ProjectWorkspaceShell({
  project,
  projectId,
  registerHref,
  canRegisterTree = true,
  registerBlockReason,
  activeSection,
  openViolations = 0,
  children,
}: ProjectWorkspaceShellProps) {
  const surveyDays = (project.metadata?.survey_interval_days as number | undefined) ?? 30;
  const progress = project.summary?.progress_pct;
  const status = projectStatus(openViolations, progress);

  return (
    <div className="space-y-5 md:space-y-6" data-project-layout={PROJECT_FOCUSED_LAYOUT_MARKER}>
      <OperationalStatusBar
        tone={status.tone}
        label={status.label}
        summary={status.summary}
        icon={status.tone === "healthy" ? ShieldCheck : AlertTriangle}
        action={
          openViolations > 0 ? (
            <Link
              href={`/projects/${projectId}/compliance`}
              className="btn-secondary text-xs"
            >
              Review compliance
            </Link>
          ) : canRegisterTree ? (
            <Link href={registerHref} className="btn-primary text-xs">
              <Leaf className="h-3.5 w-3.5" />
              Register tree
            </Link>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link href="/projects" className="text-xs font-medium uppercase tracking-wide text-forest-700 hover:underline">
            ← All projects
          </Link>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50 sm:text-3xl">
            {project.name}
          </h1>
          <p className="mt-1.5 text-sm text-stone-600 dark:text-stone-400">
            {project.code} · {project.segment.replace(/_/g, " ")} · {project.compliance_mode} mode
            {progress != null ? ` · ${progress.toFixed(0)}% registered` : ""}
            · survival survey every {surveyDays} days
          </p>
        </div>
        {canRegisterTree && openViolations === 0 ? (
          <Link href={registerHref} className="btn-primary w-full shrink-0 sm:w-auto">
            <Leaf className="h-4 w-4" />
            Register tree
          </Link>
        ) : !canRegisterTree ? (
          <span
            className={cn(
              "inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-stone-200 px-4 py-2.5 text-sm font-medium text-stone-500 sm:w-auto",
            )}
            title={registerBlockReason}
          >
            <Leaf className="h-4 w-4" />
            Register tree
          </span>
        ) : null}
      </div>

      <ProjectWorkspaceNav
        projectId={projectId}
        active={activeSection}
        openViolations={openViolations}
      />

      {children}
    </div>
  );
}
