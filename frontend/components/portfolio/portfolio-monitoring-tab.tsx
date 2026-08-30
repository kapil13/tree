"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Bell,
  ClipboardList,
  Download,
  FileText,
  Radar,
  RefreshCw,
  Satellite,
  Server,
} from "lucide-react";
import { plantingProjects, sar } from "@/lib/api";
import { PortfolioKpiCard } from "./portfolio-kpi-card";
import { ScanHistoryGrid } from "@/components/satellite/scan-history-grid";

const SEGMENT_LABEL: Record<string, string> = {
  nhai_highway: "NHAI / Highway",
  industrial_greenbelt: "Mine / Green belt",
  township_landscape: "Township / Society",
  nagar_van_urban: "Nagar Van / Urban forest",
  sahakar_van_coop: "Sahakar Van / Cooperative forest",
  ngo_watershed: "NGO / Watershed",
  estate_monitoring: "Estate / forest watch",
  general: "General",
};

const ALERT_KIND_LABEL: Record<string, string> = {
  ndvi_degradation: "NDVI degradation",
  health_roundup: "Health roundup",
  compliance_open: "Open compliance",
  threat_watch: "Threat watch",
  survival_survey: "Survival survey",
  satellite_health: "Satellite health",
  satellite_health_digest: "Satellite digest",
  compliance_deadline_approaching: "Compliance deadline",
  compliance_deadline_overdue: "Compliance overdue",
  sar_integrity_drop: "SAR integrity drop",
  sar_optical_divergent: "SAR optical mismatch",
  sar_integrity_at_risk: "SAR at risk",
  sar_monsoon_gap_fill: "SAR monsoon alert",
  sar_hidden_moisture: "SAR hidden moisture",
  sar_wetland_detected: "SAR wetland",
  sar_flood_risk: "SAR waterlogging",
  sar_ground_moisture: "SAR ground moisture",
  sar_ground_instability: "SAR ground instability",
  sar_sweep_health: "SAR sweep health",
};

const SAR_MODE_LABEL: Record<string, string> = {
  aligned: "Aligned",
  optical_sar_divergent: "Mismatch",
  sar_gap_fill: "Gap-fill",
  sar_stress: "Stress",
};

export function PortfolioMonitoringTab() {
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
    return <p className="text-sm text-stone-500">Loading monitoring data…</p>;
  }

  const unreadTotal = Object.values(data.unread_alerts_by_kind).reduce((a, b) => a + b, 0);
  const sarUnreadTotal = Object.values(data.unread_sar_alerts_by_kind ?? {}).reduce(
    (a, b) => a + b,
    0,
  );
  const openFieldTasks = data.open_sar_field_verifications ?? [];

  const handleExport = async () => {
    const blob = new Blob([await sar.portfolioExport()], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sar-portfolio-export.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = async () => {
    const blob = await sar.portfolioReportPdf();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sar-forest-integrity-report.pdf";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600">
        Check which sites need a fresh satellite scan, review alerts, and open field follow-ups.
        Greenness (NDVI) is the everyday signal; radar (SAR) fills in during clouds and monsoon.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PortfolioKpiCard
          icon={Satellite}
          label="Sites needing scan"
          value={String(data.stale_satellite_work_areas)}
          warn={data.stale_satellite_work_areas > 0}
        />
        <PortfolioKpiCard
          icon={Radar}
          label="At-risk sites"
          value={String(data.sar_at_risk_work_areas ?? 0)}
          warn={(data.sar_at_risk_work_areas ?? 0) > 0}
        />
        <PortfolioKpiCard
          icon={Bell}
          label="Unread alerts"
          value={String(unreadTotal + sarUnreadTotal)}
          warn={unreadTotal + sarUnreadTotal > 0}
        />
        <PortfolioKpiCard
          icon={Activity}
          label="Avg site health"
          value={
            data.sar_avg_forest_integrity != null
              ? `${data.sar_avg_forest_integrity}`
              : "—"
          }
          warn={
            data.sar_avg_forest_integrity != null && data.sar_avg_forest_integrity < 50
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-stone-600">
          SAR providers: {data.sar_live_providers ?? 0} live · {data.sar_stub_providers ?? 0} stub
        </span>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg border border-stone-300 px-3 py-1.5 text-xs hover:bg-stone-50"
          onClick={() => void handleExportPdf()}
        >
          <FileText className="h-3 w-3" />
          Export SAR PDF
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg border border-stone-300 px-3 py-1.5 text-xs hover:bg-stone-50"
          onClick={() => void handleExport()}
        >
          <Download className="h-3 w-3" />
          Export SAR CSV
        </button>
      </div>

      {(data.stale_sar_work_areas ?? 0) > 0 && (
        <p className="text-sm text-amber-800">
          {data.stale_sar_work_areas} work area{(data.stale_sar_work_areas ?? 0) === 1 ? "" : "s"}{" "}
          have no SAR scan in the last 35 days. Run a SAR scan from the Satellite page.
        </p>
      )}

      {Object.keys(data.unread_sar_alerts_by_kind ?? {}).length > 0 && (
        <section className="card">
          <h2 className="text-lg font-medium">SAR alerts by type</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(data.unread_sar_alerts_by_kind ?? {}).map(([kind, count]) => (
              <Link
                key={kind}
                href={`/alerts?sar=${kind}`}
                className="rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-900 hover:bg-amber-100"
              >
                {ALERT_KIND_LABEL[kind] ?? kind}: {count}
              </Link>
            ))}
          </div>
        </section>
      )}

      {openFieldTasks.length > 0 && (
        <section className="card overflow-hidden p-0">
          <div className="flex items-center gap-2 border-b border-stone-200 px-4 py-3">
            <ClipboardList className="h-4 w-4 text-stone-500" />
            <h2 className="font-medium">Open SAR field verifications</h2>
            <span className="ml-auto text-xs text-stone-500">{openFieldTasks.length} open</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
              <tr>
                <th className="px-4 py-2">Work area</th>
                <th className="px-4 py-2">Alert</th>
                <th className="px-4 py-2">Severity</th>
                <th className="px-4 py-2">Integrity</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {openFieldTasks.map((task) => (
                <tr key={task.id} className="border-t border-stone-100">
                  <td className="px-4 py-2 font-medium">{task.work_area_name ?? "—"}</td>
                  <td className="px-4 py-2 text-xs">
                    {ALERT_KIND_LABEL[task.alert_kind ?? ""] ?? task.alert_kind ?? task.message}
                  </td>
                  <td className="px-4 py-2 capitalize">{task.severity}</td>
                  <td className="px-4 py-2">
                    {task.forest_integrity_score != null ? task.forest_integrity_score : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {task.deep_link && (
                      <Link href={task.deep_link} className="text-xs text-forest-700 hover:underline">
                        Open satellite →
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

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
              <th className="px-4 py-2">SAR integrity</th>
              <th className="px-4 py-2">SAR mode</th>
              <th className="px-4 py-2">Recommended action</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {data.work_area_monitoring.map((wa) => (
              <tr key={wa.id} className="border-t border-stone-100">
                <td className="px-4 py-2 font-medium">{wa.name}</td>
                <td className="px-4 py-2">
                  {wa.project_id ? (
                    <Link
                      href={`/projects/${wa.project_id}`}
                      className="text-forest-800 hover:underline"
                    >
                      {wa.project_name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2">
                  {SEGMENT_LABEL[wa.segment ?? ""] ?? wa.segment ?? "—"}
                </td>
                <td className="px-4 py-2">
                  {wa.days_since_scan != null ? (
                    <span className={wa.days_since_scan > 35 ? "text-amber-700" : ""}>
                      {wa.days_since_scan}d ago
                    </span>
                  ) : (
                    <span className="text-stone-400">Never</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {wa.latest_ndvi != null ? wa.latest_ndvi.toFixed(2) : "—"}
                </td>
                <td className="px-4 py-2">
                  {wa.sar_forest_integrity != null ? (
                    <span className={wa.sar_at_risk ? "font-medium text-amber-800" : ""}>
                      {wa.sar_forest_integrity}
                      {wa.sar_integrity_grade ? ` (${wa.sar_integrity_grade})` : ""}
                    </span>
                  ) : (
                    <span className="text-stone-400">No SAR</span>
                  )}
                </td>
                <td className="px-4 py-2 text-xs">
                  {wa.sar_monitoring_mode
                    ? SAR_MODE_LABEL[wa.sar_monitoring_mode] ?? wa.sar_monitoring_mode
                    : "—"}
                </td>
                <td className="max-w-xs truncate px-4 py-2 text-xs text-stone-600">
                  {wa.sar_recommended_action ?? "—"}
                </td>
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

      <ScanHistoryGrid portfolio title="Recent scan history" limit={40} />

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
                  No job runs recorded yet.
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
