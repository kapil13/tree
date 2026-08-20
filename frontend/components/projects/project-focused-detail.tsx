"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Leaf, ShieldCheck } from "lucide-react";
import { ProjectComplianceTab } from "@/components/projects/project-compliance-tab";
import { ProjectCreditLedgerPanel } from "@/components/projects/project-credit-ledger-panel";
import { ProjectGreenCreditPanel } from "@/components/projects/project-green-credit-panel";
import { ProjectImpactSharePanel } from "@/components/projects/project-impact-share-panel";
import { ProjectNprtAssessmentPanel } from "@/components/projects/project-nprt-assessment-panel";
import { ProjectPlotMonitoringPanel } from "@/components/projects/project-plot-monitoring-panel";
import { ProjectSettingsPanel } from "@/components/projects/project-settings-panel";
import { ProjectTeamPanel } from "@/components/projects/project-team-panel";
import { ProjectTreesByArea } from "@/components/projects/project-trees-by-area";
import { ProjectVerificationPanel } from "@/components/projects/project-verification-panel";
import { ProjectVm0047Panel } from "@/components/projects/project-vm0047-panel";
import { ProjectWorkAreaMap } from "@/components/projects/project-work-area-map";
import { PestIntelPanel } from "@/components/pest-intel-panel";
import type { PlantingProject, WorkArea } from "@/lib/api";
import {
  type ProjectSecondaryTab,
  PROJECT_SECONDARY_TABS,
} from "@/lib/project-focused-ui";
import { cn } from "@/lib/cn";

type SurvivalDue = {
  trees_due: number;
  trees_total: number;
  survey_interval_days: number;
};

type ProjectFocusedDetailProps = {
  project: PlantingProject;
  projectId: string;
  workAreas: WorkArea[];
  survivalDue: SurvivalDue | undefined;
  secondaryTab: ProjectSecondaryTab | null;
  onNavigateSecondary: (tab: ProjectSecondaryTab) => void;
};

function ProgrammeStandardAside({
  project,
  surveyDays,
}: {
  project: PlantingProject;
  surveyDays: number;
}) {
  const rules = project.active_standard?.rules ?? {};
  const spacing = rules.spacing_m as { min?: number } | null | undefined;
  const pitSize = rules.pit_size_cm as
    | { length?: number; width?: number; depth?: number }
    | null
    | undefined;
  const pitLabel = pitSize
    ? [pitSize.length, pitSize.width, pitSize.depth].filter(Boolean).join("×")
    : null;

  return (
    <aside className="card space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <ShieldCheck className="h-4 w-4 text-forest-700" />
        Programme standard
      </div>
      {project.active_standard ? (
        <div className="space-y-2 text-sm text-stone-700">
          <p className="font-medium">{project.active_standard.name}</p>
          {spacing?.min != null && <p>Min spacing: {spacing.min} m</p>}
          {pitLabel ? <p>Pit: {pitLabel} cm</p> : null}
          {Boolean(rules.guard_type_required) && <p>Tree guard required</p>}
          {rules.species_native_pct_min != null && (
            <p>Native species min: {String(rules.species_native_pct_min)}%</p>
          )}
          <p className="text-xs text-stone-500">
            Re-geotag / survival check every {surveyDays} days (alerts sent automatically).
          </p>
        </div>
      ) : (
        <p className="text-sm text-stone-500">No standard attached.</p>
      )}
    </aside>
  );
}

function ProjectFooterLinks({
  projectId,
  openViolations,
  activeTab,
}: {
  projectId: string;
  openViolations: number;
  activeTab: ProjectSecondaryTab | null;
}) {
  const links: { tab: ProjectSecondaryTab; label: string }[] = [
    {
      tab: "compliance",
      label:
        openViolations > 0 ? `Compliance (${openViolations} open)` : "Compliance",
    },
    { tab: "team", label: "Team & work areas" },
    { tab: "credits", label: "Credits & reports" },
    { tab: "settings", label: "Programme settings" },
  ];

  return (
    <nav
      className="flex flex-wrap gap-x-6 gap-y-2 border-t border-stone-200 pt-6 text-sm"
      aria-label="Project sections"
    >
      {links.map(({ tab, label }) => (
        <Link
          key={tab}
          href={`/projects/${projectId}?tab=${tab}`}
          className={cn(
            "hover:text-forest-700",
            activeTab === tab
              ? "font-medium text-forest-800"
              : "text-stone-500",
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

function SecondaryPanel({
  tab,
  project,
  projectId,
  workAreas,
  onNavigateSecondary,
}: {
  tab: ProjectSecondaryTab;
  project: PlantingProject;
  projectId: string;
  workAreas: WorkArea[];
  onNavigateSecondary: (tab: ProjectSecondaryTab) => void;
}) {
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const pestAreaId = useMemo(
    () => selectedAreaId ?? workAreas[0]?.id ?? null,
    [selectedAreaId, workAreas],
  );

  const titles: Record<ProjectSecondaryTab, string> = {
    compliance: "Compliance",
    credits: "Credits & reports",
    team: "Team & work areas",
    settings: "Programme settings",
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/projects/${projectId}`}
          className="text-sm text-forest-700 hover:underline"
        >
          ← Project overview
        </Link>
        <h2 className="mt-2 text-lg font-semibold text-stone-900">{titles[tab]}</h2>
      </div>

      {tab === "compliance" && (
        <div className="space-y-6">
          <ProjectComplianceTab
            projectId={projectId}
            projectCode={project.code}
            projectMetadata={project.metadata}
            schemeCode={project.scheme_code}
            onNavigateTab={(next) => {
              if (PROJECT_SECONDARY_TABS.includes(next as ProjectSecondaryTab)) {
                onNavigateSecondary(next as ProjectSecondaryTab);
              }
            }}
          />
          {workAreas.length > 0 && (
            <div className="card space-y-3">
              <label className="kpi-label">Pest intel for area</label>
              <select
                className="input"
                value={pestAreaId ?? ""}
                onChange={(e) => setSelectedAreaId(e.target.value || null)}
              >
                {workAreas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
              {pestAreaId && (
                <PestIntelPanel kind="work-area" targetId={pestAreaId} />
              )}
            </div>
          )}
        </div>
      )}

      {tab === "credits" && (
        <div className="space-y-4">
          <div className="card">
            <ProjectVm0047Panel projectId={projectId} />
          </div>
          {project.scheme_code === "green_credit_india" && (
            <div className="card">
              <ProjectGreenCreditPanel projectId={projectId} />
            </div>
          )}
          <div className="card">
            <ProjectNprtAssessmentPanel projectId={projectId} />
          </div>
          <div className="card">
            <ProjectCreditLedgerPanel projectId={projectId} />
          </div>
          <div className="card">
            <ProjectPlotMonitoringPanel projectId={projectId} />
          </div>
          <div className="card">
            <ProjectVerificationPanel projectId={projectId} />
          </div>
        </div>
      )}

      {tab === "team" && (
        <ProjectTeamPanel
          projectId={projectId}
          workAreas={workAreas.map((area) => ({ id: area.id, name: area.name }))}
        />
      )}

      {tab === "settings" && (
        <div className="space-y-6">
          <ProjectSettingsPanel project={project} />
          <ProjectImpactSharePanel projectId={projectId} />
        </div>
      )}

      <ProjectFooterLinks
        projectId={projectId}
        openViolations={project.summary?.open_violations ?? 0}
        activeTab={tab}
      />
    </div>
  );
}

export function ProjectFocusedDetail({
  project,
  projectId,
  workAreas,
  survivalDue,
  secondaryTab,
  onNavigateSecondary,
}: ProjectFocusedDetailProps) {
  const surveyDays =
    (project.metadata?.survey_interval_days as number | undefined) ?? 30;
  const registerHref = `/trees/new?project=${project.id}${
    workAreas[0] ? `&work_area=${workAreas[0].id}` : ""
  }`;
  const openViolations = project.summary?.open_violations ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/projects" className="text-sm text-forest-700 hover:underline">
            ← All projects
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{project.name}</h1>
          <p className="text-sm text-stone-500">
            {project.code} · {project.segment.replace(/_/g, " ")} ·{" "}
            {project.compliance_mode} mode · survival survey every {surveyDays} days
          </p>
        </div>
        <Link href={registerHref} className="btn-primary shrink-0">
          <Leaf className="h-4 w-4" />
          Register tree
        </Link>
      </div>

      {secondaryTab ? (
        <SecondaryPanel
          tab={secondaryTab}
          project={project}
          projectId={projectId}
          workAreas={workAreas}
          onNavigateSecondary={onNavigateSecondary}
        />
      ) : (
        <>
          {survivalDue && survivalDue.trees_due > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <strong>{survivalDue.trees_due}</strong> of {survivalDue.trees_total}{" "}
              trees are due for re-geotagging (every{" "}
              {survivalDue.survey_interval_days} days). See the tree list below or open
              individual tree records to update GPS and survival status.
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card">
              <p className="kpi-label">Trees planted</p>
              <p className="text-2xl font-semibold">{project.summary?.tree_count ?? 0}</p>
            </div>
            <div className="card">
              <p className="kpi-label">Work areas</p>
              <p className="text-2xl font-semibold">
                {project.summary?.work_area_count ?? 0}
              </p>
            </div>
            <Link
              href={`/projects/${projectId}?tab=compliance`}
              className="card block transition hover:border-amber-200"
            >
              <p className="kpi-label">Open violations</p>
              <p className="text-2xl font-semibold">{openViolations}</p>
              {openViolations > 0 && (
                <p className="mt-1 text-xs text-forest-700">View & fix →</p>
              )}
            </Link>
            <div className="card">
              <p className="kpi-label">Geotag due</p>
              <p className="text-2xl font-semibold">{survivalDue?.trees_due ?? 0}</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
            <div className="card space-y-4">
              <h2 className="text-sm font-medium">Work areas</h2>
              <ProjectWorkAreaMap projectId={projectId} workAreas={workAreas} />
            </div>
            <ProgrammeStandardAside project={project} surveyDays={surveyDays} />
          </div>

          <div className="card">
            <ProjectTreesByArea
              projectId={projectId}
              workAreas={workAreas}
              surveyIntervalDays={surveyDays}
            />
          </div>

          <ProjectFooterLinks
            projectId={projectId}
            openViolations={openViolations}
            activeTab={null}
          />
        </>
      )}
    </div>
  );
}
