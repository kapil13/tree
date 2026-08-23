"use client";

import { useRouter } from "next/navigation";
import { ProjectComplianceTab } from "@/components/projects/project-compliance-tab";
import { ProjectCreditLedgerPanel } from "@/components/projects/project-credit-ledger-panel";
import { ProjectGreenCreditPanel } from "@/components/projects/project-green-credit-panel";
import { ProjectImpactSharePanel } from "@/components/projects/project-impact-share-panel";
import { ProjectNprtAssessmentPanel } from "@/components/projects/project-nprt-assessment-panel";
import { ProjectPlotMonitoringPanel } from "@/components/projects/project-plot-monitoring-panel";
import { ProjectSettingsPanel } from "@/components/projects/project-settings-panel";
import { ProjectTeamPanel } from "@/components/projects/project-team-panel";
import { ProjectVerificationPanel } from "@/components/projects/project-verification-panel";
import { ProjectVm0047Panel } from "@/components/projects/project-vm0047-panel";
import type { PlantingProject, WorkArea } from "@/lib/api";
import {
  PROJECT_SECONDARY_TABS,
  projectOverviewHref,
  projectSecondaryHref,
  type ProjectSecondaryTab,
} from "@/lib/project-focused-ui";
import type { ProjectTab } from "@/lib/compliance-gap-actions";

export function ProjectSecondarySection({
  tab,
  project,
  projectId,
  workAreas,
}: {
  tab: ProjectSecondaryTab;
  project: PlantingProject;
  projectId: string;
  workAreas: WorkArea[];
}) {
  const router = useRouter();

  function navigateProjectTab(next: ProjectTab) {
    if (next === "overview" || next === "trees") {
      router.push(projectOverviewHref(projectId));
      return;
    }
    if (PROJECT_SECONDARY_TABS.includes(next as ProjectSecondaryTab)) {
      router.push(projectSecondaryHref(projectId, next as ProjectSecondaryTab));
    }
  }

  return (
    <div className="space-y-6">
      {tab === "compliance" && (
        <ProjectComplianceTab
          projectId={projectId}
          projectCode={project.code}
          projectMetadata={project.metadata}
          schemeCode={project.scheme_code}
          workAreas={workAreas}
          onNavigateTab={navigateProjectTab}
        />
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
    </div>
  );
}
