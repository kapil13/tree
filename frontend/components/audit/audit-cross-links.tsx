"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  ClipboardList,
  LayoutGrid,
  Satellite,
  Smartphone,
} from "lucide-react";
import { fieldOpsHref } from "@/lib/field-ops-links";
import { portfolioAuditHref } from "@/lib/portfolio-health-links";
import { cn } from "@/lib/cn";

export function AuditCrossLinks({
  projectId,
  satelliteHref,
  className,
}: {
  projectId: string;
  satelliteHref: string;
  className?: string;
}) {
  const t = useTranslations("auditWorkspace");

  const links = [
    {
      href: fieldOpsHref({ section: "audit" }),
      icon: ClipboardList,
      label: t("linkFieldOps"),
      description: t("linkFieldOpsDesc"),
    },
    {
      href: portfolioAuditHref(projectId),
      icon: LayoutGrid,
      label: t("linkPortfolio"),
      description: t("linkPortfolioDesc"),
    },
    {
      href: satelliteHref,
      icon: Satellite,
      label: t("linkSatellite"),
      description: t("linkSatelliteDesc"),
    },
    {
      href: "/field-ops?section=audit",
      icon: Smartphone,
      label: t("linkMobile"),
      description: t("linkMobileDesc"),
    },
  ];

  return (
    <section
      className={cn(
        "rounded-xl border border-stone-200 bg-stone-50/80 p-4 dark:border-stone-800 dark:bg-stone-900/40",
        className,
      )}
      aria-label={t("crossLinksAria")}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        {t("crossLinksTitle")}
      </p>
      <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{t("crossLinksDesc")}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.label}
              href={link.href}
              className="group flex items-start gap-3 rounded-lg border border-stone-200 bg-white px-3 py-3 transition hover:border-forest-300 hover:shadow-sm dark:border-stone-700 dark:bg-stone-950"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-forest-50 text-forest-700 ring-1 ring-forest-100 dark:bg-forest-950/50 dark:text-forest-300">
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
  );
}
