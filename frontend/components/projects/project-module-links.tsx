"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Activity, ClipboardList, Satellite, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";

type ProjectModuleLinksProps = {
  projectId: string;
  satelliteHref: string;
  openViolations?: number;
  className?: string;
};

export function ProjectModuleLinks({
  projectId,
  satelliteHref,
  openViolations = 0,
  className,
}: ProjectModuleLinksProps) {
  const t = useTranslations("projectWorkspace");

  const links = [
    {
      href: "/field-ops",
      icon: ClipboardList,
      label: t("moduleFieldOps"),
      description: t("moduleFieldOpsDesc"),
    },
    {
      href: "/portfolio-health?tab=compliance",
      icon: ShieldCheck,
      label: t("modulePortfolioCompliance"),
      description: t("modulePortfolioComplianceDesc"),
      badge: openViolations > 0 ? openViolations : undefined,
    },
    {
      href: satelliteHref,
      icon: Satellite,
      label: t("moduleSatellite"),
      description: t("moduleSatelliteDesc"),
    },
    {
      href: `/portfolio-health?tab=monitoring&project=${projectId}`,
      icon: Activity,
      label: t("moduleMonitoring"),
      description: t("moduleMonitoringDesc"),
    },
  ];

  return (
    <section
      className={cn("rounded-xl border border-stone-200 bg-stone-50/80 p-4 dark:border-stone-800 dark:bg-stone-900/40", className)}
      aria-label={t("moduleLinksAria")}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{t("moduleLinksTitle")}</p>
      <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{t("moduleLinksDesc")}</p>
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
                  {link.badge != null ? (
                    <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-800 ring-1 ring-rose-200">
                      {link.badge}
                    </span>
                  ) : null}
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
