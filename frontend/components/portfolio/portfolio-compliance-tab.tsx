"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, FileText, ShieldAlert, ShieldCheck } from "lucide-react";
import { compliance } from "@/lib/api";
import { projectSecondaryHref } from "@/lib/project-focused-ui";
import { cn } from "@/lib/cn";
import { PortfolioKpiCard } from "./portfolio-kpi-card";

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
  if (pct >= 80) return "text-forest-700";
  if (pct >= 50) return "text-amber-700";
  return "text-rose-700";
}

export function PortfolioComplianceTab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["compliance-portfolio-summary"],
    queryFn: () => compliance.portfolioSummary(),
    staleTime: 60_000,
  });

  if (isLoading) {
    return <p className="text-sm text-stone-500">Loading compliance summary…</p>;
  }

  if (error || !data) {
    return (
      <p className="text-sm text-rose-700">
        Could not load compliance summary. Check your session and try again.
      </p>
    );
  }

  const attentionProjects = data.projects.filter(
    (p) => p.blocking_violations > 0 || p.open_violations > 0 || p.readiness_pct < 80,
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PortfolioKpiCard
          icon={ShieldCheck}
          label="Avg readiness"
          value={`${Math.round(data.avg_readiness_pct)}%`}
          warn={data.avg_readiness_pct < 80}
        />
        <PortfolioKpiCard
          icon={AlertTriangle}
          label="Open violations"
          value={String(data.open_violations)}
          warn={data.open_violations > 0}
        />
        <PortfolioKpiCard
          icon={ShieldAlert}
          label="Blocking violations"
          value={String(data.blocking_violations)}
          warn={data.blocking_violations > 0}
        />
        <PortfolioKpiCard
          icon={FileText}
          label="Safeguard gaps"
          value={String(data.safeguard_gap_count)}
          warn={data.safeguard_gap_count > 0}
        />
      </div>

      <section className="card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-medium text-stone-900">Framework exports</h2>
            <p className="mt-1 text-xs text-stone-500">
              Org-level BRSR, ETF, SBTi FLAG, GBF, and ISO 14064-1 packs from Reports.
            </p>
          </div>
          <Link href="/reports" className="text-xs font-medium text-forest-700 hover:underline">
            Open reports
          </Link>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {data.report_links.map((link) => (
            <Link
              key={link.tab}
              href={`/reports?tab=${link.tab}`}
              className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-700 transition hover:border-forest-200 hover:bg-forest-50 hover:text-forest-800"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="card overflow-hidden p-0">
        <div className="border-b border-stone-200 px-4 py-3">
          <h2 className="font-medium">Project readiness</h2>
          <p className="text-xs text-stone-500">
            {data.project_count} project{data.project_count === 1 ? "" : "s"} ·{" "}
            {data.projects_below_80_readiness} below 80% readiness
            {data.projects_with_safeguard_gaps > 0
              ? ` · ${data.projects_with_safeguard_gaps} with safeguard gaps`
              : ""}
          </p>
        </div>
        {data.projects.length === 0 ? (
          <p className="px-4 py-6 text-sm text-stone-500">No planting projects in your portfolio yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
              <tr>
                <th className="px-4 py-2">Project</th>
                <th className="px-4 py-2">Framework</th>
                <th className="px-4 py-2">Readiness</th>
                <th className="px-4 py-2">Violations</th>
                <th className="px-4 py-2">Safeguards</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {data.projects.map((p) => (
                <tr key={p.id} className="border-t border-stone-100">
                  <td className="px-4 py-2">
                    <Link href={`/projects/${p.id}`} className="font-medium text-forest-800 hover:underline">
                      {p.name}
                    </Link>
                    <div className="text-xs text-stone-500">
                      {p.code} · {SEGMENT_LABEL[p.segment] ?? p.segment}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-xs text-stone-600">{p.recommended_checklist_label}</td>
                  <td className="px-4 py-2">
                    <span className={cn("font-semibold", readinessTone(p.readiness_pct))}>
                      {Math.round(p.readiness_pct)}%
                    </span>
                    <div className="text-xs text-stone-500">
                      {p.workflow_done}/{p.workflow_total} steps
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    {p.open_violations > 0 ? (
                      <span className="text-amber-700">
                        {p.open_violations}
                        {p.blocking_violations > 0 ? ` (${p.blocking_violations} blocking)` : ""}
                      </span>
                    ) : (
                      "0"
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {p.safeguard_gaps > 0 ? (
                      <span className="text-amber-700">{p.safeguard_gaps} missing</span>
                    ) : (
                      <span className="text-forest-700">Complete</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={projectSecondaryHref(p.id, "compliance")}
                      className="inline-flex items-center gap-1 text-xs text-forest-700 hover:underline"
                    >
                      Open compliance
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {attentionProjects.length > 0 ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">Priority actions</p>
          <ul className="mt-2 space-y-1 text-xs">
            {attentionProjects.slice(0, 5).map((p) => (
              <li key={p.id}>
                <Link href={projectSecondaryHref(p.id, "compliance")} className="hover:underline">
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
        </section>
      ) : null}
    </div>
  );
}
