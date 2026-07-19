"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Bell,
  RefreshCw,
  Satellite,
  Server,
} from "lucide-react";
import { plantingProjects } from "@/lib/api";

const SEGMENT_LABEL: Record<string, string> = {
  nhai_highway: "NHAI / Highway",
  industrial_greenbelt: "Mine / Green belt",
  township_landscape: "Township / Society",
  ngo_watershed: "NGO / Watershed",
  general: "General",
};

const ALERT_KIND_LABEL: Record<string, string> = {
  ndvi_degradation: "NDVI degradation",
  health_roundup: "Health roundup",
  compliance_open: "Open compliance",
  threat_watch: "Threat watch",
  survival_survey: "Survival survey",
  satellite_health: "Satellite health",
};

export default function MonitoringPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["monitoring-summary"],
    queryFn: () => plantingProjects.monitoringSummary(),
  });

  const scanMutation = useMutation({
    mutationFn: (projectId: string) => plantingProjects.triggerSatelliteScan(projectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["monitoring-summary"] }),
  });

  if (isLoading || !data) {
    return <p className="text-sm text-stone-500">Loading monitoring dashboard…</p>;
  }

  const unreadTotal = Object.values(data.unread_alerts_by_kind).reduce((a, b) => a + b, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Monitoring</h1>
        <p className="mt-1 text-sm text-stone-600">
          Satellite coverage, automated alerts, and background job health across your portfolio.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Satellite} label="Stale satellite scans" value={String(data.stale_satellite_work_areas)} warn={data.stale_satellite_work_areas > 0} />
        <KpiCard icon={Bell} label="Unread alerts (30d)" value={String(unreadTotal)} warn={unreadTotal > 0} />
        <KpiCard icon={AlertTriangle} label="Open violations" value={String(data.open_violations)} warn={data.open_violations > 0} />
        <KpiCard icon={Activity} label="Work areas tracked" value={String(data.work_area_monitoring.length)} />
      </div>

      {Object.keys(data.unread_alerts_by_kind).length > 0 && (
        <section className="card">
          <h2 className="text-lg font-medium">Unread alerts by type</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(data.unread_alerts_by_kind).map(([kind, count]) => (
              <Link
                key={kind}
                href="/alerts"
                className="rounded-full bg-stone-100 px-3 py-1 text-sm hover:bg-stone-200"
              >
                {ALERT_KIND_LABEL[kind] ?? kind}: {count}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="card overflow-hidden p-0">
        <div className="border-b border-stone-200 px-4 py-3">
          <h2 className="font-medium">Work area satellite status</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
            <tr>
              <th className="px-4 py-2">Work area</th>
              <th className="px-4 py-2">Project</th>
              <th className="px-4 py-2">Segment</th>
              <th className="px-4 py-2">Last scan</th>
              <th className="px-4 py-2">NDVI</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {data.work_area_monitoring.map((wa) => (
              <tr key={wa.id} className="border-t border-stone-100">
                <td className="px-4 py-2 font-medium">{wa.name}</td>
                <td className="px-4 py-2">
                  {wa.project_id ? (
                    <Link href={`/projects/${wa.project_id}`} className="text-forest-800 hover:underline">
                      {wa.project_name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2">{SEGMENT_LABEL[wa.segment ?? ""] ?? wa.segment ?? "—"}</td>
                <td className="px-4 py-2">
                  {wa.days_since_scan != null ? (
                    <span className={wa.days_since_scan > 35 ? "text-amber-700" : ""}>
                      {wa.days_since_scan}d ago
                    </span>
                  ) : (
                    <span className="text-stone-400">Never</span>
                  )}
                </td>
                <td className="px-4 py-2">{wa.latest_ndvi != null ? wa.latest_ndvi.toFixed(2) : "—"}</td>
                <td className="px-4 py-2 text-right">
                  {wa.project_id && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-forest-700 hover:underline disabled:opacity-50"
                      disabled={scanMutation.isPending}
                      onClick={() => scanMutation.mutate(wa.project_id!)}
                    >
                      <RefreshCw className="h-3 w-3" />
                      Scan project
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b border-stone-200 px-4 py-3">
          <Server className="h-4 w-4 text-stone-500" />
          <h2 className="font-medium">Recent background jobs</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
            <tr>
              <th className="px-4 py-2">Job</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Finished</th>
              <th className="px-4 py-2">Result</th>
            </tr>
          </thead>
          <tbody>
            {data.recent_jobs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-stone-500">
                  No job runs recorded yet. Jobs appear after the first Celery beat cycle.
                </td>
              </tr>
            ) : (
              data.recent_jobs.map((job, i) => (
                <tr key={`${job.job_name}-${job.finished_at}-${i}`} className="border-t border-stone-100">
                  <td className="px-4 py-2 font-mono text-xs">{job.job_name}</td>
                  <td className="px-4 py-2">
                    <span className={job.status === "error" ? "text-red-700" : "text-green-700"}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-stone-500">{job.finished_at ?? "—"}</td>
                  <td className="max-w-xs truncate px-4 py-2 font-mono text-xs text-stone-600">
                    {job.error ?? JSON.stringify(job.result)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  warn = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className={`card flex items-center gap-3 ${warn ? "border-amber-200 bg-amber-50" : ""}`}>
      <div className={`rounded-lg p-2 ${warn ? "bg-amber-100" : "bg-stone-100"}`}>
        <Icon className={`h-5 w-5 ${warn ? "text-amber-800" : "text-stone-600"}`} />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
        <p className="text-2xl font-semibold text-stone-900">{value}</p>
      </div>
    </div>
  );
}
