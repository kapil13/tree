"use client";

import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Circle,
  Leaf,
  Map,
  Satellite,
  Sparkles,
  TreePine,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TreesMap } from "@/components/trees-map";
import { DataTrustBanner } from "@/components/data-trust-banner";
import { MetricCard } from "@/components/dashboard/metric-card";
import { CHART_COLORS, fmtCompact, fmtNum, fmtPct, HEALTH_COLORS, timeAgo } from "@/components/dashboard/format";
import { getProgramTheme } from "@/components/registration/program-theme";
import { aiScans, dashboard, trees } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/cn";
import { scopedKey } from "@/lib/query-keys";

function healthBadgeClass(health: string) {
  if (health === "healthy") return "bg-emerald-100 text-emerald-800";
  if (health === "moderate") return "bg-amber-100 text-amber-800";
  if (health === "unhealthy") return "bg-red-100 text-red-800";
  return "bg-stone-100 text-stone-600";
}

function DashboardSkeleton() {
  return (
    <div className="dash-shell mx-auto max-w-6xl space-y-6">
      <div className="dash-hero dash-skeleton h-52" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="dash-skeleton h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="dash-skeleton h-72 rounded-2xl" />
        <div className="dash-skeleton h-72 rounded-2xl" />
      </div>
    </div>
  );
}

export function CitizenDashboard() {
  const { user } = useAuth();
  const theme = getProgramTheme("byot");
  const HeroIcon = theme.icon;
  const firstName = user?.full_name?.split(" ")[0] ?? "there";

  const [dashQ, treesQ, scanQ] = useQueries({
    queries: [
      { queryKey: scopedKey(user, "dashboard"), queryFn: dashboard.get },
      { queryKey: scopedKey(user, "trees-byot-home"), queryFn: () => trees.list({ page_size: 8 }) },
      { queryKey: scopedKey(user, "ai-scan-usage"), queryFn: () => aiScans.usage() },
    ],
  });

  if (dashQ.isLoading || treesQ.isLoading) {
    return <DashboardSkeleton />;
  }

  const dash = dashQ.data;
  const kpi = dash?.kpi;
  const treePage = treesQ.data;
  const recent = treePage?.items ?? [];
  const treeCount = kpi?.total_trees ?? treePage?.total ?? 0;
  const scans = scanQ.data;
  const scansLeft =
    scans?.tier === "byot_metered"
      ? (scans.remaining_complimentary ?? 0) + (scans.purchased_balance ?? 0)
      : null;

  const carbonSeries = (dash?.carbon_growth ?? []).map((p) => ({
    label: p.label,
    kg: p.value,
  }));
  const healthData = (dash?.health_distribution ?? [])
    .filter((p) => p.value > 0)
    .map((p) => ({
      name: p.label,
      value: p.value,
      fill: HEALTH_COLORS[p.label] ?? CHART_COLORS[0],
    }));
  const speciesData = (dash?.species_distribution ?? []).slice(0, 5);

  const steps = [
    { id: "tree", done: treeCount > 0, label: "Tag your first tree", href: "/trees/new" },
    { id: "map", done: treeCount > 0, label: "View trees on the map", href: "/map" },
    {
      id: "scan",
      done: Boolean(recent.some((t) => t.current_health && t.current_health !== "unknown")),
      label: "Run an AI health check",
      href: recent[0] ? `/trees/${recent[0].id}` : "/trees/new",
    },
    { id: "programs", done: false, label: "Explore professional programs", href: "/settings/programs" },
  ];
  const stepsDone = steps.filter((s) => s.done).length;
  const showChecklist = treeCount < 3 || stepsDone < 3;

  return (
    <div className="dash-shell mx-auto max-w-6xl space-y-6">
      <section className="dash-hero">
        <div className="dash-hero-header">
          <div className="dash-live-pill">
            <span className="dash-live-dot" />
            BYOT Public
          </div>
          <h1 className="dash-hero-title mt-4">
            {treeCount > 0 ? "Your green impact" : "Start your grove"}
          </h1>
          <p className="dash-hero-copy">
            {treeCount > 0 ? (
              <>
                Hi {firstName} — you&apos;ve tagged{" "}
                <strong className="text-white">{treeCount}</strong> tree
                {treeCount === 1 ? "" : "s"}
                {kpi && kpi.total_co2e_kg > 0
                  ? ` storing about ${fmtCompact(kpi.total_co2e_kg)} kg CO₂e.`
                  : "."}{" "}
                Keep adding GPS-tagged trees and use complimentary AI scans to track health.
              </>
            ) : (
              <>
                Welcome, {firstName}. Register trees you plant or care for — with map pins, photos,
                and up to 5 free AI health scans.
              </>
            )}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/trees/new" className="btn-primary inline-flex items-center gap-2">
              <Leaf className="h-4 w-4" />
              {treeCount > 0 ? "Add another tree" : "Tag your first tree"}
            </Link>
            <Link
              href="/map"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15"
            >
              <Map className="h-4 w-4" />
              Open map
            </Link>
          </div>
        </div>

        <div className="dash-hero-kpi-row">
          <div className="dash-hero-stat">
            <p className="dash-hero-stat-value">{treeCount}</p>
            <p className="dash-hero-stat-label">Trees tagged</p>
          </div>
          <div className="dash-hero-stat">
            <p className="dash-hero-stat-value">
              {kpi ? fmtCompact(kpi.total_co2e_kg) : "0"}
              <span className="ml-1 text-sm font-medium text-emerald-100/60">kg CO₂e</span>
            </p>
            <p className="dash-hero-stat-label">Estimated storage</p>
          </div>
          <div className="dash-hero-stat">
            <p className="dash-hero-stat-value">{kpi ? fmtPct(kpi.pct_healthy) : "—"}</p>
            <p className="dash-hero-stat-label">Healthy trees</p>
          </div>
          <div className="dash-hero-stat">
            <p className="dash-hero-stat-value">
              {scansLeft !== null ? scansLeft : "∞"}
            </p>
            <p className="dash-hero-stat-label">AI scans available</p>
          </div>
        </div>
      </section>

      <DataTrustBanner variant="strip" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={TreePine}
          label="Trees"
          value={String(treeCount)}
          sub={kpi ? `${fmtPct(kpi.pct_satellite_verified)} satellite checked` : undefined}
          accent="green"
        />
        <MetricCard
          icon={TrendingUp}
          label="Carbon stock (est.)"
          value={kpi ? `${fmtCompact(kpi.total_carbon_kg)} kg` : "0"}
          sub={kpi ? `~${fmtCompact(kpi.annual_sequestration_kg)} kg/yr growth` : undefined}
          accent="lime"
        />
        <MetricCard
          icon={Satellite}
          label="Satellite"
          value={kpi ? fmtPct(kpi.pct_satellite_verified) : "0%"}
          sub="NDVI-verified trees"
          accent="sky"
        />
        <MetricCard
          icon={Sparkles}
          label="AI scans"
          value={
            scans?.tier === "byot_metered"
              ? `${scans.complimentary_used}/${scans.complimentary_limit}`
              : "Included"
          }
          sub={
            scans?.tier === "byot_metered"
              ? `${scans.remaining_complimentary} complimentary left`
              : "Professional programs are unlimited"
          }
          accent="violet"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="dash-panel lg:col-span-2">
          <div className="dash-panel-head">
            <div>
              <h2 className="dash-panel-title">Carbon over time</h2>
              <p className="dash-panel-sub">Estimated biomass growth from your tagged trees</p>
            </div>
          </div>
          {carbonSeries.length > 1 ? (
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={carbonSeries}>
                  <defs>
                    <linearGradient id="byotCarbon" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16a34a" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#a8a29e" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#a8a29e" width={40} />
                  <Tooltip
                    formatter={(v: number) => [`${fmtNum(v, " kg")}`, "Carbon"]}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e7e5e4" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="kg"
                    stroke="#16a34a"
                    fill="url(#byotCarbon)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-4 flex h-56 flex-col items-center justify-center rounded-xl border border-dashed border-stone-200 bg-stone-50 text-center dark:border-stone-700 dark:bg-stone-900/50">
              <HeroIcon className={cn("h-10 w-10", theme.accent)} />
              <p className="mt-3 text-sm text-stone-600 dark:text-stone-300">
                Tag a few trees to see your carbon trajectory chart.
              </p>
              <Link href="/trees/new" className="btn-primary mt-4 inline-flex text-sm">
                Get started
              </Link>
            </div>
          )}
        </div>

        <div className="dash-panel">
          <div className="dash-panel-head">
            <div>
              <h2 className="dash-panel-title">Tree health</h2>
              <p className="dash-panel-sub">From AI and field observations</p>
            </div>
          </div>
          {healthData.length > 0 ? (
            <div className="mt-2 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={healthData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={2}
                  >
                    {healthData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <ul className="mt-2 space-y-1 text-xs text-stone-600">
                {healthData.map((h) => (
                  <li key={h.name} className="flex items-center justify-between">
                    <span className="capitalize">{h.name}</span>
                    <span className="font-medium">{h.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-6 text-sm text-stone-500">Health breakdown appears after your first analysis.</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {showChecklist ? (
          <div className="dash-panel">
            <div className="dash-panel-head">
              <div>
                <h2 className="dash-panel-title">Getting started</h2>
                <p className="dash-panel-sub">
                  {stepsDone} of {steps.length} complete
                </p>
              </div>
            </div>
            <ul className="mt-4 space-y-3">
              {steps.map((step) => (
                <li key={step.id}>
                  <Link
                    href={step.href}
                    className="flex items-center gap-3 rounded-xl border border-stone-100 px-3 py-2.5 transition hover:border-forest-200 hover:bg-forest-50/50 dark:border-stone-800 dark:hover:bg-stone-900"
                  >
                    {step.done ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                    ) : (
                      <Circle className="h-5 w-5 shrink-0 text-stone-300" />
                    )}
                    <span className={cn("text-sm", step.done && "text-stone-500 line-through")}>
                      {step.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="dash-panel">
            <div className="dash-panel-head">
              <div>
                <h2 className="dash-panel-title">Top species</h2>
                <p className="dash-panel-sub">In your personal grove</p>
              </div>
            </div>
            {speciesData.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {speciesData.map((s, i) => (
                  <li key={s.label} className="flex items-center gap-3 text-sm">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    <span className="flex-1 truncate">{s.label}</span>
                    <span className="font-medium text-stone-700">{s.value}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-stone-500">Species mix shows up as you tag more trees.</p>
            )}
          </div>
        )}

        <div className="dash-panel lg:col-span-2">
          <div className="dash-panel-head">
            <div>
              <h2 className="dash-panel-title">Your map</h2>
              <p className="dash-panel-sub">GPS pins for every tagged tree</p>
            </div>
            <Link href="/map" className="dash-link">
              Full map <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-3 overflow-hidden rounded-xl border border-stone-200 dark:border-stone-800">
            <TreesMap height="220px" mapType="hybrid" />
          </div>
        </div>
      </div>

      <div className="dash-panel">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="dash-panel-title">Recent trees</h2>
            <p className="dash-panel-sub">Tap a tree for photos, AI scan, and passport</p>
          </div>
          <Link href="/trees" className="dash-link">
            All trees <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 px-6 py-10 text-center dark:border-stone-700">
            <TreePine className="mx-auto h-10 w-10 text-stone-300" />
            <p className="mt-3 text-sm text-stone-600 dark:text-stone-300">
              No trees yet. Your dashboard will light up once you tag your first one.
            </p>
            <Link href="/trees/new" className="btn-primary mt-4 inline-flex">
              <Camera className="h-4 w-4" />
              Tag your first tree
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recent.map((tree) => (
              <Link
                key={tree.id}
                href={`/trees/${tree.id}`}
                className="group rounded-xl border border-stone-200 p-4 transition hover:border-forest-300 hover:shadow-sm dark:border-stone-800"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-stone-900 group-hover:text-forest-800 dark:text-stone-50">
                    {tree.species_text || "Unknown species"}
                  </p>
                  {tree.satellite_verified ? (
                    <span title="Satellite verified">
                      <Satellite className="h-4 w-4 shrink-0 text-sky-600" aria-hidden />
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 font-mono text-xs text-stone-500">{tree.public_code}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                      healthBadgeClass(tree.current_health),
                    )}
                  >
                    {tree.current_health}
                  </span>
                  {tree.current_carbon_kg > 0 ? (
                    <span className="text-xs text-stone-500">
                      {fmtCompact(tree.current_carbon_kg)} kg C
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-xs text-stone-400">{timeAgo(tree.created_at)}</p>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-[1.25rem] border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50 p-5 dark:border-amber-900/40 dark:from-amber-950/30 dark:to-stone-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
              Need NHAI, ESG, or NGO workflows?
            </p>
            <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-200/80">
              Professional programs unlock unlimited AI scans, team projects, compliance reports,
              and satellite monitoring — billed via work orders, not in-app.
            </p>
          </div>
          <Link href="/settings/programs" className="btn-secondary shrink-0 inline-flex">
            Request program access
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
