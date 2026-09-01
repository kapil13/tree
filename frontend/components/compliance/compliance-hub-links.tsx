"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, ClipboardList, FileText, ShieldCheck } from "lucide-react";
import {
  complianceViolationsReportHref,
  portfolioComplianceHref,
  projectComplianceHref,
} from "@/lib/compliance-links";
import { reportTabHref } from "@/lib/report-tabs";
import { cn } from "@/lib/cn";

type ComplianceHubLinksProps = {
  projectId?: string;
  className?: string;
};

export function ComplianceHubLinks({ projectId, className }: ComplianceHubLinksProps) {
  const t = useTranslations("complianceHub");

  const links = [
    {
      href: portfolioComplianceHref(),
      icon: ShieldCheck,
      label: t("portfolioLabel"),
      description: t("portfolioDesc"),
    },
    ...(projectId
      ? [
          {
            href: projectComplianceHref(projectId),
            icon: ClipboardList,
            label: t("projectLabel"),
            description: t("projectDesc"),
          },
        ]
      : []),
    {
      href: reportTabHref("standard"),
      icon: FileText,
      label: t("reportsLabel"),
      description: t("reportsDesc"),
    },
    {
      href: complianceViolationsReportHref(),
      icon: ClipboardList,
      label: t("violationsReportLabel"),
      description: t("violationsReportDesc"),
    },
  ];

  return (
    <section
      className={cn(
        "rounded-xl border border-stone-200 bg-stone-50/80 p-4 dark:border-stone-800 dark:bg-stone-900/40",
        className,
      )}
      aria-label={t("ariaLabel")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{t("title")}</p>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{t("description")}</p>
        </div>
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
