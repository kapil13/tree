"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Activity,
  ArrowRight,
  Bell,
  ClipboardSignature,
  FileText,
  Mic,
  Satellite,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { projectAuditHref } from "@/lib/project-focused-ui";
import { alertsHref } from "@/lib/alerts-links";
import {
  portfolioAuditHref,
  portfolioComplianceHref,
  portfolioMonitoringHref,
  portfolioThreatsHref,
  portfolioBiodiversityHref,
} from "@/lib/portfolio-health-links";
import { reportTabHref } from "@/lib/report-tabs";
import { cn } from "@/lib/cn";

export function PortfolioRelatedLinks({
  projectId,
  className,
}: {
  projectId?: string | null;
  className?: string;
}) {
  const t = useTranslations("portfolioTabs.common");

  const links = [
    {
      href: projectId ? projectAuditHref(projectId) : portfolioAuditHref(),
      icon: ClipboardSignature,
      label: t("relatedAudit"),
      description: t("relatedAuditDesc"),
    },
    {
      href: portfolioComplianceHref(projectId),
      icon: ShieldCheck,
      label: t("relatedCompliance"),
      description: t("relatedComplianceDesc"),
    },
    {
      href: portfolioMonitoringHref(projectId),
      icon: Activity,
      label: t("relatedMonitoring"),
      description: t("relatedMonitoringDesc"),
    },
    {
      href: portfolioThreatsHref(projectId),
      icon: ShieldAlert,
      label: t("relatedThreats"),
      description: t("relatedThreatsDesc"),
    },
    {
      href: reportTabHref("standard"),
      icon: FileText,
      label: t("relatedReports"),
      description: t("relatedReportsDesc"),
    },
    {
      href: "/satellite",
      icon: Satellite,
      label: t("relatedSatellite"),
      description: t("relatedSatelliteDesc"),
    },
    {
      href: portfolioBiodiversityHref(projectId),
      icon: Mic,
      label: t("relatedBiodiversity"),
      description: t("relatedBiodiversityDesc"),
    },
    {
      href: alertsHref(),
      icon: Bell,
      label: t("relatedAlerts"),
      description: t("relatedAlertsDesc"),
    },
  ];

  return (
    <section
      className={cn(
        "rounded-xl border border-stone-200 bg-stone-50/80 p-4 dark:border-stone-800 dark:bg-stone-900/40",
        className,
      )}
      aria-label={t("relatedSurfaces")}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{t("relatedSurfaces")}</p>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{t("relatedSurfacesDesc")}</p>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-start gap-3 rounded-lg border border-stone-200 bg-white px-3 py-3 text-left transition hover:border-forest-300 hover:shadow-sm dark:border-stone-700 dark:bg-stone-950 dark:hover:border-forest-700"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-forest-50 text-forest-700 ring-1 ring-forest-100 dark:bg-forest-950/50 dark:text-forest-300 dark:ring-forest-900">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-stone-100">
                  {link.label}
                  <ArrowRight className="h-3.5 w-3.5 text-stone-400 opacity-0 transition group-hover:opacity-100" />
                </span>
                <span className="mt-0.5 block text-xs text-stone-500 group-hover:text-stone-600 dark:text-stone-400">
                  {link.description}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
