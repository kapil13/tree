"use client";

import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  FolderKanban,
  Satellite,
  ShieldCheck,
  TreePine,
} from "lucide-react";
import { dashboard, intelligence, plantingProjects } from "@/lib/api";
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
  onSelectTab,
}: {
  onSelectTab: (tab: "threats" | "monitoring" | "biodiversity") => void;
}) {
  const [dashQ, monitoringQ, fieldOpsQ, briefQ] = useQueries({
    queries: [
      { queryKey: ["dashboard-portfolio"], queryFn: dashboard.get, staleTime: 60_000 },
      { queryKey: ["monitoring-summary"], queryFn: () => plantingProjects.monitoringSummary() },
      { queryKey: ["field-ops-summary"], queryFn: () => plantingProjects.fieldOpsSummary() },
      { queryKey: ["executive-brief-portfolio"], queryFn: () => intelligence.brief(), staleTime: 60_000 },
    ],
  });

  if (dashQ.isLoading || monitoringQ.isLoading || fieldOpsQ.isLoading) {
    return <p className="text-sm text-stone-500">Loading portfolio overview…</p>;
  }

  const kpi = dashQ.data?.kpi;
  const monitoring = monitoringQ.data;
  const fieldOps = fieldOpsQ.data;
  const brief = briefQ.data;
  const unreadAlerts = Object.values(monitoring?.unread_alerts_by_kind ?? {}).reduce(
    (a, b) => a + b,
    0,
  );

  const attentionProjects =
    fieldOps?.projects.filter((p) => p.open_violations > 0 || p.survival_due > 0).slice(0, 6) ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <PortfolioKpiCard icon={TreePine} label="Trees" value={String(kpi?.total_trees ?? fieldOps?.tree_count ?? 0)} />
        <PortfolioKpiCard icon={FolderKanban} label="Projects" value={String(fieldOps?.project_count ?? 0)} />
        <PortfolioKpiCard
          icon={AlertTriangle}
          label="Open violations"
          value={String(monitoring?.open_violations ?? fieldOps?.open_violations ?? 0)}
          warn={(monitoring?.open_violations ?? 0) > 0}
        />
        <PortfolioKpiCard
          icon={Satellite}
          label="Stale NDVI scans"
          value={String(monitoring?.stale_satellite_work_areas ?? 0)}
          warn={(monitoring?.stale_satellite_work_areas ?? 0) > 0}
        />
        <PortfolioKpiCard
          icon={Bell}
          label="Unread alerts"
          value={String(unreadAlerts)}
          warn={unreadAlerts > 0}
        />
        <PortfolioKpiCard
          icon={ShieldCheck}
          label="Portfolio risk"
          value={brief?.highest_risk ?? "—"}
          warn={brief?.highest_risk != null && brief.highest_risk !== "low"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <button
          type="button"
          className="card text-left transition hover:border-forest-300"
          onClick={() => onSelectTab("threats")}
        >
          <p className="text-sm font-semibold text-stone-900">Threats & weather</p>
          <p className="mt-1 text-xs text-stone-600">
            Pest hotspots, weather alerts, and threat watch across work areas.
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-forest-700">
            Open tab <ArrowRight className="h-3 w-3" />
          </span>
        </button>
        <button
          type="button"
          className="card text-left transition hover:border-forest-300"
          onClick={() => onSelectTab("monitoring")}
        >
          <p className="text-sm font-semibold text-stone-900">Satellite monitoring</p>
          <p className="mt-1 text-xs text-stone-600">
            NDVI scan status, trigger project scans, and background job health.
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-forest-700">
            Open tab <ArrowRight className="h-3 w-3" />
          </span>
        </button>
        <button
          type="button"
          className="card text-left transition hover:border-forest-300"
          onClick={() => onSelectTab("biodiversity")}
        >
          <p className="text-sm font-semibold text-stone-900">Biodiversity</p>
          <p className="mt-1 text-xs text-stone-600">
            Bioacoustic recordings, species richness, and ecosystem health scores.
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-forest-700">
            Open tab <ArrowRight className="h-3 w-3" />
          </span>
        </button>
      </div>

      <section className="card overflow-hidden p-0">
        <div className="border-b border-stone-200 px-4 py-3">
          <h2 className="font-medium">Projects needing attention</h2>
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
                        href={`/projects/${p.id}?tab=compliance`}
                        className="text-xs text-forest-700 hover:underline"
                      >
                        Fix compliance
                      </Link>
                    ) : (
                      <Link
                        href={`/projects/${p.id}?tab=trees`}
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
