"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bug,
  CloudRain,
  Loader2,
  MapPin,
  ShieldAlert,
  Wind,
} from "lucide-react";
import { dashboard } from "@/lib/api";
import { cn } from "@/lib/cn";
import { SEVERITY_STYLES, timeAgo } from "@/components/dashboard/format";

export type ThreatWatchSite = {
  work_area_id: string;
  work_area_name: string;
  project_id?: string | null;
  project_name?: string | null;
  latitude: number;
  longitude: number;
  composite_risk: string;
  pest_control_needed: boolean;
  disease_control_needed: boolean;
  rain_mm_next_48h: number;
  weather_alerts: Array<{
    kind: string;
    severity: string;
    title: string;
    message: string;
    date?: string;
  }>;
  early_warnings: Array<{
    kind: string;
    severity: string;
    title: string;
    message: string;
    source?: string;
    distance_km?: number;
  }>;
  forecast_summary: string;
  recommended_actions: string[];
};

export type ThreatWatchData = {
  generated_at: string;
  summary: {
    sites_monitored: number;
    weather_alerts_count: number;
    pest_high_count: number;
    locust_watch_count: number;
    highest_risk: string;
  };
  sites: ThreatWatchSite[];
};

const RISK_CLASS: Record<string, string> = {
  low: "bg-green-100 text-green-800 border-green-200",
  moderate: "bg-amber-100 text-amber-800 border-amber-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  critical: "bg-rose-100 text-rose-800 border-rose-200",
};

function alertIcon(kind: string) {
  if (kind.includes("rain") || kind === "thunderstorm" || kind === "hail_storm") {
    return CloudRain;
  }
  if (kind === "locust" || kind.includes("pest")) return Bug;
  if (kind === "high_wind") return Wind;
  return AlertTriangle;
}

export function ThreatWatchPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["threat-watch"],
    queryFn: dashboard.threatWatch,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading location-specific weather & pest alerts…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6 text-sm text-stone-600">
        Threat watch unavailable. Add plantation work areas to enable location alerts.
      </div>
    );
  }

  const summary = data.summary;
  const sites = data.sites ?? [];
  const topSites = sites.slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Sites monitored",
            value: summary.sites_monitored,
            icon: MapPin,
            accent: "text-sky-600",
          },
          {
            label: "Weather alerts",
            value: summary.weather_alerts_count,
            icon: CloudRain,
            accent: "text-blue-600",
          },
          {
            label: "High pest risk",
            value: summary.pest_high_count,
            icon: Bug,
            accent: "text-amber-600",
          },
          {
            label: "Locust watch",
            value: summary.locust_watch_count,
            icon: ShieldAlert,
            accent: "text-orange-600",
          },
        ].map((stat) => (
          <div key={stat.label} className="dash-mini-stat">
            <div className="flex items-center gap-2">
              <stat.icon className={cn("h-4 w-4", stat.accent)} />
              <p className="dash-mini-stat-label">{stat.label}</p>
            </div>
            <p className="dash-mini-stat-value">{stat.value}</p>
          </div>
        ))}
      </div>

      {sites.length === 0 ? (
        <div className="dash-empty">
          <MapPin className="h-8 w-8 text-stone-400" />
          <p>No plantation sites yet. Draw work areas on the satellite map to get location alerts.</p>
          <Link href="/satellite" className="btn-primary mt-3">
            Add plantation site
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {topSites.map((site) => {
            const allAlerts = [
              ...site.weather_alerts.map((a) => ({ ...a, group: "weather" as const })),
              ...site.early_warnings.map((a) => ({ ...a, group: "early" as const })),
            ].slice(0, 4);

            const href = site.project_id
              ? `/projects/${site.project_id}`
              : `/satellite`;

            return (
              <div
                key={site.work_area_id}
                className="rounded-xl border border-stone-200 bg-stone-50/60 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Link href={href} className="font-medium text-stone-900 hover:text-forest-700">
                      {site.work_area_name}
                    </Link>
                    {site.project_name && (
                      <p className="text-xs text-stone-500">{site.project_name}</p>
                    )}
                    <p className="mt-1 text-xs text-stone-500">
                      {site.latitude.toFixed(3)}°, {site.longitude.toFixed(3)}° ·{" "}
                      {site.rain_mm_next_48h} mm rain / 48h
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
                      RISK_CLASS[site.composite_risk] ?? RISK_CLASS.low,
                    )}
                  >
                    {site.composite_risk} risk
                  </span>
                </div>

                <p className="mt-2 text-xs text-stone-600">{site.forecast_summary}</p>

                {(site.pest_control_needed || site.disease_control_needed) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {site.pest_control_needed && (
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] text-amber-900">
                        Pest signal
                      </span>
                    )}
                    {site.disease_control_needed && (
                      <span className="rounded bg-rose-100 px-2 py-0.5 text-[11px] text-rose-900">
                        Disease signal
                      </span>
                    )}
                  </div>
                )}

                {allAlerts.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {allAlerts.map((alert, i) => {
                      const Icon = alertIcon(alert.kind);
                      return (
                        <div
                          key={`${alert.kind}-${i}`}
                          className={cn(
                            "flex items-start gap-2 rounded-lg border bg-white px-3 py-2 text-xs",
                            SEVERITY_STYLES[alert.severity] ?? "border-stone-200",
                          )}
                        >
                          <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <div>
                            <p className="font-medium text-stone-800">{alert.title}</p>
                            <p className="mt-0.5 text-stone-600">{alert.message}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-green-700">
                    No active weather or early-warning signals for this site.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {data.generated_at && (
        <p className="text-[11px] text-stone-400">
          Updated {timeAgo(data.generated_at)} · forecasts from plantation GPS centroids
        </p>
      )}
    </div>
  );
}
