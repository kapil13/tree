"use client";

import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  Satellite,
  TreePine,
} from "lucide-react";
import { dashboard, plantingProjects } from "@/lib/api";
import { projectOverviewHref, projectSecondaryHref } from "@/lib/project-focused-ui";
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

export function PortfolioOverviewTab({
  onSelectTab: _unusedSelectTab,
}: {
  onSelectTab: (tab: "threats" | "monitoring" | "biodiversity") => void;
}) {
  void _unusedSelectTab;
  const [dashQ, monitoringQ, fieldOpsQ] = useQueries({
    queries: [
      { queryKey: ["dashboard-portfolio"], queryFn: dashboard.get, staleTime: 60_000 },
      { queryKey: ["monitoring-summary"], queryFn: () => plantingProjects.monitoringSummary() },
      { queryKey: ["field-ops-summary"], queryFn: () => plantingProjects.fieldOpsSummary() },
    ],
  });

  if (dashQ.isLoading || monitoringQ.isLoading || fieldOpsQ.isLoading) {
    return <p className="text-sm text-stone-500">Loading portfolio overview…</p>;
  }

  const kpi = dashQ.data?.kpi;
  const monitoring = monitoringQ.data;
  const fieldOps = fieldOpsQ.data;
  const unreadAlerts = Object.values(monitoring?.unread_alerts_by_kind ?? {}).reduce(
    (a, b) => a + b,
    0,
  );

  const attentionProjects =
    fieldOps?.projects.filter((p) => p.open_violations > 0 || p.survival_due > 0).slice(0, 6) ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PortfolioKpiCard icon={TreePine} label="Trees" value={String(kpi?.total_trees ?? fieldOps?.tree_count ?? 0)} />
        <PortfolioKpiCard
          icon={AlertTriangle}
          label="Open violations"
          value={String(monitoring?.open_violations ?? fieldOps?.open_violations ?? 0)}
          warn={(monitoring?.open_violations ?? 0) > 0}
        />
        <PortfolioKpiCard
          icon={Satellite}
          label="Sites needing scan"
          value={String(
            (monitoring?.stale_satellite_work_areas ?? 0) + (monitoring?.sar_at_risk_work_areas ?? 0),
          )}
          warn={
            (monitoring?.stale_satellite_work_areas ?? 0) + (monitoring?.sar_at_risk_work_areas ?? 0) > 0
          }
        />
        <PortfolioKpiCard
          icon={Bell}
          label="Unread alerts"
          value={String(unreadAlerts)}
          warn={unreadAlerts > 0}
        />
      </div>

      <section className="card overflow-hidden p-0">
        <div className="border-b border-stone-200 px-4 py-3">
          <h2 className="font-medium">Needs attention</h2>
          <p className="text-xs text-stone-500">Open violations or survival surveys due</p>
        </div>
        {attentionProjects.length === 0 ? (
          <p className="px-4 py-6 text-sm text-stone-500">All projects look healthy — no urgent actions.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
              <tr>
                <th className="px-4 py-2">Project</th>
                <th className="px-4 py-2">Segment</th>
                <th className="px-4 py-2">Violations</th>
                <th className="px-4 py-2">Geotag due</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {attentionProjects.map((p) => (
                <tr key={p.id} className="border-t border-stone-100">
                  <td className="px-4 py-2">
                    <Link href={`/projects/${p.id}`} className="font-medium text-forest-800 hover:underline">
                      {p.name}
                    </Link>
                    <div className="text-xs text-stone-500">{p.code}</div>
                  </td>
                  <td className="px-4 py-2">{SEGMENT_LABEL[p.segment] ?? p.segment}</td>
                  <td className="px-4 py-2">
                    {p.open_violations > 0 ? (
                      <span className="text-amber-700">{p.open_violations}</span>
                    ) : (
                      "0"
                    )}
                  </td>
                  <td className="px-4 py-2">{p.survival_due}</td>
                  <td className="px-4 py-2 text-right">
                    {p.open_violations > 0 ? (
                      <Link
                        href={projectSecondaryHref(p.id, "compliance")}
                        className="text-xs text-forest-700 hover:underline"
                      >
                        Fix compliance
                      </Link>
                    ) : (
                      <Link
                        href={projectOverviewHref(p.id)}
                        className="text-xs text-forest-700 hover:underline"
                      >
                        Review trees
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
