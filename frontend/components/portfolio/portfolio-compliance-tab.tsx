"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { AlertTriangle, ArrowRight, FileText, ShieldAlert, ShieldCheck } from "lucide-react";
import { ComplianceHubLinks } from "@/components/compliance/compliance-hub-links";
import { compliance } from "@/lib/api";
import { projectSecondaryHref } from "@/lib/project-focused-ui";
import { reportTabHref } from "@/lib/report-tabs";
import { cn } from "@/lib/cn";
import { PortfolioKpiCard } from "./portfolio-kpi-card";
import { PortfolioKpiGrid } from "./portfolio-kpi-grid";
import { PortfolioSection } from "./portfolio-section";
import { PortfolioTabBanner } from "./portfolio-tab-banner";
import { PortfolioTabError, PortfolioTabLoading } from "./portfolio-tab-state";
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

function readinessTone(pct: number) {
  if (pct >= 80) return "text-forest-700 dark:text-forest-300";
  if (pct >= 50) return "text-amber-700 dark:text-amber-300";
  return "text-rose-700 dark:text-rose-300";
}

export function PortfolioComplianceTab({
  projectId,
  projectName,
}: {
  projectId?: string | null;
  projectName?: string | null;
}) {
  const t = useTranslations("portfolioTabs.compliance");
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["compliance-portfolio-summary"],
    queryFn: () => compliance.portfolioSummary(),
    staleTime: 60_000,
  });

  if (isLoading) {
    return <PortfolioTabLoading />;
  }

  if (error || !data) {
    return <PortfolioTabError onRetry={() => void refetch()} />;
  }

  const projects = projectId ? data.projects.filter((p) => p.id === projectId) : data.projects;

  const attentionProjects = projects.filter(
    (p) => p.blocking_violations > 0 || p.open_violations > 0 || p.readiness_pct < 80,
  );

  const gapsSuffix =
    data.projects_with_safeguard_gaps > 0
      ? t("projectReadiness.gapsSuffix", { count: data.projects_with_safeguard_gaps })
      : "";

  const readinessMeta = t("projectReadiness.meta", {
    projects: projectId ? projects.length : data.project_count,
    below: projectId
      ? projects.filter((p) => p.readiness_pct < 80).length
      : data.projects_below_80_readiness,
    gaps: gapsSuffix,
  });

  return (
    <PortfolioTabShell tab="compliance" projectId={projectId} projectName={projectName}>
      <ComplianceHubLinks omitPortfolio />

      <PortfolioKpiGrid>
        <PortfolioKpiCard
          icon={ShieldCheck}
          label={t("kpi.avgReadiness")}
          value={`${Math.round(data.avg_readiness_pct)}%`}
          warn={data.avg_readiness_pct < 80}
        />
        <PortfolioKpiCard
          icon={AlertTriangle}
          label={t("kpi.openViolations")}
          value={String(data.open_violations)}
          warn={data.open_violations > 0}
        />
        <PortfolioKpiCard
          icon={ShieldAlert}
          label={t("kpi.blockingViolations")}
          value={String(data.blocking_violations)}
          warn={data.blocking_violations > 0}
        />
        <PortfolioKpiCard
          icon={FileText}
          label={t("kpi.safeguardGaps")}
          value={String(data.safeguard_gap_count)}
          warn={data.safeguard_gap_count > 0}
        />
      </PortfolioKpiGrid>

      <PortfolioSection
        title={t("frameworkExports.title")}
        description={t("frameworkExports.desc")}
        action={{ label: t("frameworkExports.openReports"), href: "/reports" }}
      >
        <div className="flex flex-wrap gap-2">
          {data.report_links.map((link) => (
            <Link
              key={link.tab}
              href={reportTabHref(link.tab as Parameters<typeof reportTabHref>[0])}
              className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-700 transition hover:border-forest-200 hover:bg-forest-50 hover:text-forest-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:border-forest-700"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </PortfolioSection>

      <PortfolioSection
        flush
        title={t("projectReadiness.title")}
        description={readinessMeta}
      >
        {projects.length === 0 ? (
          <p className="px-4 py-6 text-sm text-stone-500 dark:text-stone-400">
            {t("projectReadiness.empty")}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500 dark:bg-stone-900/50 dark:text-stone-400">
              <tr>
                <th className="px-4 py-2">{t("table.project")}</th>
                <th className="px-4 py-2">{t("table.framework")}</th>
                <th className="px-4 py-2">{t("table.readiness")}</th>
                <th className="px-4 py-2">{t("table.violations")}</th>
                <th className="px-4 py-2">{t("table.safeguards")}</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-t border-stone-100 dark:border-stone-800">
                  <td className="px-4 py-2">
                    <Link
                      href={`/projects/${p.id}`}
                      className="font-medium text-forest-800 hover:underline dark:text-forest-300"
                    >
                      {p.name}
                    </Link>
                    <div className="text-xs text-stone-500">
                      {p.code} · {SEGMENT_LABEL[p.segment] ?? p.segment}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-xs text-stone-600 dark:text-stone-400">
                    {p.recommended_checklist_label}
                  </td>
                  <td className="px-4 py-2">
                    <span className={cn("font-semibold", readinessTone(p.readiness_pct))}>
                      {Math.round(p.readiness_pct)}%
                    </span>
                    <div className="text-xs text-stone-500">
                      {t("table.steps", { done: p.workflow_done, total: p.workflow_total })}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    {p.open_violations > 0 ? (
                      <span className="text-amber-700 dark:text-amber-300">
                        {p.open_violations}
                        {p.blocking_violations > 0 ? ` (${p.blocking_violations} blocking)` : ""}
                      </span>
                    ) : (
                      "0"
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {p.safeguard_gaps > 0 ? (
                      <span className="text-amber-700 dark:text-amber-300">
                        {t("safeguardsMissing", { count: p.safeguard_gaps })}
                      </span>
                    ) : (
                      <span className="text-forest-700 dark:text-forest-300">{t("safeguardsComplete")}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={projectSecondaryHref(p.id, "compliance")}
                      className="inline-flex items-center gap-1 text-xs text-forest-700 hover:underline dark:text-forest-300"
                    >
                      {t("openCompliance")}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PortfolioSection>

      {attentionProjects.length > 0 ? (
        <PortfolioTabBanner variant="warn" title={t("priorityActions")}>
          <ul className="space-y-1 text-xs">
            {attentionProjects.slice(0, 5).map((p) => (
              <li key={p.id}>
                <Link
                  href={projectSecondaryHref(p.id, "compliance")}
                  className="hover:underline"
                >
                  {p.name}
                </Link>
                {" — "}
                {p.blocking_violations > 0
                  ? `${p.blocking_violations} blocking violation${p.blocking_violations === 1 ? "" : "s"}`
                  : p.open_violations > 0
                    ? `${p.open_violations} open violation${p.open_violations === 1 ? "" : "s"}`
                    : `${Math.round(p.readiness_pct)}% readiness`}
              </li>
            ))}
          </ul>
        </PortfolioTabBanner>
      ) : null}
    </PortfolioTabShell>
  );
}
