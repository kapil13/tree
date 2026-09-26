"use client";

import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { AlertTriangle, Bell, Satellite, TreePine } from "lucide-react";
import { auditEngagements, dashboard, plantingProjects } from "@/lib/api";
import { scopeOverviewPortfolioKpis } from "@/lib/portfolio-kpi-scope";
import { portfolioAuditHref } from "@/lib/portfolio-health-links";
import { alertsHref } from "@/lib/alerts-links";
import { projectOverviewHref, projectSecondaryHref } from "@/lib/project-focused-ui";
import { survivalDueTreesHref } from "@/lib/trees-registry-links";
import { PortfolioKpiCard } from "./portfolio-kpi-card";
import { PortfolioKpiGrid } from "./portfolio-kpi-grid";
import { PortfolioSection } from "./portfolio-section";
import { PortfolioTabLoading, PortfolioTabError } from "./portfolio-tab-state";
import { PortfolioRelatedLinks } from "./portfolio-related-links";
import { PortfolioTabShell } from "./portfolio-tab-shell";

const SEGMENT_LABEL: Record<string, string> = {
  nhai_highway: "NHAI / Highway",
  industrial_greenbelt: "Mine / Green belt",
  township_landscape: "Township / Society",
  nagar_van_urban: "Nagar Van / Urban forest",
  sahakar_van_coop: "Sahakar Van / Cooperative forest",
  ngo_watershed: "NGO / Watershed",
  general: "General",
};

export function PortfolioOverviewTab({
  onSelectTab,
  projectId,
  projectName,
}: {
  onSelectTab: (tab: "audit" | "compliance" | "threats" | "monitoring" | "biodiversity") => void;
  projectId?: string | null;
  projectName?: string | null;
}) {
  const t = useTranslations("portfolioTabs.overview");

  const [dashQ, monitoringQ, fieldOpsQ, auditQ, briefQ] = useQueries({
    queries: [
      { queryKey: ["dashboard-portfolio"], queryFn: dashboard.get, staleTime: 60_000 },
      { queryKey: ["monitoring-summary"], queryFn: () => plantingProjects.monitoringSummary() },
      { queryKey: ["field-ops-summary"], queryFn: () => plantingProjects.fieldOpsSummary() },
      { queryKey: ["audit-portfolio-summary"], queryFn: () => auditEngagements.portfolioSummary() },
      {
        queryKey: ["portfolio-field-brief", projectId ?? "all"],
        queryFn: () => plantingProjects.fieldBrief(projectId ?? undefined),
        enabled: Boolean(projectId),
      },
    ],
  });

  if (
    dashQ.isLoading ||
    monitoringQ.isLoading ||
    fieldOpsQ.isLoading ||
    auditQ.isLoading ||
    (projectId ? briefQ.isLoading : false)
  ) {
    return <PortfolioTabLoading />;
  }

  if (dashQ.error || monitoringQ.error || fieldOpsQ.error || auditQ.error) {
    return (
      <PortfolioTabError
        onRetry={() => {
          void dashQ.refetch();
          void monitoringQ.refetch();
          void fieldOpsQ.refetch();
          void auditQ.refetch();
        }}
      />
    );
  }

  const kpi = dashQ.data?.kpi;
  const monitoring = monitoringQ.data;
  const fieldOps = fieldOpsQ.data;
  const auditPortfolio = auditQ.data;
  const scopedKpis = scopeOverviewPortfolioKpis({
    projectId,
    kpiTotalTrees: kpi?.total_trees,
    monitoring,
    fieldOps,
    brief: briefQ.data,
    auditPortfolio,
  });

  const attentionProjects =
    fieldOps?.projects
      .filter((p) => {
        if (projectId && p.id !== projectId) return false;
        return p.open_violations > 0 || p.survival_due > 0;
      })
      .slice(0, 6) ?? [];

  return (
    <PortfolioTabShell tab="overview" projectId={projectId} projectName={projectName}>
      <PortfolioKpiGrid>
        <PortfolioKpiCard
          icon={TreePine}
          label={t("kpi.trees")}
          value={String(scopedKpis.treeCount)}
          href="/trees"
        />
        <PortfolioKpiCard
          icon={AlertTriangle}
          label={t("kpi.violations")}
          value={String(scopedKpis.openViolations)}
          warn={scopedKpis.openViolations > 0}
          onClick={() => onSelectTab("compliance")}
        />
        <PortfolioKpiCard
          icon={Satellite}
          label={t("kpi.sitesNeedingScan")}
          value={String(scopedKpis.sitesNeedingScan)}
          warn={scopedKpis.sitesNeedingScan > 0}
          onClick={() => onSelectTab("monitoring")}
        />
        <PortfolioKpiCard
          icon={Bell}
          label={t("kpi.unreadAlerts")}
          value={String(scopedKpis.unreadAlerts)}
          warn={scopedKpis.unreadAlerts > 0}
          href={alertsHref()}
        />
        {(auditPortfolio?.estate_project_count ?? 0) > 0 ? (
          <PortfolioKpiCard
            icon={AlertTriangle}
            label={t("kpi.auditPlotsDue")}
            value={String(scopedKpis.auditPlotsDue)}
            warn={scopedKpis.auditPlotsDue > 0}
            href={portfolioAuditHref(projectId)}
          />
        ) : null}
      </PortfolioKpiGrid>

      <PortfolioRelatedLinks projectId={projectId} />

      <PortfolioSection flush title={t("attentionTitle")} description={t("attentionDesc")}>
        {attentionProjects.length === 0 ? (
          <p className="px-4 py-6 text-sm text-stone-500 dark:text-stone-400">{t("attentionEmpty")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500 dark:bg-stone-900/50 dark:text-stone-400">
              <tr>
                <th className="px-4 py-2">{t("table.project")}</th>
                <th className="px-4 py-2">{t("table.segment")}</th>
                <th className="px-4 py-2">{t("table.violations")}</th>
                <th className="px-4 py-2">{t("table.geotagDue")}</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {attentionProjects.map((p) => (
                <tr key={p.id} className="border-t border-stone-100 dark:border-stone-800">
                  <td className="px-4 py-2">
                    <Link
                      href={`/projects/${p.id}`}
                      className="font-medium text-forest-800 hover:underline dark:text-forest-300"
                    >
                      {p.name}
                    </Link>
                    <div className="text-xs text-stone-500">{p.code}</div>
                  </td>
                  <td className="px-4 py-2">{SEGMENT_LABEL[p.segment] ?? p.segment}</td>
                  <td className="px-4 py-2">
                    {p.open_violations > 0 ? (
                      <span className="text-amber-700 dark:text-amber-300">{p.open_violations}</span>
                    ) : (
                      "0"
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {p.survival_due > 0 ? (
                      <Link
                        href={survivalDueTreesHref(p.id)}
                        className="text-amber-700 hover:underline dark:text-amber-300"
                      >
                        {p.survival_due}
                      </Link>
                    ) : (
                      "0"
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {p.open_violations > 0 ? (
                      <Link
                        href={projectSecondaryHref(p.id, "compliance")}
                        className="text-xs text-forest-700 hover:underline dark:text-forest-300"
                      >
                        {t("fixCompliance")}
                      </Link>
                    ) : (
                      <Link
                        href={projectOverviewHref(p.id)}
                        className="text-xs text-forest-700 hover:underline dark:text-forest-300"
                      >
                        {t("reviewTrees")}
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PortfolioSection>
    </PortfolioTabShell>
  );
}
