"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Building2 } from "lucide-react";
import { auditEngagements } from "@/lib/api";
import { auditEngagementStatusLabel, auditEngagementStatusTone } from "@/lib/audit-portfolio-status";
import { projectAuditHref } from "@/lib/project-focused-ui";
import { isFullPlatformAdmin } from "@/lib/platform-access";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/cn";
import { PortfolioSection } from "./portfolio-section";

export function PortfolioCrossOrgAuditSection() {
  const { user } = useAuth();
  const t = useTranslations("portfolioTabs.audit.crossOrg");

  const enabled = isFullPlatformAdmin(user);
  const { data, isLoading, error } = useQuery({
    queryKey: ["audit-cross-org-summary"],
    queryFn: () => auditEngagements.crossOrgSummary(),
    enabled,
    staleTime: 60_000,
  });

  if (!enabled) return null;

  if (isLoading) {
    return <p className="text-sm text-stone-500">{t("loading")}</p>;
  }

  if (error || !data) {
    return (
      <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
        {t("error")}
      </p>
    );
  }

  return (
    <PortfolioSection
      title={t("title")}
      description={t("desc")}
      action={{ label: t("platformAudit"), href: "/platform/audit" }}
    >
      <div className="grid gap-3 px-4 pb-4 sm:grid-cols-4">
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900/40">
          <p className="text-xs uppercase text-stone-500">{t("organizations")}</p>
          <p className="text-xl font-semibold">{data.organization_count}</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900/40">
          <p className="text-xs uppercase text-stone-500">{t("engagements")}</p>
          <p className="text-xl font-semibold">{data.engagement_count}</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900/40">
          <p className="text-xs uppercase text-stone-500">{t("inField")}</p>
          <p className="text-xl font-semibold">{data.in_field_count}</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900/40">
          <p className="text-xs uppercase text-stone-500">{t("attested")}</p>
          <p className="text-xl font-semibold">{data.attested_count}</p>
        </div>
      </div>

      <div className="space-y-4 px-4 pb-4">
        {data.organizations.map((org) => (
          <div
            key={org.organization_id ?? org.organization_name}
            className="rounded-xl border border-stone-200 dark:border-stone-700"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 px-4 py-3 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-stone-500" aria-hidden />
                <p className="font-semibold text-stone-900 dark:text-stone-100">{org.organization_name}</p>
              </div>
              <p className="text-xs text-stone-500">
                {t("orgMeta", {
                  projects: org.project_count,
                  attested: org.attested_count,
                  inField: org.in_field_count,
                })}
              </p>
            </div>
            <ul className="divide-y divide-stone-100 dark:divide-stone-800">
              {org.projects.slice(0, 6).map((project) => (
                <li key={project.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
                  <div>
                    <Link
                      href={projectAuditHref(project.id)}
                      className="font-medium text-forest-800 hover:underline dark:text-forest-300"
                    >
                      {project.name}
                    </Link>
                    <p className="text-xs text-stone-500">
                      {project.code} · {t("cycle", { number: project.cycle_number })}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                      auditEngagementStatusTone(project.engagement_status),
                    )}
                  >
                    {auditEngagementStatusLabel(project.engagement_status)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </PortfolioSection>
  );
}
