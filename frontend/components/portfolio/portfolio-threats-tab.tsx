"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Bug,
  CloudRain,
  Droplets,
  Flame,
  Globe,
  Leaf,
  ShieldAlert,
} from "lucide-react";
import { intelligence as intelligenceApi } from "@/lib/api";
import {
  alertsHref,
  earlyWarningInboxKind,
  portfolioAlertKindHref,
  satelliteFenceHref,
} from "@/lib/alerts-links";
import { portfolioMonitoringHref } from "@/lib/portfolio-health-links";
import { PortfolioKpiCard } from "./portfolio-kpi-card";
import { PortfolioTabBanner } from "./portfolio-tab-banner";
import { PortfolioKpiGrid } from "./portfolio-kpi-grid";
import { PortfolioSection } from "./portfolio-section";
import { PortfolioTabError, PortfolioTabLoading } from "./portfolio-tab-state";
import { PortfolioTabShell } from "./portfolio-tab-shell";

const RISK_CLASS: Record<string, string> = {
  low: "text-green-700 bg-green-50 dark:text-green-300 dark:bg-green-950/50",
  moderate: "text-amber-800 bg-amber-50 dark:text-amber-200 dark:bg-amber-950/50",
  high: "text-orange-800 bg-orange-50 dark:text-orange-200 dark:bg-orange-950/50",
  critical: "text-red-800 bg-red-50 dark:text-red-200 dark:bg-red-950/50",
};

const INTEGRATION_LABEL: Record<string, string> = {
  open_meteo: "Open-Meteo",
  gbif: "GBIF",
  sentinel_hub: "Sentinel Hub",
  bhoonidhi: "Bhoonidhi",
  iucn: "IUCN Red List",
  firms_fire: "NASA FIRMS",
  locust_feed: "FAO locust feed",
};

function integrationStatusLabel(key: string, row: { status?: string; mode?: string }) {
  if (key === "firms_fire") {
    return row.mode === "live" ? "Live fire detections" : "Seasonal fallback (set FIRMS_MAP_KEY)";
  }
  if (key === "locust_feed") {
    return row.mode === "live" ? "Live locust observations" : "Seasonal corridor model";
  }
  return row.status ?? "unknown";
}

function matchesProject(projectId: string | null | undefined, itemProjectId?: string | null) {
  if (!projectId) return true;
  return itemProjectId === projectId;
}

function activeHazardCount(
  sites: Array<{
    fire_watch?: { risk_level?: string | null } | null;
    flood_extent_watch?: { risk_level?: string | null } | null;
  }>,
  field: "fire_watch" | "flood_extent_watch",
) {
  return sites.filter((site) => {
    const risk = site[field]?.risk_level;
    return risk != null && risk !== "none";
  }).length;
}

export function PortfolioThreatsTab({
  projectId,
  projectName,
}: {
  projectId?: string | null;
  projectName?: string | null;
}) {
  const t = useTranslations("portfolioTabs.threats");
  const [slowLoad, setSlowLoad] = useState(false);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["intelligence-summary"],
    queryFn: () => intelligenceApi.summary(12, { fast: true }),
    retry: 1,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!isLoading && !isFetching) {
      setSlowLoad(false);
      return;
    }
    const timer = window.setTimeout(() => setSlowLoad(true), 8000);
    return () => window.clearTimeout(timer);
  }, [isLoading, isFetching]);

  if (isLoading || (isFetching && !data)) {
    return <PortfolioTabLoading hint={slowLoad ? t("loadingHint") : undefined} />;
  }

  if (error || !data) {
    return <PortfolioTabError onRetry={() => void refetch()} />;
  }

  const integrations = data.integrations?.integrations ?? {};
  const integrationStatus = data.integrations?.status ?? "unknown";
  const fusion = data.satellite_fusion;

  const weatherAlerts = data.weather_alerts.filter((item) =>
    matchesProject(projectId, item.project_id),
  );
  const pestHotspots = data.pest_hotspots.filter((site) =>
    matchesProject(projectId, site.project_id),
  );
  const earlyWarnings = data.early_warnings.filter((w) =>
    matchesProject(projectId, w.project_id),
  );
  const threatSites = data.threat_sites.filter((site) =>
    matchesProject(projectId, site.project_id),
  );

  const fireWatchCount = projectId
    ? activeHazardCount(threatSites, "fire_watch")
    : (data.threat_summary.fire_watch_count ?? 0);
  const floodWatchCount = projectId
    ? activeHazardCount(threatSites, "flood_extent_watch")
    : (data.threat_summary.flood_extent_watch_count ?? 0);

  const fusionSummary =
    fusion?.summary &&
    t("fusion.summary", {
      dual: fusion.summary.aligned_dual_source,
      stale: fusion.summary.stale_sentinel_scans,
      sar:
        fusion.summary.sar_avg_forest_integrity != null
          ? t("fusion.sarSuffix", { score: fusion.summary.sar_avg_forest_integrity })
          : "",
    });

  return (
    <PortfolioTabShell tab="threats" projectId={projectId} projectName={projectName}>
      {isFetching ? (
        <p className="text-xs text-stone-400 dark:text-stone-500">{t("refreshing")}</p>
      ) : null}

      <PortfolioKpiGrid>
        <PortfolioKpiCard
          icon={ShieldAlert}
          label={t("kpi.highestRisk")}
          value={data.highest_risk}
          warn={data.highest_risk !== "low"}
        />
        <PortfolioKpiCard
          icon={CloudRain}
          label={t("kpi.weatherAlerts")}
          value={String(data.weather_alert_count)}
          warn={data.weather_alert_count > 0}
        />
        <PortfolioKpiCard
          icon={Flame}
          label={t("kpi.fireWatch")}
          value={String(fireWatchCount)}
          warn={fireWatchCount > 0}
          href={alertsHref({ kind: "fire_alert" })}
        />
        <PortfolioKpiCard
          icon={Droplets}
          label={t("kpi.floodExtent")}
          value={String(floodWatchCount)}
          warn={floodWatchCount > 0}
          href={alertsHref({ kind: "flood_extent_alert" })}
        />
        <PortfolioKpiCard
          icon={Bug}
          label={t("kpi.pestSites")}
          value={String(data.pest_high_count)}
          warn={data.pest_high_count > 0}
        />
        <PortfolioKpiCard
          icon={Leaf}
          label={t("kpi.speciesBaselines")}
          value={String(data.biodiversity?.unique_species_in_latest_snapshots ?? 0)}
        />
      </PortfolioKpiGrid>

      {fusion?.summary ? (
        <PortfolioTabBanner
          variant="info"
          title={t("fusion.title")}
          description={fusionSummary}
          action={{
            label: t("fusion.viewMonitoring"),
            href: portfolioMonitoringHref(projectId),
          }}
        />
      ) : null}

      <PortfolioSection icon={Globe} title={t("integrations")}>
        <div className="mb-3 flex justify-end">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              integrationStatus === "ok"
                ? "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-200"
                : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
            }`}
          >
            {integrationStatus}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(integrations).map(([key, info]) => {
            const row = info as { status?: string; error?: string | null };
            const ok =
              row.status === "ok" || row.status === "configured" || row.status === "optional";
            return (
              <div
                key={key}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  ok
                    ? "border-stone-200 dark:border-stone-700"
                    : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40"
                }`}
              >
                <p className="font-medium">{INTEGRATION_LABEL[key] ?? key}</p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {integrationStatusLabel(key, row)}
                </p>
              </div>
            );
          })}
        </div>
      </PortfolioSection>

      {weatherAlerts.length > 0 ? (
        <PortfolioSection title={t("weatherAlerts")}>
          <ul className="space-y-2 text-sm">
            {weatherAlerts.map((item, i) => (
              <li
                key={`${item.work_area_id}-${i}`}
                className="rounded-lg bg-stone-50 px-3 py-2 dark:bg-stone-900/50"
              >
                <span className="font-medium">{item.work_area_name}</span>
                {item.project_id ? (
                  <>
                    {" · "}
                    <Link
                      href={`/projects/${item.project_id}`}
                      className="text-forest-800 hover:underline dark:text-forest-300"
                    >
                      {t("viewProject")}
                    </Link>
                  </>
                ) : null}
                <p className="mt-1 text-stone-700 dark:text-stone-300">
                  [{item.alert.severity?.toUpperCase()}] {item.alert.title}: {item.alert.message}
                </p>
              </li>
            ))}
          </ul>
        </PortfolioSection>
      ) : null}

      {pestHotspots.length > 0 ? (
        <PortfolioSection flush title={t("pestHotspots")}>
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500 dark:bg-stone-900/50 dark:text-stone-400">
              <tr>
                <th className="px-4 py-2">{t("table.workArea")}</th>
                <th className="px-4 py-2">{t("table.risk")}</th>
                <th className="px-4 py-2">{t("table.pest")}</th>
                <th className="px-4 py-2">{t("table.rain48h")}</th>
              </tr>
            </thead>
            <tbody>
              {pestHotspots.map((site) => (
                <tr key={site.work_area_id} className="border-t border-stone-100 dark:border-stone-800">
                  <td className="px-4 py-2 font-medium">{site.work_area_name}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        RISK_CLASS[site.composite_risk ?? "low"] ?? RISK_CLASS.low
                      }`}
                    >
                      {site.composite_risk}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {site.pest_control_needed ? "Yes" : site.disease_control_needed ? "Disease" : "—"}
                  </td>
                  <td className="px-4 py-2">{site.rain_mm_next_48h?.toFixed(0) ?? "—"} mm</td>
                </tr>
              ))}
            </tbody>
          </table>
        </PortfolioSection>
      ) : null}

      {earlyWarnings.length > 0 ? (
        <PortfolioSection title={t("earlyWarnings")}>
          <ul className="space-y-2 text-sm">
            {earlyWarnings.map((w, i) => {
              const inboxKind = earlyWarningInboxKind(w.kind);
              return (
                <li
                  key={`${w.work_area_id}-${w.kind}-${i}`}
                  className="rounded-lg border border-stone-200 bg-stone-50/80 px-3 py-2 dark:border-stone-700 dark:bg-stone-900/40"
                >
                  <div className="flex gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {w.work_area_name}: {w.title}
                      </p>
                      <p className="text-stone-600 dark:text-stone-400">{w.message}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {w.work_area_id ? (
                          <Link
                            href={satelliteFenceHref(w.work_area_id)}
                            className="text-forest-800 hover:underline dark:text-forest-300"
                          >
                            {t("openWorkArea")}
                          </Link>
                        ) : null}
                        {inboxKind ? (
                          <Link
                            href={portfolioAlertKindHref(inboxKind)}
                            className="text-forest-800 hover:underline dark:text-forest-300"
                          >
                            {t("viewAlerts")}
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </PortfolioSection>
      ) : null}

      <PortfolioSection flush title={t("threatWatch")}>
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500 dark:bg-stone-900/50 dark:text-stone-400">
            <tr>
              <th className="px-4 py-2">{t("table.workArea")}</th>
              <th className="px-4 py-2">{t("table.project")}</th>
              <th className="px-4 py-2">{t("table.risk")}</th>
              <th className="px-4 py-2">{t("table.trees")}</th>
              <th className="px-4 py-2">{t("table.ndviTrend")}</th>
            </tr>
          </thead>
          <tbody>
            {threatSites.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-stone-500 dark:text-stone-400">
                  {t("threatWatchEmpty")}
                </td>
              </tr>
            ) : (
              threatSites.map((site) => (
                <tr key={site.work_area_id} className="border-t border-stone-100 dark:border-stone-800">
                  <td className="px-4 py-2 font-medium">{site.work_area_name}</td>
                  <td className="px-4 py-2">
                    {site.project_id ? (
                      <Link
                        href={`/projects/${site.project_id}`}
                        className="text-forest-800 hover:underline dark:text-forest-300"
                      >
                        {site.project_name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        RISK_CLASS[site.composite_risk] ?? RISK_CLASS.low
                      }`}
                    >
                      {site.composite_risk}
                    </span>
                  </td>
                  <td className="px-4 py-2">{site.tree_count}</td>
                  <td className="px-4 py-2">{site.ndvi_trend ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </PortfolioSection>
    </PortfolioTabShell>
  );
}
