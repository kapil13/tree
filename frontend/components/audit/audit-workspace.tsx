"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Archive,
  ClipboardList,
  GitCompare,
  Map,
  Radar,
  RefreshCw,
  Shield,
  ShieldCheck,
  Satellite,
} from "lucide-react";
import { AuditAttestationPanel } from "@/components/audit/audit-attestation-panel";
import { AuditConfidencePanel } from "@/components/audit/audit-confidence-panel";
import { AuditExportPanel } from "@/components/audit/audit-export-panel";
import { AuditIntakePanel } from "@/components/audit/audit-intake-panel";
import { AuditLockedSection } from "@/components/audit/audit-locked-section";
import { AuditMetricsStrip } from "@/components/audit/audit-metrics-strip";
import { AuditNextStepBanner } from "@/components/audit/audit-next-step-banner";
import { AuditPhaseRoadmap } from "@/components/audit/audit-phase-roadmap";
import { AuditReconciliationPanel } from "@/components/audit/audit-reconciliation-panel";
import { AuditRiskPanel } from "@/components/audit/audit-risk-panel";
import { AuditSamplingPanel } from "@/components/audit/audit-sampling-panel";
import { AuditSatellitePanel } from "@/components/audit/audit-satellite-panel";
import { AuditTabError, AuditTabLoading } from "@/components/audit/audit-tab-state";
import { AuditWorkspaceAdvanced } from "@/components/audit/audit-workspace-advanced";
import { AuditWorkspaceRoleBanner } from "@/components/audit/audit-workspace-role-banner";
import { PageHeader, SectionNav } from "@/components/ui";
import { auditEngagements, type AuditEngagementDetail } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import {
  auditEngagementStatusLabel,
  auditEngagementStatusTone,
} from "@/lib/audit-portfolio-status";
import {
  auditPhasesForMode,
  coerceAuditPhaseForMode,
  defaultAuditPhaseForMode,
  isAuditPhaseVisibleInMode,
  resolveAuditWorkspaceMode,
} from "@/lib/audit-workspace-mode";
import {
  type AuditPhase,
  isAuditPhaseUnlocked,
} from "@/lib/audit-workspace";
import { portfolioAuditHref } from "@/lib/portfolio-health-links";
import { parseAuditPhase, projectAuditHref, projectOverviewHref } from "@/lib/project-focused-ui";
import { cn } from "@/lib/cn";

const PHASE_ICONS: Record<AuditPhase, typeof Shield> = {
  intake: Shield,
  satellite: Satellite,
  confidence: Map,
  risk: Radar,
  sampling: ClipboardList,
  reconciliation: GitCompare,
  export: Archive,
  attestation: ShieldCheck,
};

const ALL_PHASES: AuditPhase[] = [
  "intake",
  "satellite",
  "confidence",
  "risk",
  "sampling",
  "reconciliation",
  "export",
  "attestation",
];

export function AuditWorkspace({
  projectId,
  satelliteHref,
}: {
  projectId: string;
  satelliteHref: string;
}) {
  const t = useTranslations("auditWorkspace");
  const tc = useTranslations("chrome");
  const { user } = useAuth();
  const workspaceMode = resolveAuditWorkspaceMode(user);
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<AuditPhase>("intake");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["audit-engagement", projectId],
    queryFn: async () => {
      try {
        return await auditEngagements.getByProject(projectId);
      } catch (e: unknown) {
        const status = (e as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          return await auditEngagements.create(projectId);
        }
        throw e;
      }
    },
  });

  const engagement = data as AuditEngagementDetail | undefined;

  const { data: sampling } = useQuery({
    queryKey: ["audit-sampling-plan", engagement?.id],
    queryFn: () => auditEngagements.getSamplingPlan(engagement!.id),
    enabled: Boolean(engagement?.id && isAuditPhaseUnlocked("sampling", engagement!.status)),
  });

  const { data: reconciliation } = useQuery({
    queryKey: ["audit-reconciliation", engagement?.id],
    queryFn: () => auditEngagements.getReconciliation(engagement!.id),
    enabled: Boolean(engagement?.id && isAuditPhaseUnlocked("reconciliation", engagement!.status)),
  });

  const urlPhase = parseAuditPhase(searchParams.get("phase"));
  const visiblePhases = auditPhasesForMode(workspaceMode);

  useEffect(() => {
    if (!engagement?.status) return;
    const next = urlPhase
      ? coerceAuditPhaseForMode(urlPhase, engagement.status, workspaceMode)
      : defaultAuditPhaseForMode(engagement.status, workspaceMode);
    setPhase(next);
  }, [engagement?.id, engagement?.status, urlPhase, workspaceMode]);

  const selectPhase = useCallback(
    (next: AuditPhase) => {
      setPhase(next);
      const href = projectAuditHref(projectId, next);
      window.history.replaceState(null, "", href);
    },
    [projectId],
  );

  const navItems = useMemo(
    () =>
      ALL_PHASES
        .filter((id) => isAuditPhaseVisibleInMode(id, workspaceMode))
        .map((id) => ({
          id,
          label: t(`phase.${id}`),
          shortLabel: t(`phaseShort.${id}`),
          icon: PHASE_ICONS[id],
          badge:
            id === "sampling" && sampling?.visit_stats?.planned
              ? sampling.visit_stats.planned
              : id === "reconciliation" && reconciliation?.mismatch_count
                ? reconciliation.mismatch_count
                : undefined,
        })),
    [t, sampling?.visit_stats?.planned, reconciliation?.mismatch_count, workspaceMode],
  );

  if (isLoading) {
    return <AuditTabLoading />;
  }

  if (error || !engagement) {
    return <AuditTabError onRetry={() => refetch()} />;
  }

  const statusLabel = auditEngagementStatusLabel(engagement.status);
  const phaseHiddenFromMode = !visiblePhases.includes(phase);

  return (
    <div className="space-y-6">
      <PageHeader
        purpose={t("purpose")}
        title={t("title")}
        description={
          workspaceMode === "field" ? t("modes.field.pageDesc") : t("description")
        }
        breadcrumbs={[
          { label: tc("sectionIntelligence"), href: portfolioAuditHref(projectId) },
          { label: t("breadcrumbProject"), href: projectOverviewHref(projectId) },
          { label: t("breadcrumbAudit") },
        ]}
        actions={
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-2 text-sm"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            {t("refresh")}
          </button>
        }
        status={
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                auditEngagementStatusTone(engagement.status),
              )}
            >
              {statusLabel}
            </span>
          </div>
        }
      />

      <AuditWorkspaceRoleBanner mode={workspaceMode} projectId={projectId} />

      {workspaceMode === "full" ? (
        <AuditNextStepBanner
          engagementStatus={engagement.status}
          activePhase={phase}
          onSelectPhase={selectPhase}
        />
      ) : null}

      <AuditMetricsStrip
        engagement={engagement}
        plotsVisited={sampling?.visit_stats?.visited}
        plotsTotal={sampling?.visit_stats?.total}
        reconciliationMismatch={reconciliation?.mismatch_count}
        compact={workspaceMode === "field"}
      />

      {workspaceMode === "full" ? (
        <AuditPhaseRoadmap
          status={engagement.status}
          activePhase={phase}
          onSelectPhase={(next) => selectPhase(next as AuditPhase)}
        />
      ) : null}

      <SectionNav
        ariaLabel={t("phaseNavAria")}
        items={navItems}
        active={phase}
        onSelect={(id) => selectPhase(id as AuditPhase)}
      />

      <div className="min-h-[320px]">
        {phaseHiddenFromMode ? (
          <AuditLockedSection
            title={t(`phase.${phase}`)}
            message={t("phaseHiddenForRole", { mode: t(`modes.${workspaceMode}.title`) })}
            actionLabel={t("goToCurrentStep")}
            actionHref={undefined}
            onAction={() => selectPhase(defaultAuditPhaseForMode(engagement.status, workspaceMode))}
          />
        ) : phase === "intake" ? (
          <AuditIntakePanel projectId={projectId} wizardOnly />
        ) : !isAuditPhaseUnlocked(phase, engagement.status) ? (
          <AuditLockedSection
            title={t(`phase.${phase}`)}
            message={t("phaseLocked", { phase: t(`phase.${phase}`) })}
            actionLabel={t("goToCurrentStep")}
            actionHref={undefined}
            onAction={() => selectPhase(defaultAuditPhaseForMode(engagement.status, workspaceMode))}
          />
        ) : (
          <>
            {phase === "satellite" && (
              <AuditSatellitePanel
                projectId={projectId}
                engagementId={engagement.id}
                engagementStatus={engagement.status}
              />
            )}
            {phase === "confidence" && (
              <AuditConfidencePanel
                engagementId={engagement.id}
                engagementStatus={engagement.status}
                boundaries={engagement.boundaries}
              />
            )}
            {phase === "risk" && (
              <AuditRiskPanel engagementId={engagement.id} engagementStatus={engagement.status} />
            )}
            {phase === "sampling" && (
              <AuditSamplingPanel
                engagementId={engagement.id}
                engagementStatus={engagement.status}
                boundaries={engagement.boundaries}
              />
            )}
            {phase === "reconciliation" && (
              <AuditReconciliationPanel
                engagementId={engagement.id}
                engagementStatus={engagement.status}
              />
            )}
            {phase === "export" && (
              <AuditExportPanel
                engagementId={engagement.id}
                engagementStatus={engagement.status}
              />
            )}
            {phase === "attestation" && (
              <AuditAttestationPanel
                engagementId={engagement.id}
                engagementStatus={engagement.status}
              />
            )}
          </>
        )}
      </div>

      <AuditWorkspaceAdvanced
        projectId={projectId}
        engagementId={engagement.id}
        engagementStatus={engagement.status}
        satelliteHref={satelliteHref}
        mode={workspaceMode}
      />
    </div>
  );
}
