"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, Cloud, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { GHG_DEMO_DASHBOARD } from "@/lib/marketing-home-data";

type GhgIntelligenceProps = {
  eyebrow?: string;
  title?: string;
  copy?: string;
  cta?: { label?: string; href?: string };
};

const SOURCE_KEYS: Record<string, string> = {
  "Biomass loss": "sourceBiomass",
  Agriculture: "sourceAgriculture",
  Livestock: "sourceLivestock",
  "Energy / transport": "sourceEnergy",
  "Fire / degradation": "sourceFire",
  Other: "sourceOther",
};

function SiteIntensityGrid({ labels }: { labels: { zoneA: string; zoneB: string; low: string; elevated: string; hotspot: string } }) {
  const cells = [
    0.18, 0.22, 0.28, 0.34, 0.42, 0.38, 0.31, 0.26,
    0.24, 0.36, 0.52, 0.68, 0.74, 0.61, 0.48, 0.33,
    0.29, 0.44, 0.58, 0.82, 0.88, 0.72, 0.55, 0.41,
    0.21, 0.32, 0.46, 0.59, 0.64, 0.51, 0.37, 0.25,
  ];

  function fill(v: number) {
    if (v < 0.35) return "#e7e5e4";
    if (v < 0.5) return "#bbf7d0";
    if (v < 0.65) return "#86efac";
    if (v < 0.8) return "#4ade80";
    return "#15803d";
  }

  return (
    <div className="marketing-ghg-site-grid-wrap">
      <div className="marketing-ghg-site-grid" aria-hidden>
        {cells.map((value, i) => (
          <span key={i} style={{ background: fill(value), opacity: value < 0.35 ? 0.55 : 0.95 }} />
        ))}
      </div>
      <svg viewBox="0 0 360 200" className="marketing-ghg-site-overlay" aria-hidden>
        <polygon
          points="28,156 84,48 168,36 248,62 320,88 332,148 260,172 120,178"
          fill="rgba(20, 83, 45, 0.06)"
          stroke="#14532d"
          strokeWidth="2"
          strokeDasharray="6 4"
        />
      </svg>
      <div className="marketing-ghg-site-badges">
        <span>{labels.zoneA}</span>
        <span className="is-alert">{labels.zoneB}</span>
      </div>
      <ul className="marketing-ghg-site-legend">
        <li><i className="tone-low" /> {labels.low}</li>
        <li><i className="tone-med" /> {labels.elevated}</li>
        <li><i className="tone-high" /> {labels.hotspot}</li>
      </ul>
    </div>
  );
}

export function MarketingGhgIntelligence({
  eyebrow = "Project Carbon Intelligence",
  title = "Project GHG emissions within your boundary",
  copy = "Spatial greenhouse-gas intelligence for planted sites — satellite methane context, source inventory, dispersion, and fusion inside the project area.",
  cta = { label: "Open emissions workspace", href: "/auth?mode=signin&next=/projects" },
}: GhgIntelligenceProps) {
  const t = useTranslations("marketing.home.ghg");
  const demo = GHG_DEMO_DASHBOARD;

  function sourceLabel(label: string) {
    const key = SOURCE_KEYS[label];
    return key ? t(key) : label;
  }

  return (
    <section id="carbon-intelligence" className="marketing-ghg-intel">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="marketing-ghg-intel-head">
          <div>
            <p className="marketing-eyebrow">{eyebrow}</p>
            <h2 className="marketing-section-title font-display">{title}</h2>
            <p className="marketing-section-copy">{copy}</p>
          </div>
          <span className="marketing-demo-badge">{t("demoBadge")}</span>
        </div>

        <div className="marketing-ghg-dashboard">
          <header className="marketing-ghg-dashboard-head">
            <div>
              <p className="marketing-ghg-dashboard-label">{t("projectLabel")}</p>
              <div className="marketing-ghg-dashboard-meta">
                <span>{t("monitoringPeriod")}</span>
                <span>{t("areaMonitored", { ha: demo.areaHa })}</span>
                <span>{t("dataStatus")}</span>
              </div>
            </div>
            <Cloud className="h-8 w-8 text-forest-700" aria-hidden />
          </header>

          <div className="marketing-ghg-dashboard-kpi">
            <div>
              <p>{t("totalEmissions")}</p>
              <strong>{demo.totalTco2e.toLocaleString()} tCO₂e</strong>
              <span className="marketing-ghg-delta">
                <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                {t("deltaVsPrevious", { pct: demo.deltaPct })}
              </span>
            </div>
            <dl className="marketing-ghg-dashboard-indicators">
              <div>
                <dt>{t("emissionIntensity")}</dt>
                <dd>{demo.intensityTco2ePerHa} tCO₂e/ha</dd>
              </div>
              <div>
                <dt>{t("estimatedRemovals")}</dt>
                <dd>{demo.removalsTco2e.toLocaleString()} tCO₂e</dd>
              </div>
              <div>
                <dt>{t("netBalance")}</dt>
                <dd>{demo.netBalanceTco2e.toLocaleString()} tCO₂e</dd>
              </div>
            </dl>
          </div>

          <div className="marketing-ghg-dashboard-split">
            <div className="marketing-ghg-analytics">
              <div className="marketing-ghg-panel">
                <h3>{t("emissionSources")}</h3>
                <ul className="marketing-ghg-sources marketing-ghg-sources--compact">
                  {demo.sources.slice(0, 4).map((source) => (
                    <li key={source.label}>
                      <div className="marketing-ghg-source-row">
                        <span>{sourceLabel(source.label)}</span>
                        <strong>{source.pct}%</strong>
                      </div>
                      <div className="marketing-ghg-source-bar">
                        <i style={{ width: `${source.pct}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="marketing-ghg-panel">
                <h3>{t("trend90Day")}</h3>
                <div className="marketing-ghg-chart">
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={demo.trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="ghgTrend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#15803d" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#15803d" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#57534e" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#57534e" }} axisLine={false} tickLine={false} width={42} />
                      <Tooltip
                        formatter={(value: number) => [`${value.toLocaleString()} tCO₂e`, t("tooltipEmissions")]}
                        contentStyle={{ borderRadius: 10, borderColor: "#d6d3d1", fontSize: 12 }}
                      />
                      <Area type="monotone" dataKey="value" stroke="#166534" strokeWidth={2} fill="url(#ghgTrend)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="marketing-ghg-panel marketing-ghg-panel--site">
              <h3>{t("siteIntensity")}</h3>
              <p className="marketing-ghg-site-lead">{t("siteLead")}</p>
              <SiteIntensityGrid
                labels={{
                  zoneA: t("zoneA"),
                  zoneB: t("zoneB"),
                  low: t("legendLow"),
                  elevated: t("legendElevated"),
                  hotspot: t("legendHotspot"),
                }}
              />
              <p className="marketing-ghg-map-note">{t("mapNote")}</p>
            </div>
          </div>
        </div>

        {cta?.label && cta.href ? (
          <div className="marketing-intel-cta">
            <Link href={cta.href} className="btn-primary">
              {cta.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
