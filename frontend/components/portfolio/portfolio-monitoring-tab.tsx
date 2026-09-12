"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
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
import { alertsHref, portfolioAlertKindHref } from "@/lib/alerts-links";
import { PortfolioDisclosure } from "./portfolio-disclosure";
import { PortfolioKpiCard } from "./portfolio-kpi-card";
import { PortfolioKpiGrid } from "./portfolio-kpi-grid";
import { PortfolioSection } from "./portfolio-section";
import { PortfolioTabBanner } from "./portfolio-tab-banner";
import { PortfolioTabError, PortfolioTabLoading } from "./portfolio-tab-state";
import { PortfolioTabShell } from "./portfolio-tab-shell";
import { IntegrationStubBanner } from "@/components/integrations/integration-stub-banner";
import { ScanHistoryGrid } from "@/components/satellite/scan-history-grid";
import { ScanCyclePanel } from "@/components/satellite/scan-cycle-panel";
import { TreeScanHistoryGrid } from "@/components/satellite/tree-scan-history-grid";

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
  fire_alert: "Fire watch",
  flood_extent_alert: "Flood extent",
  ndvi_acute_drop: "Acute NDVI drop",
  canopy_loss_suspected: "Canopy loss",
  scan_cycle_digest: "Scan cycle digest",
};

const SAR_MODE_LABEL: Record<string, string> = {
  aligned: "Aligned",
  optical_sar_divergent: "Mismatch",
  sar_gap_fill: "Gap-fill",
  sar_stress: "Stress",
};

export function PortfolioMonitoringTab({
  projectId,
  projectName,
}: {
  projectId?: string | null;
  projectName?: string | null;
}) {
  const t = useTranslations("portfolioTabs.monitoring");
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["monitoring-summary"],
    queryFn: () => plantingProjects.monitoringSummary(),
  });

  const scanMutation = useMutation({
    mutationFn: (scanProjectId: string) => plantingProjects.triggerSatelliteScan(scanProjectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["monitoring-summary"] }),
  });

  if (isLoading) {
    return <PortfolioTabLoading />;
  }

  if (error || !data) {
    return <PortfolioTabError onRetry={() => void refetch()} />;
  }

  const unreadTotal = Object.values(data.unread_alerts_by_kind).reduce((a, b) => a + b, 0);
  const sarUnreadTotal = Object.values(data.unread_sar_alerts_by_kind ?? {}).reduce(
    (a, b) => a + b,
    0,
  );
  const hazardUnreadTotal = Object.values(data.unread_hazard_alerts_by_kind ?? {}).reduce(
    (a, b) => a + b,
    0,
  );
  const scanEngine = data.scan_engine;
  const openFieldTasks = (data.open_sar_field_verifications ?? []).filter(
    (task) => !projectId || task.project_id === projectId,
  );
  const workAreas = projectId
    ? data.work_area_monitoring.filter((wa) => wa.project_id === projectId)
    : data.work_area_monitoring;

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

  const scanEngineDetail =
    scanEngine &&
    t("scanEngineDetail", {
      trees: scanEngine.enrolled_trees,
      tiles: scanEngine.distinct_scan_tiles,
      batching: scanEngine.tile_batching_enabled ? t("tileBatched") : "",
      watch:
        scanEngine.watch_work_areas > 0 ? t("watchAreas", { count: scanEngine.watch_work_areas }) : "",
      firms: scanEngine.firms_live ? t("firmsLive") : t("firmsFallback"),
    });

  return (
    <PortfolioTabShell tab="monitoring" projectId={projectId} projectName={projectName}>
      <IntegrationStubBanner className="mb-4" />
      <PortfolioKpiGrid>
        <PortfolioKpiCard
          icon={Satellite}
          label={t("kpi.sitesNeedingScan")}
          value={String(data.stale_satellite_work_areas)}
          warn={data.stale_satellite_work_areas > 0}
        />
        <PortfolioKpiCard
          icon={Radar}
          label={t("kpi.atRiskSites")}
          value={String(data.sar_at_risk_work_areas ?? 0)}
          warn={(data.sar_at_risk_work_areas ?? 0) > 0}
        />
        <PortfolioKpiCard
          icon={Bell}
          label={t("kpi.unreadAlerts")}
          value={String(unreadTotal + sarUnreadTotal + hazardUnreadTotal)}
          warn={unreadTotal + sarUnreadTotal + hazardUnreadTotal > 0}
          href={alertsHref()}
        />
        <PortfolioKpiCard
          icon={Server}
          label={t("kpi.treesDueScan")}
          value={scanEngine ? String(scanEngine.due_now) : "—"}
          warn={Boolean(scanEngine && scanEngine.due_now > 0)}
        />
      </PortfolioKpiGrid>

      {scanEngine ? (
        <PortfolioTabBanner variant="info" title={t("scanEngine")} description={scanEngineDetail}>
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
              scanEngine.firms_live
                ? "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-200"
                : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
            }`}
          >
            {scanEngine.firms_live ? t("firmsBadgeLive") : t("firmsBadgeFallback")}
          </span>
        </PortfolioTabBanner>
      ) : null}

      <ScanCyclePanel />


      {(data.stale_sar_work_areas ?? 0) > 0 ? (
        <PortfolioTabBanner
          variant="warn"
          description={t("staleSar", { count: data.stale_sar_work_areas ?? 0 })}
        />
      ) : null}

      {Object.keys(data.unread_hazard_alerts_by_kind ?? {}).length > 0 ? (
        <PortfolioSection title={t("hazardAlerts")}>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {scanEngine ? (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  scanEngine.firms_live
                    ? "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-200"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
                }`}
              >
                {scanEngine.firms_live ? t("firmsBadgeLive") : t("firmsBadgeFallback")}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.unread_hazard_alerts_by_kind ?? {}).map(([kind, count]) => (
              <Link
                key={kind}
                href={portfolioAlertKindHref(kind)}
                className="rounded-full bg-rose-50 px-3 py-1 text-sm text-rose-900 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-100"
              >
                {ALERT_KIND_LABEL[kind] ?? kind}: {count}
              </Link>
            ))}
          </div>
        </PortfolioSection>
      ) : null}

      {Object.keys(data.unread_sar_alerts_by_kind ?? {}).length > 0 ? (
        <PortfolioSection title={t("sarAlerts")}>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.unread_sar_alerts_by_kind ?? {}).map(([kind, count]) => (
              <Link
                key={kind}
                href={alertsHref({ sar: kind })}
                className="rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-900 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-100"
              >
                {ALERT_KIND_LABEL[kind] ?? kind}: {count}
              </Link>
            ))}
          </div>
        </PortfolioSection>
      ) : null}

      {openFieldTasks.length > 0 ? (
        <PortfolioSection
          flush
          icon={ClipboardList}
          title={t("fieldVerifications")}
          description={t("openCount", { count: openFieldTasks.length })}
        >
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500 dark:bg-stone-900/50 dark:text-stone-400">
              <tr>
                <th className="px-4 py-2">{t("table.workArea")}</th>
                <th className="px-4 py-2">{t("table.alert")}</th>
                <th className="px-4 py-2">{t("table.severity")}</th>
                <th className="px-4 py-2">{t("table.integrity")}</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {openFieldTasks.map((task) => (
                <tr key={task.id} className="border-t border-stone-100 dark:border-stone-800">
                  <td className="px-4 py-2 font-medium">{task.work_area_name ?? "—"}</td>
                  <td className="px-4 py-2 text-xs">
                    {ALERT_KIND_LABEL[task.alert_kind ?? ""] ?? task.alert_kind ?? task.message}
                  </td>
                  <td className="px-4 py-2 capitalize">{task.severity}</td>
                  <td className="px-4 py-2">
                    {task.forest_integrity_score != null ? task.forest_integrity_score : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {task.deep_link ? (
                      <Link
                        href={task.deep_link}
                        className="text-xs text-forest-700 hover:underline dark:text-forest-300"
                      >
                        {t("openSatellite")}
                      </Link>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </PortfolioSection>
      ) : null}

      {Object.keys(data.unread_alerts_by_kind).length > 0 ? (
        <PortfolioSection title={t("unreadAlerts")}>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.unread_alerts_by_kind).map(([kind, count]) => (
              <Link
                key={kind}
                href={portfolioAlertKindHref(kind)}
                className="rounded-full bg-stone-100 px-3 py-1 text-sm hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-100"
              >
                {ALERT_KIND_LABEL[kind] ?? kind}: {count}
              </Link>
            ))}
          </div>
        </PortfolioSection>
      ) : null}

      <PortfolioSection flush title={t("workAreaStatus")}>
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500 dark:bg-stone-900/50 dark:text-stone-400">
            <tr>
              <th className="px-4 py-2">{t("table.workArea")}</th>
              <th className="px-4 py-2">{t("table.project")}</th>
              <th className="px-4 py-2">{t("table.segment")}</th>
              <th className="px-4 py-2">{t("table.lastScan")}</th>
              <th className="px-4 py-2">{t("table.ndvi")}</th>
              <th className="px-4 py-2">{t("table.sarIntegrity")}</th>
              <th className="px-4 py-2">{t("table.sarMode")}</th>
              <th className="px-4 py-2">{t("table.recommendedAction")}</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {workAreas.map((wa) => (
              <tr key={wa.id} className="border-t border-stone-100 dark:border-stone-800">
                <td className="px-4 py-2 font-medium">{wa.name}</td>
                <td className="px-4 py-2">
                  {wa.project_id ? (
                    <Link
                      href={`/projects/${wa.project_id}`}
                      className="text-forest-800 hover:underline dark:text-forest-300"
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
                    <span className={wa.days_since_scan > 35 ? "text-amber-700 dark:text-amber-300" : ""}>
                      {t("daysAgo", { days: wa.days_since_scan })}
                    </span>
                  ) : (
                    <span className="text-stone-400">{t("neverScanned")}</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {wa.latest_ndvi != null ? wa.latest_ndvi.toFixed(2) : "—"}
                </td>
                <td className="px-4 py-2">
                  {wa.sar_forest_integrity != null ? (
                    <span className={wa.sar_at_risk ? "font-medium text-amber-800 dark:text-amber-300" : ""}>
                      {wa.sar_forest_integrity}
                      {wa.sar_integrity_grade ? ` (${wa.sar_integrity_grade})` : ""}
                    </span>
                  ) : (
                    <span className="text-stone-400">{t("noSar")}</span>
                  )}
                </td>
                <td className="px-4 py-2 text-xs">
                  {wa.sar_monitoring_mode
                    ? SAR_MODE_LABEL[wa.sar_monitoring_mode] ?? wa.sar_monitoring_mode
                    : "—"}
                </td>
                <td className="max-w-xs truncate px-4 py-2 text-xs text-stone-600 dark:text-stone-400">
                  {wa.sar_recommended_action ?? "—"}
                </td>
                <td className="px-4 py-2 text-right">
                  {wa.project_id ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-forest-700 hover:underline disabled:opacity-50 dark:text-forest-300"
                      disabled={scanMutation.isPending}
                      onClick={() => scanMutation.mutate(wa.project_id!)}
                    >
                      <RefreshCw className="h-3 w-3" aria-hidden />
                      {t("scanProject")}
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </PortfolioSection>

      <PortfolioDisclosure
        icon={Download}
        title={t("exportsTitle")}
        description={t("exportsDesc")}
      >
        <p className="mb-3 text-xs text-stone-500 dark:text-stone-400">
          {t("sarProviders", {
            live: data.sar_live_providers ?? 0,
            stub: data.sar_stub_providers ?? 0,
          })}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-950 dark:hover:bg-stone-900"
            onClick={() => void handleExportPdf()}
          >
            <FileText className="h-3 w-3" aria-hidden />
            {t("exportPdf")}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-950 dark:hover:bg-stone-900"
            onClick={() => void handleExport()}
          >
            <Download className="h-3 w-3" aria-hidden />
            {t("exportCsv")}
          </button>
        </div>
      </PortfolioDisclosure>

      <PortfolioDisclosure
        icon={Satellite}
        title={t("scanHistoryTitle")}
        description={t("scanHistoryDesc")}
      >
        <ScanHistoryGrid portfolio embedded limit={40} className="-mx-4 -mb-4" />
      </PortfolioDisclosure>

      <PortfolioDisclosure
        icon={Radar}
        title={t("treeScanHistoryTitle")}
        description={t("treeScanHistoryDesc")}
      >
        <TreeScanHistoryGrid
          portfolio={!projectId}
          projectId={projectId ?? undefined}
          embedded
          limit={40}
          className="-mx-4 -mb-4"
        />
      </PortfolioDisclosure>

      <PortfolioDisclosure
        icon={Server}
        title={t("recentJobs")}
        description={t("recentJobsDesc")}
        badge={data.recent_jobs.length > 0 ? String(data.recent_jobs.length) : undefined}
      >
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500 dark:bg-stone-900/50 dark:text-stone-400">
            <tr>
              <th className="px-4 py-2">{t("table.job")}</th>
              <th className="px-4 py-2">{t("table.status")}</th>
              <th className="px-4 py-2">{t("table.finished")}</th>
              <th className="px-4 py-2">{t("table.result")}</th>
            </tr>
          </thead>
          <tbody>
            {data.recent_jobs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-stone-500 dark:text-stone-400">
                  {t("jobsEmpty")}
                </td>
              </tr>
            ) : (
              data.recent_jobs.map((job, i) => (
                <tr
                  key={`${job.job_name}-${job.finished_at}-${i}`}
                  className="border-t border-stone-100 dark:border-stone-800"
                >
                  <td className="px-4 py-2 font-mono text-xs text-stone-800 dark:text-stone-200">
                    {job.job_name}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        job.status === "error"
                          ? "text-red-700 dark:text-red-300"
                          : "text-green-700 dark:text-green-300"
                      }
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-stone-500 dark:text-stone-400">
                    {job.finished_at ?? "—"}
                  </td>
                  <td className="max-w-xs truncate px-4 py-2 font-mono text-xs text-stone-600 dark:text-stone-400">
                    {job.error ?? JSON.stringify(job.result)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </PortfolioDisclosure>
    </PortfolioTabShell>
  );
}
