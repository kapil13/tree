"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bug,
  CloudRain,
  Globe,
  Leaf,
  RefreshCw,
  Satellite,
  ShieldAlert,
} from "lucide-react";
import { intelligence as intelligenceApi } from "@/lib/api";

const RISK_CLASS: Record<string, string> = {
  low: "text-green-700 bg-green-50",
  moderate: "text-amber-800 bg-amber-50",
  high: "text-orange-800 bg-orange-50",
  critical: "text-red-800 bg-red-50",
};

const INTEGRATION_LABEL: Record<string, string> = {
  open_meteo: "Open-Meteo",
  gbif: "GBIF",
  sentinel_hub: "Sentinel Hub",
  bhoonidhi: "Bhoonidhi",
  iucn: "IUCN Red List",
};

export default function IntelligencePage() {
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
    return (
      <div className="space-y-2">
        <p className="text-sm text-stone-500">Loading intelligence hub…</p>
        {slowLoad && (
          <p className="text-xs text-stone-400">
            Fetching weather and threat data for your work areas — this can take up to 30 seconds.
          </p>
        )}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-700">
          Could not load intelligence summary. The API may still be starting after deploy.
        </p>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-50"
          onClick={() => refetch()}
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  const integrations = data.integrations?.integrations ?? {};
  const integrationStatus = data.integrations?.status ?? "unknown";
  const fusion = data.satellite_fusion;
  const fusionSites = fusion?.sites ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Intelligence</h1>
        <p className="mt-1 text-sm text-stone-600">
          Weather, pest, threat watch, and biodiversity signals fused across your portfolio.
        </p>
        {isFetching && (
          <p className="mt-1 text-xs text-stone-400">Refreshing…</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={ShieldAlert}
          label="Highest portfolio risk"
          value={data.highest_risk}
          warn={data.highest_risk !== "low"}
        />
        <KpiCard
          icon={CloudRain}
          label="Weather alerts"
          value={String(data.weather_alert_count)}
          warn={data.weather_alert_count > 0}
        />
        <KpiCard
          icon={Bug}
          label="High pest-risk sites"
          value={String(data.pest_high_count)}
          warn={data.pest_high_count > 0}
        />
        <KpiCard
          icon={Leaf}
          label="Species in baselines"
          value={String(data.biodiversity?.unique_species_in_latest_snapshots ?? 0)}
        />
      </div>

      {fusion?.summary && (
        <section className="card overflow-hidden p-0">
          <div className="flex items-center gap-2 border-b border-stone-200 px-4 py-3">
            <Satellite className="h-4 w-4 text-stone-500" />
            <h2 className="font-medium">Sentinel + Bhoonidhi fusion</h2>
            <span className="ml-auto text-xs text-stone-500">
              {fusion.summary.aligned_dual_source} dual-source · {fusion.summary.stale_sentinel_scans}{" "}
              stale NDVI
            </span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
              <tr>
                <th className="px-4 py-2">Work area</th>
                <th className="px-4 py-2">Fusion</th>
                <th className="px-4 py-2">NDVI</th>
                <th className="px-4 py-2">Trend</th>
                <th className="px-4 py-2">Bhoonidhi scenes</th>
                <th className="px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {fusionSites.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-stone-500">
                    No project work areas yet. Link plantation fences to projects for fusion.
                  </td>
                </tr>
              ) : (
                fusionSites.map((site) => (
                  <tr key={site.work_area_id} className="border-t border-stone-100">
                    <td className="px-4 py-2 font-medium">{site.work_area_name}</td>
                    <td className="px-4 py-2 capitalize">{site.fusion_status.replace(/_/g, " ")}</td>
                    <td className="px-4 py-2">
                      {site.sentinel.latest_ndvi != null ? site.sentinel.latest_ndvi.toFixed(2) : "—"}
                      {site.sentinel.days_since_scan != null && (
                        <span className="ml-1 text-xs text-stone-500">
                          ({site.sentinel.days_since_scan}d)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 capitalize">{site.sentinel.ndvi_trend}</td>
                    <td className="px-4 py-2">{site.bhoonidhi.scenes_available ?? 0}</td>
                    <td className="max-w-xs truncate px-4 py-2 text-xs text-stone-600">
                      {site.recommended_action}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      )}

      <section className="card">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-stone-500" />
          <h2 className="text-lg font-medium">Data integrations</h2>
          <span
            className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${
              integrationStatus === "ok" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
            }`}
          >
            {integrationStatus}
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(integrations).map(([key, info]) => {
            const row = info as { status?: string; reachable?: boolean; error?: string | null };
            const ok = row.status === "ok" || row.status === "configured" || row.status === "optional";
            return (
              <div
                key={key}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  ok ? "border-stone-200" : "border-amber-200 bg-amber-50"
                }`}
              >
                <p className="font-medium">{INTEGRATION_LABEL[key] ?? key}</p>
                <p className="text-xs text-stone-500">{row.status ?? "unknown"}</p>
                {row.error && <p className="mt-1 text-xs text-amber-800">{row.error}</p>}
              </div>
            );
          })}
        </div>
      </section>

      {data.weather_alerts.length > 0 && (
        <section className="card">
          <h2 className="text-lg font-medium">Weather alerts</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {data.weather_alerts.map((item, i) => (
              <li key={`${item.work_area_id}-${i}`} className="rounded-lg bg-stone-50 px-3 py-2">
                <span className="font-medium">{item.work_area_name}</span>
                {item.project_id && (
                  <>
                    {" · "}
                    <Link href={`/projects/${item.project_id}`} className="text-forest-800 hover:underline">
                      View project
                    </Link>
                  </>
                )}
                <p className="mt-1 text-stone-700">
                  [{item.alert.severity?.toUpperCase()}] {item.alert.title}: {item.alert.message}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.pest_hotspots.length > 0 && (
        <section className="card overflow-hidden p-0">
          <div className="border-b border-stone-200 px-4 py-3">
            <h2 className="font-medium">Pest & weather hotspots</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
              <tr>
                <th className="px-4 py-2">Work area</th>
                <th className="px-4 py-2">Risk</th>
                <th className="px-4 py-2">Pest</th>
                <th className="px-4 py-2">Rain 48h</th>
                <th className="px-4 py-2">Forecast</th>
              </tr>
            </thead>
            <tbody>
              {data.pest_hotspots.map((site) => (
                <tr key={site.work_area_id} className="border-t border-stone-100">
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
                  <td className="max-w-xs truncate px-4 py-2 text-stone-600">
                    {site.forecast_summary || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {data.early_warnings.length > 0 && (
        <section className="card">
          <h2 className="text-lg font-medium">Early warnings</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {data.early_warnings.map((w, i) => (
              <li key={`${w.work_area_id}-${w.kind}-${i}`} className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div>
                  <p className="font-medium">
                    {w.work_area_name}: {w.title}
                  </p>
                  <p className="text-stone-600">{w.message}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card overflow-hidden p-0">
        <div className="border-b border-stone-200 px-4 py-3">
          <h2 className="font-medium">Threat watch sites</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
            <tr>
              <th className="px-4 py-2">Work area</th>
              <th className="px-4 py-2">Project</th>
              <th className="px-4 py-2">Risk</th>
              <th className="px-4 py-2">Trees</th>
              <th className="px-4 py-2">NDVI trend</th>
            </tr>
          </thead>
          <tbody>
            {data.threat_sites.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-stone-500">
                  No work areas with threat watch data yet.
                </td>
              </tr>
            ) : (
              data.threat_sites.map((site) => (
                <tr key={site.work_area_id} className="border-t border-stone-100">
                  <td className="px-4 py-2 font-medium">{site.work_area_name}</td>
                  <td className="px-4 py-2">
                    {site.project_id ? (
                      <Link href={`/projects/${site.project_id}`} className="text-forest-800 hover:underline">
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
      </section>

      <p className="text-xs text-stone-500">
        Generated {data.generated_at ? new Date(data.generated_at).toLocaleString() : "—"} ·{" "}
        {data.biodiversity?.work_areas_with_snapshots ?? 0} work areas with GBIF/IUCN baselines
      </p>
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
        <p className="text-2xl font-semibold capitalize text-stone-900">{value}</p>
      </div>
    </div>
  );
}
