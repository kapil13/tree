"use client";

import Link from "next/link";
import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  ClipboardCheck,
  ClipboardList,
  Gavel,
  MapPin,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { auditEngagements } from "@/lib/api";
import {
  auditAttestationEnabled,
  auditEngagementStatusLabel,
  auditEngagementStatusTone,
} from "@/lib/audit-portfolio-status";
import { fieldOpsHref } from "@/lib/field-ops-links";
import { scopeAuditPortfolioKpis } from "@/lib/portfolio-kpi-scope";
import { projectAuditHref } from "@/lib/project-focused-ui";
import { scopedKey } from "@/lib/query-keys";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/cn";
import { PortfolioKpiCard } from "./portfolio-kpi-card";
import { PortfolioKpiGrid } from "./portfolio-kpi-grid";
import { PortfolioSection } from "./portfolio-section";
import { PortfolioTabError, PortfolioTabLoading } from "./portfolio-tab-state";
import { AuditPortfolioOpsSection } from "@/components/audit/audit-portfolio-ops-section";
import { PortfolioCrossOrgAuditSection } from "./portfolio-cross-org-audit-section";
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

export function PortfolioAuditTab({
  projectId,
  projectName,
}: {
  projectId?: string | null;
  projectName?: string | null;
}) {
  const { user } = useAuth();
  const t = useTranslations("portfolioTabs.audit");
  const tc = useTranslations("portfolioTabs.common");
  const [showAllEngagements, setShowAllEngagements] = useState(false);

  const [summaryQ, queueQ] = useQueries({
    queries: [
      {
        queryKey: scopedKey(user, "audit-portfolio-summary"),
        queryFn: () => auditEngagements.portfolioSummary(),
        staleTime: 60_000,
      },
      {
        queryKey: scopedKey(user, "audit-plot-queue", projectId ?? "all"),
        queryFn: () => auditEngagements.fieldPlotQueue(projectId ?? undefined),
        staleTime: 60_000,
      },
    ],
  });

  if (summaryQ.isLoading || queueQ.isLoading) {
    return <PortfolioTabLoading />;
  }

  if (summaryQ.error || queueQ.error || !summaryQ.data) {
    return (
      <PortfolioTabError
        onRetry={() => {
          void summaryQ.refetch();
          void queueQ.refetch();
        }}
      />
    );
  }

  const data = summaryQ.data;
  const projects = projectId
    ? data.projects.filter((p) => p.id === projectId)
    : data.projects;
  const queueItems = queueQ.data?.items ?? [];
  const scopedKpis = scopeAuditPortfolioKpis(data, projectId);
  const statusEntries = Object.entries(scopedKpis.byStatus ?? {}).sort((a, b) => b[1] - a[1]);
  const auditFieldOpsHref = fieldOpsHref({ section: "audit", projectId });

  if (data.estate_project_count === 0 || projects.length === 0) {
    return (
      <PortfolioTabShell tab="audit" projectId={projectId} projectName={projectName}>
        <p className="rounded-xl border border-dashed border-stone-200 px-4 py-8 text-center text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
          {t("empty")}
        </p>
      </PortfolioTabShell>
    );
  }

  const attentionProjects = projects.filter(
    (p) =>
      p.audit_plots_due > 0 ||
      p.engagement_status === "export_ready" ||
      p.engagement_status === "under_review" ||
      p.engagement_status === "sampling_planned" ||
      p.engagement_status === "field_verified",
  );

  const displayedProjects = showAllEngagements ? projects : attentionProjects;

  const crossLinks = [
    {
      href: auditFieldOpsHref,
      icon: ClipboardList,
      label: t("crossLinks.fieldOps"),
      description: t("crossLinks.fieldOpsDesc"),
    },
    {
      href: "/field-ops/sync-queue",
      icon: Smartphone,
      label: t("crossLinks.mobile"),
      description: t("crossLinks.mobileDesc"),
    },
    {
      href: "/reports",
      icon: Gavel,
      label: t("crossLinks.reports"),
      description: t("crossLinks.reportsDesc"),
    },
  ];

  return (
    <PortfolioTabShell tab="audit" projectId={projectId} projectName={projectName}>
      <section
        className="rounded-xl border border-stone-200 bg-stone-50/80 p-4 dark:border-stone-800 dark:bg-stone-900/40"
        aria-label={t("crossLinks.title")}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          {t("crossLinks.title")}
        </p>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{t("crossLinks.desc")}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {crossLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.label}
                href={link.href}
                className="group flex items-start gap-3 rounded-lg border border-stone-200 bg-white px-3 py-3 transition hover:border-forest-300 hover:shadow-sm dark:border-stone-700 dark:bg-stone-950"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700 ring-1 ring-sky-100 dark:bg-sky-950/50 dark:text-sky-300">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-stone-100">
                    {link.label}
                    <ArrowRight className="h-3.5 w-3.5 text-stone-400 opacity-0 transition group-hover:opacity-100" />
                  </span>
                  <span className="mt-0.5 block text-xs text-stone-500">{link.description}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <PortfolioCrossOrgAuditSection />

      <AuditPortfolioOpsSection projectId={projectId} />

      <PortfolioKpiGrid>
        <PortfolioKpiCard
          icon={ClipboardCheck}
          label={t("kpi.engagements")}
          value={String(scopedKpis.engagementCount)}
        />
        <PortfolioKpiCard
          icon={MapPin}
          label={t("kpi.plotsDue")}
          value={String(scopedKpis.auditPlotsDue)}
          warn={scopedKpis.auditPlotsDue > 0}
          href={auditFieldOpsHref}
        />
        <PortfolioKpiCard
          icon={MapPin}
          label={t("kpi.inField")}
          value={String(scopedKpis.engagementsInField)}
          warn={scopedKpis.engagementsInField > 0}
          href={auditFieldOpsHref}
        />
        <PortfolioKpiCard
          icon={ShieldCheck}
          label={t("kpi.exportReady")}
          value={String(scopedKpis.engagementsExportReady)}
          warn={scopedKpis.engagementsExportReady > 0}
        />
        <PortfolioKpiCard
          icon={Gavel}
          label={t("kpi.attested")}
          value={String(scopedKpis.engagementsAttested)}
        />
      </PortfolioKpiGrid>

      {statusEntries.length > 0 ? (
        <PortfolioSection title={t("statusBreakdown.title")} description={t("statusBreakdown.desc")}>
          <div className="flex flex-wrap gap-2 px-4 pb-4">
            {statusEntries.map(([status, count]) => (
              <span
                key={status}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset",
                  auditEngagementStatusTone(status),
                )}
              >
                {auditEngagementStatusLabel(status)}
                <span className="font-semibold">{count}</span>
              </span>
            ))}
          </div>
        </PortfolioSection>
      ) : null}

      <PortfolioSection
        title={t("engagements.title")}
        description={t("engagements.desc")}
        action={{ label: t("engagements.openFieldOps"), href: auditFieldOpsHref }}
      >
        <div className="flex flex-wrap items-center justify-end gap-2 border-b border-stone-100 px-4 py-2 dark:border-stone-800">
          <button
            type="button"
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition",
              showAllEngagements
                ? "bg-forest-50 text-forest-800 ring-forest-200 dark:bg-forest-950/40 dark:text-forest-200"
                : "bg-white text-stone-600 ring-stone-200 hover:bg-stone-50 dark:bg-stone-950 dark:text-stone-300",
            )}
            onClick={() => setShowAllEngagements((value) => !value)}
            aria-pressed={showAllEngagements}
          >
            {showAllEngagements ? t("engagements.showPriority") : t("engagements.showAll")}
          </button>
        </div>
        {displayedProjects.length === 0 ? (
          <p className="px-4 py-6 text-sm text-stone-500 dark:text-stone-400">{t("engagements.empty")}</p>
        ) : (
          <>
            <div className="space-y-3 p-4 md:hidden">
              {displayedProjects.map((project) => (
                <article
                  key={project.id}
                  className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-950"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={projectAuditHref(project.id)}
                        className="font-medium text-forest-800 hover:underline dark:text-forest-300"
                      >
                        {project.name}
                      </Link>
                      <p className="text-xs text-stone-500">{project.code}</p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                        auditEngagementStatusTone(project.engagement_status),
                      )}
                    >
                      {auditEngagementStatusLabel(project.engagement_status)}
                    </span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="text-stone-500">{t("table.segment")}</dt>
                      <dd className="font-medium text-stone-800 dark:text-stone-100">
                        {SEGMENT_LABEL[project.segment] ?? project.segment}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-stone-500">{t("table.plotsDue")}</dt>
                      <dd
                        className={cn(
                          "font-medium",
                          project.audit_plots_due > 0
                            ? "text-amber-700 dark:text-amber-300"
                            : "text-stone-800 dark:text-stone-100",
                        )}
                      >
                        {project.audit_plots_due}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-3 text-right">
                    {project.audit_plots_due > 0 ? (
                      <Link
                        href={auditFieldOpsHref}
                        className="text-xs font-medium text-forest-700 hover:underline dark:text-forest-300"
                      >
                        {tc("relatedAudit")}
                      </Link>
                    ) : auditAttestationEnabled(project.engagement_status) ? (
                      <Link
                        href={projectAuditHref(project.id)}
                        className="text-xs font-medium text-forest-700 hover:underline dark:text-forest-300"
                      >
                        {t("openAttestation")}
                      </Link>
                    ) : (
                      <Link
                        href={projectAuditHref(project.id)}
                        className="text-xs font-medium text-forest-700 hover:underline dark:text-forest-300"
                      >
                        {t("openAudit")}
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
            <table className="hidden w-full text-sm md:table">
              <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500 dark:bg-stone-900/50 dark:text-stone-400">
                <tr>
                  <th className="px-4 py-2">{t("table.project")}</th>
                  <th className="px-4 py-2">{t("table.segment")}</th>
                  <th className="px-4 py-2">{t("table.status")}</th>
                  <th className="px-4 py-2">{t("table.plotsDue")}</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {displayedProjects.map((project) => (
                  <tr key={project.id} className="border-t border-stone-100 dark:border-stone-800">
                    <td className="px-4 py-2">
                      <Link
                        href={projectAuditHref(project.id)}
                        className="font-medium text-forest-800 hover:underline dark:text-forest-300"
                      >
                        {project.name}
                      </Link>
                      <div className="text-xs text-stone-500">{project.code}</div>
                    </td>
                    <td className="px-4 py-2">{SEGMENT_LABEL[project.segment] ?? project.segment}</td>
                    <td className="px-4 py-2">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                          auditEngagementStatusTone(project.engagement_status),
                        )}
                      >
                        {auditEngagementStatusLabel(project.engagement_status)}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {project.audit_plots_due > 0 ? (
                        <span className="text-amber-700 dark:text-amber-300">{project.audit_plots_due}</span>
                      ) : (
                        "0"
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {project.audit_plots_due > 0 ? (
                        <Link
                          href={auditFieldOpsHref}
                          className="text-xs text-forest-700 hover:underline dark:text-forest-300"
                        >
                          {tc("relatedAudit")}
                        </Link>
                      ) : auditAttestationEnabled(project.engagement_status) ? (
                        <Link
                          href={projectAuditHref(project.id)}
                          className="text-xs text-forest-700 hover:underline dark:text-forest-300"
                        >
                          {t("openAttestation")}
                        </Link>
                      ) : (
                        <Link
                          href={projectAuditHref(project.id)}
                          className="text-xs text-forest-700 hover:underline dark:text-forest-300"
                        >
                          {t("openAudit")}
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </PortfolioSection>

      <PortfolioSection
        title={t("fieldQueue.title")}
        description={t("fieldQueue.desc")}
        action={{ label: t("fieldQueue.openQueue"), href: auditFieldOpsHref }}
      >
        {queueItems.length === 0 ? (
          <p className="px-4 py-6 text-sm text-stone-500 dark:text-stone-400">{t("fieldQueue.empty")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500 dark:bg-stone-900/50 dark:text-stone-400">
              <tr>
                <th className="px-4 py-2">{t("table.plot")}</th>
                <th className="px-4 py-2">{t("table.project")}</th>
                <th className="px-4 py-2">{t("table.risk")}</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {queueItems.slice(0, 8).map((plot) => (
                <tr key={plot.plot_id} className="border-t border-stone-100 dark:border-stone-800">
                  <td className="px-4 py-2 font-medium">{plot.plot_code}</td>
                  <td className="px-4 py-2">
                    <Link
                      href={projectAuditHref(plot.project_id)}
                      className="text-forest-800 hover:underline dark:text-forest-300"
                    >
                      {plot.project_name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 capitalize">{plot.risk_level}</td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={auditFieldOpsHref}
                      className="text-xs text-forest-700 hover:underline dark:text-forest-300"
                    >
                      {t("fieldQueue.recordVisit")}
                    </Link>
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
