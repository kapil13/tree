"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { AuditCrossLinks } from "@/components/audit/audit-cross-links";
import { AuditExportPanel } from "@/components/audit/audit-export-panel";
import { AuditIntakePanel } from "@/components/audit/audit-intake-panel";
import { AuditLockedSection } from "@/components/audit/audit-locked-section";
import { AuditMetricsStrip } from "@/components/audit/audit-metrics-strip";
import { AuditIntegrityBridgePanel } from "@/components/audit/audit-integrity-bridge-panel";
import { AuditPhaseRoadmap } from "@/components/audit/audit-phase-roadmap";
import { AuditReauditPanel } from "@/components/audit/audit-reaudit-panel";
import { AuditReconciliationPanel } from "@/components/audit/audit-reconciliation-panel";
import { AuditRiskPanel } from "@/components/audit/audit-risk-panel";
import { AuditSamplingPanel } from "@/components/audit/audit-sampling-panel";
import { AuditSatellitePanel } from "@/components/audit/audit-satellite-panel";
import { AuditTabError, AuditTabLoading } from "@/components/audit/audit-tab-state";
import { PageHeader, SectionNav } from "@/components/ui";
import { auditEngagements, type AuditEngagementDetail } from "@/lib/api";
import {
  type AuditPhase,
  defaultAuditPhase,
  formatAuditStatus,
  isAuditPhaseUnlocked,
} from "@/lib/audit-workspace";
import { projectOverviewHref } from "@/lib/project-focused-ui";
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

export function AuditWorkspace({
  projectId,
  satelliteHref,
}: {
  projectId: string;
  satelliteHref: string;
}) {
  const t = useTranslations("auditWorkspace");
  const tc = useTranslations("chrome");
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

  useEffect(() => {
    if (engagement?.status) {
      setPhase(defaultAuditPhase(engagement.status));
    }
  }, [engagement?.id, engagement?.status]);

  const navItems = useMemo(
    () =>
      (["intake", "satellite", "confidence", "risk", "sampling", "reconciliation", "export", "attestation"] as AuditPhase[]).map(
        (id) => ({
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
        }),
      ),
    [t, sampling?.visit_stats?.planned, reconciliation?.mismatch_count],
  );

  if (isLoading) {
    return <AuditTabLoading />;
  }

  if (error || !engagement) {
    return <AuditTabError onRetry={() => refetch()} />;
  }

  const statusLabel = formatAuditStatus(engagement.status);

  return (
    <div className="space-y-6">
      <PageHeader
        purpose={t("purpose")}
        title={t("title")}
        description={t("description")}
        breadcrumbs={[
          { label: tc("sectionOperate"), href: "/field-ops" },
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
                "rounded-full px-2.5 py-0.5 text-xs font-medium ring-1",
                engagement.status === "attested"
                  ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                  : engagement.status === "draft"
                    ? "bg-amber-50 text-amber-800 ring-amber-200"
                    : "bg-sky-50 text-sky-800 ring-sky-200",
              )}
            >
              {statusLabel}
            </span>
          </div>
        }
      />

      <AuditMetricsStrip
        engagement={engagement}
        plotsVisited={sampling?.visit_stats?.visited}
        plotsTotal={sampling?.visit_stats?.total}
        reconciliationMismatch={reconciliation?.mismatch_count}
      />

      <AuditCrossLinks projectId={projectId} satelliteHref={satelliteHref} />

      <AuditIntegrityBridgePanel engagementId={engagement.id} projectId={projectId} />

      <AuditReauditPanel engagementId={engagement.id} engagementStatus={engagement.status} />

      <AuditPhaseRoadmap
        status={engagement.status}
        activePhase={phase}
        onSelectPhase={(next) => setPhase(next as AuditPhase)}
      />

      <SectionNav
        ariaLabel={t("phaseNavAria")}
        items={navItems}
        active={phase}
        onSelect={(id) => setPhase(id as AuditPhase)}
      />

      <div className="min-h-[320px]">
        {phase === "intake" ? (
          <AuditIntakePanel projectId={projectId} wizardOnly />
        ) : !isAuditPhaseUnlocked(phase, engagement.status) ? (
          <AuditLockedSection
            title={t(`phase.${phase}`)}
            message={t("phaseLocked", { phase: t(`phase.${phase}`) })}
            actionLabel={t("goToIntake")}
            actionHref={undefined}
            onAction={() => setPhase(defaultAuditPhase(engagement.status))}
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
    </div>
  );
}
