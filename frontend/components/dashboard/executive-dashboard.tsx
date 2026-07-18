"use client";

import Link from "next/link";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  Bird,
  Brain,
  CloudRain,
  FileText,
  Leaf,
  MapPin,
  Radar,
  Satellite,
  ShieldCheck,
  Sparkles,
  Sprout,
  TreePine,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TreesMap } from "@/components/trees-map";
import { MetricCard } from "@/components/dashboard/metric-card";
import { RadialGauge } from "@/components/dashboard/radial-gauge";
import {
  CHART_COLORS,
  fmtCompact,
  fmtNum,
  fmtPct,
  HEALTH_COLORS,
  SEVERITY_STYLES,
  timeAgo,
} from "@/components/dashboard/format";
import {
  alerts,
  api,
  bioacoustic,
  dashboard,
  plantationFences,
  plantingPrograms,
  trees,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/cn";

function DashboardSkeleton() {
  return (
    <div className="dash-shell space-y-6">
      <div className="dash-hero dash-skeleton h-44" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="dash-skeleton h-32 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="dash-skeleton h-80 rounded-2xl lg:col-span-2" />
        <div className="dash-skeleton h-80 rounded-2xl" />
      </div>
    </div>
  );
}

export function ExecutiveDashboard() {
  const { user } = useAuth();

  const [dashQ, alertsQ, treesQ, fencesQ, bioQ, programsQ] = useQueries({
    queries: [
      { queryKey: ["dashboard"], queryFn: dashboard.get },
      { queryKey: ["alerts"], queryFn: () => alerts.list() },
      { queryKey: ["trees-dashboard"], queryFn: () => trees.list({ page_size: 10 }) },
      { queryKey: ["plantation-fences"], queryFn: () => plantationFences.list({ page_size: 20 }) },
      { queryKey: ["bio-summary"], queryFn: () => bioacoustic.summary() },
      { queryKey: ["program-memberships"], queryFn: () => plantingPrograms.memberships() },
    ],
  });

  const { data: reports } = useQuery({
    queryKey: ["reports-dashboard"],
    queryFn: async () => (await api.get("/v1/reports")).data as Array<{
      id: string;
      kind: string;
      status: string;
      created_at: string;
    }>,
  });

  const primaryFenceId = fencesQ.data?.items[0]?.id;
  const { data: ecosystem } = useQuery({
    queryKey: ["ecosystem-health", primaryFenceId],
    queryFn: () => plantationFences.ecosystemHealth(primaryFenceId!),
    enabled: !!primaryFenceId,
  });

  const isLoading =
    dashQ.isLoading || alertsQ.isLoading || treesQ.isLoading || fencesQ.isLoading;

  if (isLoading) return <DashboardSkeleton />;

  if (dashQ.error) {
    return (
      <div className="dash-panel border-rose-200 bg-rose-50 text-rose-800">
        Failed to load dashboard. Check your session and API connectivity.
      </div>
    );
  }

  const data = dashQ.data!;
  const k = data.kpi;
  const alertItems = alertsQ.data ?? [];
  const unreadAlerts = alertItems.filter((a) => !a.is_read);
  const criticalAlerts = alertItems.filter(
    (a) => a.severity === "critical" || a.severity === "high",
  );
  const fenceItems = fencesQ.data?.items ?? [];
  const bio = bioQ.data;
  const enrolledPrograms = programsQ.data?.enrolled ?? [];
  const avgNdvi =
    fenceItems.length > 0
      ? fenceItems.reduce((sum, f) => sum + (f.latest_ndvi_mean ?? 0), 0) / fenceItems.length
      : 0;
  const ndviSeries =
    ecosystem?.ndvi_series?.map((p) => ({
      label: new Date(p.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      ndvi: p.ndvi,
    })) ?? [];
  const taxonData = Object.entries(bio?.taxon_breakdown ?? {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const healthTotal = data.health_distribution.reduce((sum, d) => sum + d.value, 0);
  const greeting = getGreeting();

  return (
    <div className="dash-shell space-y-6">
      <section className="dash-hero">
        <div className="dash-hero-grid">
          <div className="space-y-4">
            <div className="dash-live-pill">
              <span className="dash-live-dot" />
              Live portfolio summary
            </div>
            <div>
              <h1 className="dash-hero-title">
                {greeting}, {user?.full_name?.split(" ")[0] || "steward"}
              </h1>
              <p className="dash-hero-copy">
                Your environmental intelligence command center — carbon, canopy health, biodiversity,
                satellite signals, and compliance evidence in one living view.
              </p>
            </div>
            {enrolledPrograms.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {enrolledPrograms.map((p) => (
                  <span key={p.code} className="dash-program-chip">
                    {p.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="dash-hero-stats">
            <div className="dash-hero-stat">
              <p className="dash-hero-stat-value">{fmtCompact(k.total_trees)}</p>
              <p className="dash-hero-stat-label">Trees in portfolio</p>
            </div>
            <div className="dash-hero-stat">
              <p className="dash-hero-stat-value">{fmtNum(k.total_co2e_kg / 1000, " t")}</p>
              <p className="dash-hero-stat-label">CO₂e stored</p>
            </div>
            <div className="dash-hero-stat">
              <p className="dash-hero-stat-value">{unreadAlerts.length}</p>
              <p className="dash-hero-stat-label">Unread alerts</p>
            </div>
            <div className="dash-hero-stat">
              <p className="dash-hero-stat-value">
                {ecosystem ? ecosystem.ecosystem_health_score : Math.round(k.pct_healthy)}
              </p>
              <p className="dash-hero-stat-label">
                {ecosystem ? "Ecosystem score" : "Health index"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <MetricCard
          icon={TreePine}
          label="Trees registered"
          value={fmtNum(k.total_trees)}
          sub={`${fmtPct(k.pct_healthy)} healthy`}
          accent="green"
        />
        <MetricCard
          icon={Sprout}
          label="Biomass"
          value={fmtNum(k.total_biomass_kg / 1000, " t")}
          sub="Estimated dry matter"
          accent="lime"
        />
        <MetricCard
          icon={CloudRain}
          label="CO₂e sequestered"
          value={fmtNum(k.total_co2e_kg / 1000, " t")}
          sub={`+${fmtNum(k.annual_sequestration_kg / 1000, " t/yr")} projected`}
          trend={{ label: "Growing", positive: true }}
          accent="sky"
        />
        <MetricCard
          icon={Wallet}
          label="Credit potential"
          value={fmtNum(k.lifetime_credits_tco2e, " tCO₂e")}
          sub={`~$${fmtNum(k.estimated_revenue_usd)} est. revenue`}
          accent="violet"
        />
        <MetricCard
          icon={Satellite}
          label="Satellite verified"
          value={fmtPct(k.pct_satellite_verified)}
          sub={`${fenceItems.length} plantation sites`}
          accent="amber"
        />
        <MetricCard
          icon={Bird}
          label="Biodiversity"
          value={fmtNum(bio?.total_species_detected ?? data.bioacoustic?.total_species_detected ?? 0)}
          sub={`${bio?.threatened_species_count ?? 0} threatened species`}
          accent="green"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <div className="dash-panel xl:col-span-5">
          <div className="dash-panel-head">
            <div>
              <h2 className="dash-panel-title">Portfolio vitals</h2>
              <p className="dash-panel-sub">Health coverage and verification posture</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-around gap-6">
            <RadialGauge
              value={k.pct_healthy}
              label="Healthy"
              sublabel="canopy status"
              color="#16a34a"
            />
            <RadialGauge
              value={k.pct_satellite_verified}
              label="Verified"
              sublabel="satellite MRV"
              color="#0ea5e9"
            />
            <RadialGauge
              value={ecosystem?.ecosystem_health_score ?? bio?.avg_health_score ?? 0}
              max={100}
              label="Ecosystem"
              sublabel={ecosystem ? ecosystem.ndvi_trend ?? "composite" : "bioacoustic"}
              color="#84cc16"
            />
          </div>
          {ecosystem?.interpretation && (
            <p className="mt-5 rounded-xl border border-forest-100 bg-forest-50/80 px-4 py-3 text-sm leading-relaxed text-forest-900">
              <Brain className="mr-2 inline h-4 w-4 text-forest-600" />
              {ecosystem.interpretation}
            </p>
          )}
        </div>

        <div className="dash-panel xl:col-span-4">
          <div className="dash-panel-head">
            <div>
              <h2 className="dash-panel-title">Carbon trajectory</h2>
              <p className="dash-panel-sub">6-month stored carbon trend (t)</p>
            </div>
            <TrendingUp className="h-4 w-4 text-forest-600" />
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data.carbon_growth.map((p) => ({
                  ...p,
                  value: +(p.value / 1000).toFixed(2),
                }))}
              >
                <defs>
                  <linearGradient id="dashCarbon" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16a34a" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip
                  formatter={(v: number) => [`${v} t`, "Carbon"]}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e7e5e4",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#15803d"
                  fill="url(#dashCarbon)"
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="dash-panel xl:col-span-3">
          <div className="dash-panel-head">
            <div>
              <h2 className="dash-panel-title">Canopy health mix</h2>
              <p className="dash-panel-sub">{healthTotal} trees assessed</p>
            </div>
          </div>
          <div className="mt-2 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.health_distribution}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={3}
                >
                  {data.health_distribution.map((d) => (
                    <Cell key={d.label} fill={HEALTH_COLORS[d.label] ?? CHART_COLORS[0]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {data.health_distribution.map((d) => {
              const pct = healthTotal ? (d.value / healthTotal) * 100 : 0;
              return (
                <div key={d.label} className="dash-progress-row">
                  <div className="flex items-center justify-between text-xs">
                    <span className="capitalize text-stone-600">{d.label}</span>
                    <span className="font-medium text-stone-800">
                      {d.value} · {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="dash-progress-track">
                    <div
                      className="dash-progress-fill"
                      style={{
                        width: `${pct}%`,
                        background: HEALTH_COLORS[d.label] ?? CHART_COLORS[0],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="dash-panel">
          <div className="dash-panel-head">
            <div>
              <h2 className="dash-panel-title">Satellite intelligence</h2>
              <p className="dash-panel-sub">
                NDVI across {fenceItems.length || "no"} plantation {fenceItems.length === 1 ? "site" : "sites"}
              </p>
            </div>
            <Link href="/satellite" className="dash-link">
              Open satellite <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {ndviSeries.length > 0 ? (
            <div className="mt-4 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ndviSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <Tooltip
                    formatter={(v: number) => [v.toFixed(3), "NDVI"]}
                    contentStyle={{ borderRadius: 12, fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ndvi"
                    stroke="#0ea5e9"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#0ea5e9" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="dash-empty mt-4">
              <Radar className="h-8 w-8 text-stone-400" />
              <p>No NDVI time series yet. Draw a plantation fence and run a satellite scan.</p>
              <Link href="/satellite" className="btn-primary mt-3">
                Configure satellite
              </Link>
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="dash-mini-stat">
              <p className="dash-mini-stat-label">Mean NDVI</p>
              <p className="dash-mini-stat-value">{avgNdvi ? avgNdvi.toFixed(3) : "—"}</p>
            </div>
            <div className="dash-mini-stat">
              <p className="dash-mini-stat-label">Sites monitored</p>
              <p className="dash-mini-stat-value">{fenceItems.length}</p>
            </div>
            <div className="dash-mini-stat">
              <p className="dash-mini-stat-label">NDVI trend</p>
              <p className="dash-mini-stat-value capitalize">{ecosystem?.ndvi_trend ?? "—"}</p>
            </div>
          </div>

          {fenceItems.length > 0 && (
            <div className="mt-4 space-y-2">
              {fenceItems.slice(0, 4).map((fence) => (
                <div key={fence.id} className="dash-list-row">
                  <div>
                    <p className="font-medium text-stone-800">{fence.name}</p>
                    <p className="text-xs text-stone-500">
                      {fence.area_ha ? `${fence.area_ha.toFixed(1)} ha` : "Area pending"}
                      {fence.last_satellite_at ? ` · ${timeAgo(fence.last_satellite_at)}` : ""}
                    </p>
                  </div>
                  <span className="dash-ndvi-badge">
                    NDVI {fence.latest_ndvi_mean?.toFixed(2) ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dash-panel">
          <div className="dash-panel-head">
            <div>
              <h2 className="dash-panel-title">Biodiversity pulse</h2>
              <p className="dash-panel-sub">Bioacoustic richness and taxon signals</p>
            </div>
            <Link href="/bioacoustic" className="dash-link">
              Record soundscape <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Recordings", bio?.total_recordings ?? data.bioacoustic?.total_recordings ?? 0],
              ["Analyzed", bio?.analyzed_recordings ?? 0],
              ["Shannon H′", (bio?.avg_shannon_index ?? data.bioacoustic?.avg_shannon_index ?? 0).toFixed(2)],
              ["Threatened", bio?.threatened_species_count ?? 0],
            ].map(([label, value]) => (
              <div key={label} className="dash-mini-stat">
                <p className="dash-mini-stat-label">{label}</p>
                <p className="dash-mini-stat-value">{value}</p>
              </div>
            ))}
          </div>

          {taxonData.length > 0 ? (
            <div className="mt-5 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={taxonData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(148,163,184,0.2)" />
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {taxonData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="dash-empty mt-4">
              <Bird className="h-8 w-8 text-stone-400" />
              <p>Upload ambient recordings to unlock biodiversity analytics.</p>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-12">
        <div className="dash-panel lg:col-span-5">
          <div className="dash-panel-head">
            <div>
              <h2 className="dash-panel-title">Operations & alerts</h2>
              <p className="dash-panel-sub">
                {unreadAlerts.length} unread · {criticalAlerts.length} high priority
              </p>
            </div>
            <Link href="/alerts" className="dash-link">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {alertItems.length === 0 ? (
            <div className="dash-empty mt-4">
              <ShieldCheck className="h-8 w-8 text-forest-500" />
              <p>All clear — no active alerts in your portfolio.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {alertItems.slice(0, 6).map((alert) => (
                <div
                  key={alert.id}
                  className={cn("dash-alert-row", !alert.is_read && "dash-alert-row--unread")}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("dash-alert-icon", SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.info)}>
                      {alert.severity === "critical" || alert.severity === "high" ? (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      ) : (
                        <Bell className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-stone-900">{alert.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-stone-500">{alert.message}</p>
                      <p className="mt-1 text-[11px] text-stone-400">{timeAgo(alert.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dash-panel lg:col-span-4">
          <div className="dash-panel-head">
            <div>
              <h2 className="dash-panel-title">Planted species leaderboard</h2>
              <p className="dash-panel-sub">Top performers in your registry</p>
            </div>
            <Link href="/trees" className="dash-link">
              All trees <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {data.species_distribution.map((species, i) => {
              const max = data.species_distribution[0]?.value || 1;
              const pct = (species.value / max) * 100;
              return (
                <div key={species.label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="truncate font-medium text-stone-800">{species.label}</span>
                    <span className="text-forest-700">{species.value}</span>
                  </div>
                  <div className="dash-progress-track">
                    <div
                      className="dash-progress-fill"
                      style={{
                        width: `${pct}%`,
                        background: CHART_COLORS[i % CHART_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {data.species_distribution.length === 0 && (
              <div className="dash-empty">
                <Leaf className="h-8 w-8 text-stone-400" />
                <p>Register your first tree to populate species analytics.</p>
                <Link href="/trees/new" className="btn-primary mt-3">
                  Add tree
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="dash-panel lg:col-span-3">
          <div className="dash-panel-head">
            <div>
              <h2 className="dash-panel-title">Quick actions</h2>
              <p className="dash-panel-sub">Move from insight to action</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            {[
              { href: "/trees/new", icon: Sprout, label: "Register tree", sub: "Guided wizard" },
              { href: "/satellite", icon: Satellite, label: "Satellite scan", sub: "NDVI & health" },
              { href: "/bioacoustic", icon: Bird, label: "Record biodiversity", sub: "Soundscape" },
              { href: "/assistant", icon: Sparkles, label: "Ask AI analyst", sub: "Carbon & tips" },
              { href: "/reports", icon: FileText, label: "Generate report", sub: "PDF / Excel" },
              { href: "/map", icon: MapPin, label: "Open map", sub: "Spatial view" },
            ].map((action) => (
              <Link key={action.href} href={action.href} className="dash-action-row">
                <div className="dash-action-icon">
                  <action.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-900">{action.label}</p>
                  <p className="text-xs text-stone-500">{action.sub}</p>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 text-stone-400" />
              </Link>
            ))}
          </div>

          {reports && reports.length > 0 && (
            <div className="mt-5 border-t border-stone-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Recent reports
              </p>
              <div className="mt-2 space-y-2">
                {reports.slice(0, 3).map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-xs">
                    <span className="capitalize text-stone-700">{r.kind}</span>
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-600">{r.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-12">
        <div className="dash-panel lg:col-span-8">
          <div className="dash-panel-head">
            <div>
              <h2 className="dash-panel-title">Spatial overview</h2>
              <p className="dash-panel-sub">Live map of registered trees by health status</p>
            </div>
            <Link href="/map" className="dash-link">
              Full map <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-stone-200">
            <TreesMap height="320px" mapType="hybrid" />
          </div>
        </div>

        <div className="dash-panel lg:col-span-4">
          <div className="dash-panel-head">
            <div>
              <h2 className="dash-panel-title">Recent registrations</h2>
              <p className="dash-panel-sub">Latest trees added to portfolio</p>
            </div>
            <Activity className="h-4 w-4 text-forest-600" />
          </div>
          <div className="mt-4 space-y-2">
            {(treesQ.data?.items ?? []).map((tree) => (
              <Link key={tree.id} href={`/trees/${tree.id}`} className="dash-list-row dash-list-row--link">
                <div>
                  <p className="font-medium text-stone-800">{tree.public_code}</p>
                  <p className="text-xs text-stone-500">
                    {tree.species_text || "Species pending"} · {timeAgo(tree.created_at)}
                  </p>
                </div>
                <span className={cn("dash-health-badge", `dash-health-badge--${tree.current_health}`)}>
                  {tree.current_health}
                </span>
              </Link>
            ))}
            {(treesQ.data?.items?.length ?? 0) === 0 && (
              <div className="dash-empty">
                <TreePine className="h-8 w-8 text-stone-400" />
                <p>No trees yet. Start your living portfolio today.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
