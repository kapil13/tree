"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FileText, ShieldAlert, ShieldCheck } from "lucide-react";
import { compliance } from "@/lib/api";
import { scopedKey } from "@/lib/query-keys";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/cn";
import { fmtNum, fmtPct } from "@/components/dashboard/format";

export function CompliancePortfolioStrip({ className }: { className?: string }) {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: scopedKey(user, "compliance-portfolio-summary"),
    queryFn: () => compliance.portfolioSummary(),
    staleTime: 60_000,
  });

  if (isLoading || !data) return null;

  const warnReadiness = data.avg_readiness_pct < 80;
  const warnViolations = data.open_violations > 0;
  const warnBlocking = data.blocking_violations > 0;
  const warnSafeguards = data.safeguard_gap_count > 0;

  return (
    <section className={cn("dash-panel dash-panel--compliance", className)}>
      <div className="dash-panel-head">
        <div>
          <h2 className="dash-panel-title flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-forest-600" />
            Compliance posture
          </h2>
          <p className="dash-panel-sub">
            Readiness, violations, and safeguards across {data.project_count} project
            {data.project_count === 1 ? "" : "s"}
          </p>
        </div>
        <Link href="/portfolio-health?tab=compliance" className="dash-link">
          Portfolio compliance <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Avg readiness",
            value: fmtPct(data.avg_readiness_pct),
            href: "/portfolio-health?tab=compliance",
            icon: ShieldCheck,
            warn: warnReadiness,
          },
          {
            label: "Open violations",
            value: fmtNum(data.open_violations),
            href: "/portfolio-health?tab=compliance",
            icon: ShieldAlert,
            warn: warnViolations,
          },
          {
            label: "Blocking",
            value: fmtNum(data.blocking_violations),
            href: "/field-ops#attention",
            icon: ShieldAlert,
            warn: warnBlocking,
          },
          {
            label: "Safeguard gaps",
            value: fmtNum(data.safeguard_gap_count),
            href: "/portfolio-health?tab=compliance",
            icon: ShieldCheck,
            warn: warnSafeguards,
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

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-4">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
          Org exports
        </span>
        {data.report_links.map((link) => (
          <Link
            key={link.tab}
            href={`/reports?tab=${link.tab}`}
            className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-medium text-stone-600 transition hover:border-forest-200 hover:text-forest-800"
          >
            <FileText className="h-3 w-3 opacity-60" />
            {link.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
