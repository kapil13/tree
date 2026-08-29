"use client";

import Link from "next/link";
import { ArrowRight, Cloud, MapPin, TrendingUp } from "lucide-react";
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

function HotspotMap() {
  return (
    <svg viewBox="0 0 320 180" className="marketing-ghg-hotspot-map" aria-hidden>
      <rect width="320" height="180" rx="12" fill="#f5faf7" />
      <path
        d="M36 132 C72 92 108 118 144 84 C180 58 216 96 252 72 L284 58"
        fill="none"
        stroke="#166534"
        strokeWidth="2"
        strokeDasharray="5 4"
      />
      <circle cx="118" cy="96" r="28" fill="#15803d" opacity="0.12" />
      <circle cx="118" cy="96" r="14" fill="#15803d" opacity="0.28" />
      <circle cx="118" cy="96" r="5" fill="#14532d" />
      <circle cx="206" cy="78" r="18" fill="#b45309" opacity="0.18" />
      <circle cx="206" cy="78" r="7" fill="#b45309" />
      <text x="16" y="24" fill="#14532d" fontSize="11" fontFamily="ui-sans-serif, system-ui" fontWeight="700">
        Emission hotspots
      </text>
      <text x="16" y="164" fill="#57534e" fontSize="10" fontFamily="ui-sans-serif, system-ui">
        Demo project boundary · TROPOMI + dispersion fusion in workspace
      </text>
    </svg>
  );
}

export function MarketingGhgIntelligence({
  eyebrow = "Project Carbon Intelligence",
  title = "Project GHG emissions within your boundary",
  copy = "Spatial greenhouse-gas intelligence for planted sites — satellite methane context, source inventory, dispersion, and fusion inside the project area.",
  cta = { label: "Open emissions workspace", href: "/auth?mode=signin&next=/projects" },
}: GhgIntelligenceProps) {
  const demo = GHG_DEMO_DASHBOARD;

  return (
    <section id="carbon-intelligence" className="marketing-ghg-intel">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="marketing-ghg-intel-head">
          <div>
            <p className="marketing-eyebrow">{eyebrow}</p>
            <h2 className="marketing-section-title font-display">{title}</h2>
            <p className="marketing-section-copy">{copy}</p>
          </div>
          <span className="marketing-demo-badge">Sample dashboard — project data loads after sign-in</span>
        </div>

        <div className="marketing-ghg-dashboard">
          <header className="marketing-ghg-dashboard-head">
            <div>
              <p className="marketing-ghg-dashboard-label">{demo.projectLabel}</p>
              <div className="marketing-ghg-dashboard-meta">
                <span>{demo.monitoringPeriod}</span>
                <span>{demo.areaHa} ha monitored</span>
                <span>{demo.dataStatus}</span>
              </div>
            </div>
            <Cloud className="h-8 w-8 text-forest-700" aria-hidden />
          </header>

          <div className="marketing-ghg-dashboard-kpi">
            <div>
              <p>Total project emissions</p>
              <strong>{demo.totalTco2e.toLocaleString()} tCO₂e</strong>
              <span className="marketing-ghg-delta">
                <TrendingUp className="h-3.5 w-3.5" aria-hidden />+{demo.deltaPct}% vs previous period
              </span>
            </div>
            <dl className="marketing-ghg-dashboard-indicators">
              <div>
                <dt>Emission intensity</dt>
                <dd>{demo.intensityTco2ePerHa} tCO₂e/ha</dd>
              </div>
              <div>
                <dt>Estimated removals</dt>
                <dd>{demo.removalsTco2e.toLocaleString()} tCO₂e</dd>
              </div>
              <div>
                <dt>Net GHG balance</dt>
                <dd>{demo.netBalanceTco2e.toLocaleString()} tCO₂e</dd>
              </div>
            </dl>
          </div>

          <div className="marketing-ghg-dashboard-grid">
            <div className="marketing-ghg-panel">
              <h3>Emission source breakdown</h3>
              <ul className="marketing-ghg-sources">
                {demo.sources.map((source) => (
                  <li key={source.label}>
                    <div className="marketing-ghg-source-row">
                      <span>{source.label}</span>
                      <strong>{source.tco2e} tCO₂e</strong>
                    </div>
                    <div className="marketing-ghg-source-bar">
                      <i style={{ width: `${source.pct}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="marketing-ghg-panel">
              <h3>Emission trend</h3>
              <div className="marketing-ghg-chart">
                <ResponsiveContainer width="100%" height={220}>
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
                      formatter={(value: number) => [`${value.toLocaleString()} tCO₂e`, "Emissions"]}
                      contentStyle={{ borderRadius: 10, borderColor: "#d6d3d1", fontSize: 12 }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#166534" strokeWidth={2} fill="url(#ghgTrend)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="marketing-ghg-panel marketing-ghg-panel--map">
              <h3>
                <MapPin className="h-4 w-4" aria-hidden />
                Spatial hotspot view
              </h3>
              <HotspotMap />
              <p className="marketing-ghg-map-note">
                {/* TODO: reuse EmissionsPlumeMap when a public demo project + auth-free preview route exists. */}
                Signed-in projects overlay TROPOMI scans, registered sources, and dispersion contours on the work-area map.
              </p>
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
