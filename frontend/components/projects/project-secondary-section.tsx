"use client";

import Link from "next/link";
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
import { isMonitoringOnlyProject, isSatelliteWatchEnabled } from "@/lib/project-monitoring";

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
  const monitoringMode = isMonitoringOnlyProject(project);
  const satelliteWatchEnabled = isSatelliteWatchEnabled(project);

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
          monitoringMode={monitoringMode}
          satelliteWatchEnabled={satelliteWatchEnabled}
          onNavigateTab={navigateProjectTab}
        />
      )}

      {tab === "credits" && monitoringMode && (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
            <h2 className="text-sm font-semibold text-emerald-950">Reports &amp; sampling</h2>
            <p className="mt-1 text-sm text-emerald-900/85">
              Tier-4 plot monitoring and field sampling for this estate watch programme. Carbon credit
              issuance and NPRT are not part of this monitoring-only scheme.
            </p>
          </div>
          <div className="card">
            <ProjectPlotMonitoringPanel projectId={projectId} />
          </div>
          <div className="card space-y-2">
            <h3 className="text-sm font-medium text-stone-900">Evidence exports</h3>
            <p className="text-sm text-stone-600">
              MRV and audit packs for this project are under Compliance → Exports.
            </p>
            <Link
              href={`/projects/${projectId}/compliance?section=exports`}
              className="inline-flex text-sm font-medium text-forest-700 hover:underline"
            >
              Open compliance exports →
            </Link>
          </div>
        </div>
      )}

      {tab === "credits" && !monitoringMode && (
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
          <ProjectSettingsPanel
            project={project}
            monitoringMode={monitoringMode}
            satelliteWatchEnabled={satelliteWatchEnabled}
          />
          <ProjectImpactSharePanel projectId={projectId} />
        </div>
      )}
    </div>
  );
}
