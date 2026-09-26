"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ClipboardCheck, MapPin, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { auditEngagements } from "@/lib/api";
import { projectAuditIntakeHref } from "@/lib/audit-intake-links";
import { fieldOpsHref } from "@/lib/field-ops-links";
import { portfolioAuditHref } from "@/lib/portfolio-health-links";
import { scopedKey } from "@/lib/query-keys";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/cn";
import { fmtNum } from "@/components/dashboard/format";

export function AuditPortfolioStrip({ className }: { className?: string }) {
  const { user } = useAuth();
  const t = useTranslations("auditPortfolio");
  const { data, isLoading } = useQuery({
    queryKey: scopedKey(user, "audit-portfolio-summary"),
    queryFn: () => auditEngagements.portfolioSummary(),
    staleTime: 60_000,
  });

  if (isLoading || !data || data.estate_project_count === 0) return null;

  const warnPlots = data.audit_plots_due > 0;
  const warnField = data.engagements_in_field > 0;

  return (
    <section className={cn("dash-panel dash-panel--compliance", className)}>
      <div className="dash-panel-head">
        <div>
          <h2 className="dash-panel-title flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-sky-600" />
            {t("title")}
          </h2>
          <p className="dash-panel-sub">
            {t("subtitle", { count: data.estate_project_count })}
          </p>
        </div>
        <Link href={portfolioAuditHref()} className="dash-link">
          {t("portfolioLink")} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: t("engagements"),
            value: fmtNum(data.engagement_count),
            href: portfolioAuditHref(),
            icon: ClipboardCheck,
            warn: false,
          },
          {
            label: t("plotsDue"),
            value: fmtNum(data.audit_plots_due),
            href: fieldOpsHref({ section: "audit" }),
            icon: MapPin,
            warn: warnPlots,
          },
          {
            label: t("inField"),
            value: fmtNum(data.engagements_in_field),
            href: portfolioAuditHref(),
            icon: MapPin,
            warn: warnField,
          },
          {
            label: t("attested"),
            value: fmtNum(data.engagements_attested),
            href: portfolioAuditHref(),
            icon: ShieldCheck,
            warn: false,
          },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={cn("dash-command-item", item.warn && "dash-command-item--warn")}
          >
            <item.icon className="h-4 w-4 shrink-0 opacity-70" />
            <div>
              <p className="dash-command-value">{item.value}</p>
              <p className="dash-command-label">{item.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {data.projects.filter((p) => p.audit_plots_due > 0).length > 0 ? (
        <ul className="mt-4 space-y-2 border-t border-stone-100 pt-4 dark:border-stone-800">
          {data.projects
            .filter((p) => p.audit_plots_due > 0)
            .slice(0, 4)
            .map((project) => (
              <li key={project.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <div>
                  <Link
                    href={projectAuditIntakeHref(project.id)}
                    className="font-medium text-forest-800 hover:underline"
                  >
                    {project.name}
                  </Link>
                  <p className="text-xs text-stone-500">
                    {project.engagement_status.replaceAll("_", " ")} · {project.audit_plots_due}{" "}
                    {t("plotsDueLabel")}
                  </p>
                </div>
                <Link
                  href={fieldOpsHref({ section: "audit" })}
                  className="text-xs font-medium text-forest-700 hover:underline"
                >
                  {t("openQueue")}
                </Link>
              </li>
            ))}
        </ul>
      ) : null}
    </section>
  );
}
