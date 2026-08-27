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
  FileText,
  Leaf,
  MapPin,
  Radar,
  Satellite,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Sprout,
  TreePine,
  TrendingUp,
  ClipboardList,
  FolderKanban,
} from "lucide-react";
import { ChartDataTable } from "@/components/dashboard/chart-data-table";
import {
  CommandCenterEvidence,
  portfolioOperationalStatus,
} from "@/components/dashboard/command-center-shell";
import { CompliancePortfolioStrip } from "@/components/dashboard/compliance-portfolio-strip";
import { useTranslations } from "next-intl";
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
import { DataTrustBanner } from "@/components/data-trust-banner";
import { OrgAdminChecklist } from "@/components/onboarding/org-admin-checklist";
import { EmptyState } from "@/components/ui/empty-state";
import { InsightPanel, MetricGrid, OperationalStatusBar } from "@/components/ui";
import { RadialGauge } from "@/components/dashboard/radial-gauge";
import { ThreatWatchPanel } from "@/components/dashboard/threat-watch-panel";
import {
  SarIntelligencePanel,
  SarIntegrityTrendPreview,
} from "@/components/dashboard/sar-intelligence-panel";
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
  intelligence,
  plantationFences,
  plantingPrograms,
  plantingProjects,
  trees,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { canGenerateReports, canWriteInApp } from "@/lib/nav-access";
import { scopedKey } from "@/lib/query-keys";
import { cn } from "@/lib/cn";

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="intel-skeleton h-20 rounded-xl" />
      <div className="intel-skeleton h-28 rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="intel-skeleton h-24 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="intel-skeleton h-72 rounded-xl" />
        <div className="intel-skeleton h-72 rounded-xl" />
      </div>
    </div>
  );
}

export function ExecutiveDashboard() {
  const { user } = useAuth();
  const t = useTranslations("dashboard");
  const te = useTranslations("executive");
  const to = useTranslations("opsStatus");
  const tChrome = useTranslations("chrome");
  const canWrite = canWriteInApp(user);
  const canReport = canGenerateReports(user);

  const [dashQ, alertsQ, treesQ, fencesQ, bioQ, programsQ, fieldOpsQ, monitoringQ] = useQueries({
    queries: [
      { queryKey: scopedKey(user, "dashboard"), queryFn: dashboard.get },
      { queryKey: scopedKey(user, "alerts"), queryFn: async () => (await alerts.list()).items },
      { queryKey: scopedKey(user, "trees-dashboard"), queryFn: () => trees.list({ page_size: 10 }) },
      { queryKey: scopedKey(user, "plantation-fences"), queryFn: () => plantationFences.list({ page_size: 20 }) },
      { queryKey: scopedKey(user, "bio-summary"), queryFn: () => bioacoustic.summary() },
      { queryKey: scopedKey(user, "program-memberships"), queryFn: () => plantingPrograms.memberships() },
      {
        queryKey: scopedKey(user, "field-ops-summary"),
        queryFn: () => plantingProjects.fieldOpsSummary(),
      },
      {
        queryKey: scopedKey(user, "monitoring-summary"),
        queryFn: () => plantingProjects.monitoringSummary(),
      },
    ],
  });

  const { data: reports } = useQuery({
    queryKey: scopedKey(user, "reports-dashboard"),
    queryFn: async () => (await api.get("/v1/reports")).data as Array<{
      id: string;
      kind: string;
      status: string;
      created_at: string;
    }>,
  });

  const { data: brief } = useQuery({
    queryKey: scopedKey(user, "executive-brief"),
    queryFn: () => intelligence.brief(),
    staleTime: 60_000,
  });

  const primaryFenceId = fencesQ.data?.items[0]?.id;
  const { data: ecosystem } = useQuery({
    queryKey: scopedKey(user, "ecosystem-health", primaryFenceId),
    queryFn: () => plantationFences.ecosystemHealth(primaryFenceId!),
    enabled: !!primaryFenceId,
  });

  const isLoading =
    dashQ.isLoading || alertsQ.isLoading || treesQ.isLoading || fencesQ.isLoading;

  if (isLoading) return <DashboardSkeleton />;

  if (dashQ.error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title={te("unavailable")}
        description={te("unavailableDesc")}
        action={{ label: tChrome("retry"), onClick: () => dashQ.refetch() }}
      />
    );
  }

  const data = dashQ.data!;
  const k = data.kpi;
  const alertItems = alertsQ.data ?? [];
  const unreadAlerts = alertItems.filter((a) => !a.is_read);
  const criticalAlerts = alertItems.filter(
    (a) => a.severity === "critical" || a.severity === "high",
  );
  const fieldOps = fieldOpsQ.data;
  const monitoring = monitoringQ.data;
  const openViolations = monitoring?.open_violations ?? fieldOps?.open_violations ?? 0;
  const sitesNeedingScan =
    monitoring?.stale_satellite_work_areas ??
    monitoring?.work_area_monitoring?.filter(
      (wa) => wa.days_since_scan == null || (wa.days_since_scan ?? 0) >= 14,
    ).length ??
    0;
  const sarIntegrity = monitoring?.sar_avg_forest_integrity;
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
  const greeting = getGreeting(te);
  const firstName = user?.full_name?.split(" ")[0] || te("steward");

  type PriorityItem = {
    id: string;
    title: string;
    detail: string;
    href: string;
    tone: "critical" | "warn" | "info";
  };
  const priorityItems: PriorityItem[] = [];
  if (openViolations > 0) {
    priorityItems.push({
      id: "violations",
      title: te("openComplianceItems", { count: openViolations }),
      detail: te("resolveViolations"),
      href: "/field-ops#attention",
      tone: "critical",
    });
  }
  if (unreadAlerts.length > 0) {
    priorityItems.push({
      id: "alerts",
      title: te("unreadAlertItems", { count: unreadAlerts.length }),
      detail: unreadAlerts[0]?.title ?? te("reviewInbox"),
      href: "/alerts",
      tone: criticalAlerts.length > 0 ? "critical" : "warn",
    });
  }
  if (sitesNeedingScan > 0) {
    priorityItems.push({
      id: "scans",
      title: te("sitesNeedRefresh", { count: sitesNeedingScan }),
      detail: te("ndviStale"),
      href: "/satellite",
      tone: "warn",
    });
  }
  if (brief?.priority_alert && priorityItems.length < 3) {
    priorityItems.push({
      id: "brief",
      title: brief.priority_alert.title,
      detail: brief.priority_alert.work_area_name || te("fromBrief"),
      href: "/portfolio-health?tab=threats",
      tone: "info",
    });
  }

  const portfolioStatus = portfolioOperationalStatus(to, {
    openViolations,
    criticalAlerts: criticalAlerts.length,
    unreadAlerts: unreadAlerts.length,
    sitesNeedingScan,
    survivalDue: fieldOps?.survival_due ?? 0,
  });

  return (
    <div className="space-y-6">
      <OperationalStatusBar
        tone={portfolioStatus.tone}
        label={portfolioStatus.label}
        summary={portfolioStatus.summary}
        icon={portfolioStatus.tone === "healthy" ? ShieldCheck : AlertTriangle}
        action={
          priorityItems[0] ? (
            <Link href={priorityItems[0].href} className="btn-secondary text-xs">
              {priorityItems[0].title}
            </Link>
          ) : (
            <Link href="/portfolio-health" className="btn-secondary text-xs">
              {te("portfolioIntelligence")}
            </Link>
          )
        }
      />

      <InsightPanel
        title={te("keyInsight")}
        interpretation={
          brief?.headline ||
          te("greetingFallback", { greeting, name: firstName })
        }
        icon={Sparkles}
      >
        {brief?.lines && brief.lines.length > 0 ? (
          <ul className="space-y-1 text-sm text-stone-600 dark:text-stone-400">
            {brief.lines.slice(0, 3).map((line) => (
              <li key={line}>• {line}</li>
            ))}
          </ul>
        ) : null}
      </InsightPanel>

      <MetricGrid
        columns={5}
        metrics={[
          {
            label: te("treesRegistered"),
            value: fmtCompact(k.total_trees),
            hint: te("healthyCanopy", { pct: fmtPct(k.pct_healthy) }),
          },
          {
            label: te("co2Stored"),
            value: fmtNum(k.total_co2e_kg / 1000, " t"),
            hint: te("projected", { value: fmtNum(k.annual_sequestration_kg / 1000, " t/yr") }),
            tone: "positive",
          },
          {
            label: te("openViolations"),
            value: fmtNum(openViolations),
            hint: te("complianceBlockers"),
            tone: openViolations > 0 ? "critical" : "positive",
          },
          {
            label: te("unreadAlerts"),
            value: fmtNum(unreadAlerts.length),
            hint: te("highPriority", { count: criticalAlerts.length }),
            tone: criticalAlerts.length > 0 ? "critical" : unreadAlerts.length > 0 ? "warning" : "default",
          },
          {
            label: te("forestIntegrity"),
            value: sarIntegrity != null ? Math.round(sarIntegrity) : fmtPct(k.pct_satellite_verified),
            hint: sarIntegrity != null ? te("sarComposite") : te("satelliteVerified"),
          },
        ]}
      />

      {priorityItems.length > 0 ? (
        <section className="dash-panel dash-panel--priority">
          <div className="dash-panel-head">
            <div>
              <h2 className="dash-panel-title">Today&apos;s priorities</h2>
              <p className="dash-panel-sub">Compliance, alerts, and monitoring that need action</p>
            </div>
            <Link href="/portfolio-health?tab=compliance" className="dash-link">
              Full monitoring <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <ul className="mt-4 grid gap-2 lg:grid-cols-3">
            {priorityItems.slice(0, 3).map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={cn(
                    "dash-priority-card",
                    item.tone === "critical" && "dash-priority-card--critical",
                    item.tone === "warn" && "dash-priority-card--warn",
                    item.tone === "info" && "dash-priority-card--info",
                  )}
                >
                  <p className="text-sm font-semibold text-stone-900">{item.title}</p>
                  <p className="mt-1 text-xs text-stone-600">{item.detail}</p>
                  <ArrowRight className="mt-3 h-4 w-4 text-stone-400" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="dash-command-strip">
        {[
          {
            label: te("activeProjects"),
            value: fmtNum(fieldOps?.project_count ?? monitoring?.project_count ?? 0),
            href: "/projects",
            icon: FolderKanban,
          },
          {
            label: te("openViolations"),
            value: fmtNum(openViolations),
            href: "/field-ops",
            icon: ShieldAlert,
            warn: openViolations > 0,
          },
          {
            label: te("unreadAlerts"),
            value: fmtNum(unreadAlerts.length),
            href: "/alerts",
            icon: Bell,
            warn: unreadAlerts.length > 0,
          },
          {
            label: te("sitesMonitored"),
            value: fmtNum(fenceItems.length),
            href: "/satellite",
            icon: Satellite,
          },
          {
            label: te("survivalDue"),
            value: fmtNum(fieldOps?.survival_due ?? 0),
            href: "/field-ops",
            icon: ClipboardList,
            warn: (fieldOps?.survival_due ?? 0) > 0,
          },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={cn("dash-command-item", item.warn && "dash-command-item--warn")}
          >
            <item.icon className="h-4 w-4 shrink-0 opacity-70" />
            <div>
              <p className="dash-command-value">{item.value}</p>
              <p className="dash-command-label">{item.label}</p>
            </div>
          </Link>
        ))}
      </div>

      <CompliancePortfolioStrip />

      <DataTrustBanner variant="strip" />
      <OrgAdminChecklist compact />

      <CommandCenterEvidence title={te("sarTitle")} description={te("sarDesc")}>
        <SarIntelligencePanel />
        {primaryFenceId ? <SarIntegrityTrendPreview fenceId={primaryFenceId} /> : null}
      </CommandCenterEvidence>

      <CommandCenterEvidence title={te("portfolioAnalytics")} description={te("portfolioAnalyticsDesc")}>
        <section className="grid gap-4 xl:grid-cols-12">
        <div className="dash-panel xl:col-span-5">
          <div className="dash-panel-head">
            <div>
              <h2 className="dash-panel-title">{te("portfolioVitals")}</h2>
              <p className="dash-panel-sub">{te("portfolioVitalsSub")}</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-around gap-6">
            <RadialGauge
              value={k.pct_healthy}
              label={te("healthy")}
              sublabel={te("canopyStatus")}
              color="#16a34a"
            />
            <RadialGauge
              value={k.pct_satellite_verified}
              label={te("verified")}
              sublabel={te("satelliteMrv")}
              color="#0ea5e9"
            />
            <RadialGauge
              value={ecosystem?.ecosystem_health_score ?? bio?.avg_health_score ?? 0}
              max={100}
              label={te("ecosystem")}
              sublabel={ecosystem ? ecosystem.ndvi_trend ?? te("ecosystemScore") : te("soundscape")}
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
              <p className="dash-panel-sub">6-month stored carbon trend (t CO₂e, from portfolio data)</p>
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
          <ChartDataTable
            caption={t("chartDataTable")}
            columns={[
              { key: "label", label: t("month") },
              { key: "value", label: t("value") },
            ]}
            rows={data.carbon_growth.map((p) => ({
              label: p.label,
              value: +(p.value / 1000).toFixed(2),
            }))}
          />
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
      </CommandCenterEvidence>

      <CommandCenterEvidence
        title={te("satelliteBiodiversity")}
        description={te("satelliteBiodiversityDesc")}
      >
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
                      {fence.area_ha ? `${fence.area_ha.toFixed(1)} ha` : te("areaPending")}
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
              [te("recordings"), bio?.total_recordings ?? data.bioacoustic?.total_recordings ?? 0],
              [te("analyzed"), bio?.analyzed_recordings ?? 0],
              [te("shannon"), (bio?.avg_shannon_index ?? data.bioacoustic?.avg_shannon_index ?? 0).toFixed(2)],
              [te("threatened"), bio?.threatened_species_count ?? 0],
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
      </CommandCenterEvidence>

      <CommandCenterEvidence
        title={te("threatWatch")}
        description={te("threatWatchDesc")}
      >
      <section className="dash-panel">
        <div className="dash-panel-head">
          <div>
            <h2 className="dash-panel-title">Weather & pest early warning</h2>
            <p className="dash-panel-sub">
              Location-specific forecasts, disease risk, and locust watch per plantation site
            </p>
          </div>
          <Link href="/satellite" className="dash-link">
            Satellite map <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="mt-4">
          <ThreatWatchPanel />
        </div>
      </section>
      </CommandCenterEvidence>

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
                {canWrite ? (
                  <Link href="/trees/new" className="btn-primary mt-3">
                    Add tree
                  </Link>
                ) : null}
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
              ...(canWrite
                ? [{ href: "/trees/new", icon: Sprout, label: te("registerTree"), sub: te("guidedWizard") }]
              : []),
              { href: "/portfolio-health?tab=compliance", icon: ShieldCheck, label: te("portfolioCompliance"), sub: te("readinessSafeguards") },
              { href: "/portfolio-health", icon: Radar, label: te("portfolioHealth"), sub: te("threatsMonitoring") },
              { href: "/satellite", icon: Satellite, label: te("satelliteScan"), sub: te("ndviHealth") },
              { href: "/bioacoustic", icon: Bird, label: te("recordBiodiversity"), sub: te("soundscape") },
              { href: "/assistant", icon: Sparkles, label: te("askAiAnalyst"), sub: te("carbonTips") },
              ...(canReport
                ? [{ href: "/reports", icon: FileText, label: te("generateReport"), sub: te("pdfExcel") }]
                : [{ href: "/reports", icon: FileText, label: te("viewReports"), sub: te("downloadExports") }]),
              { href: "/map", icon: MapPin, label: te("openMap"), sub: te("spatialView") },
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

      <CommandCenterEvidence
        title={te("spatialOverview")}
        description={te("spatialOverviewDesc")}
      >
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
                    {tree.species_text || te("speciesPending")} · {timeAgo(tree.created_at)}
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
      </CommandCenterEvidence>
    </div>
  );
}

function getGreeting(te: ReturnType<typeof useTranslations<"executive">>) {
  const hour = new Date().getHours();
  if (hour < 12) return te("goodMorning");
  if (hour < 17) return te("goodAfternoon");
  return te("goodEvening");
}
