"use client";

import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Leaf,
  Map,
  Satellite,
  Sparkles,
  TreePine,
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
import { CarbonCo2eRange } from "@/components/carbon-co2e-range";
import { TreesMap } from "@/components/trees-map";
import { CitizenStewardshipPanel } from "@/components/dashboard/citizen-stewardship-panel";
import {
  citizenOperationalStatus,
  CommandCenterEvidence,
} from "@/components/dashboard/command-center-shell";
import { DataTrustBanner } from "@/components/data-trust-banner";
import { fmtCompact, fmtNum, CHART_COLORS, HEALTH_COLORS, timeAgo } from "@/components/dashboard/format";
import { Badge, healthBadgeVariant } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { InsightPanel, MetricGrid, OperationalStatusBar } from "@/components/ui";
import { getProgramTheme } from "@/components/registration/program-theme";
import { aiScans, dashboard, trees } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/cn";
import { scopedKey } from "@/lib/query-keys";

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="intel-skeleton h-20 rounded-xl" />
      <div className="intel-skeleton h-24 rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="intel-skeleton h-24 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function CitizenDashboard() {
  const t = useTranslations("citizenDashboard");
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
    { id: "tree", done: treeCount > 0, label: t("stepFirstTree"), href: "/trees/new" },
    { id: "map", done: treeCount > 0, label: t("stepMap"), href: "/map" },
    {
      id: "scan",
      done: Boolean(recent.some((tr) => tr.current_health && tr.current_health !== "unknown")),
      label: t("stepAiScan"),
      href: recent[0] ? `/trees/${recent[0].id}` : "/trees/new",
    },
    { id: "programs", done: false, label: t("stepPrograms"), href: "/settings/programs" },
  ];
  const stepsDone = steps.filter((s) => s.done).length;
  const showChecklist = treeCount < 3 || stepsDone < 3;
  const pctHealthy = kpi?.pct_healthy ?? 0;

  const groveStatus = citizenOperationalStatus({
    treeCount,
    pctHealthy,
    stepsDone,
    stepsTotal: steps.length,
  });

  const carbonValue =
    kpi && kpi.total_co2e_kg > 0 ? (
      <CarbonCo2eRange
        compact
        showLabel={false}
        data={{
          co2e_kg: kpi.total_co2e_kg,
          co2e_kg_lower_90: kpi.co2e_kg_lower_90,
          co2e_kg_upper_90: kpi.co2e_kg_upper_90,
          uncertainty_pct: kpi.uncertainty_pct,
        }}
      />
    ) : (
      "—"
    );

  return (
    <div className="space-y-6">
      <OperationalStatusBar
        tone={groveStatus.tone}
        label={groveStatus.label}
        summary={groveStatus.summary}
        icon={HeroIcon}
        action={
          <Link href="/trees/new" className="btn-primary inline-flex items-center gap-2 text-xs">
            <Leaf className="h-3.5 w-3.5" />
            {treeCount > 0 ? t("tagTree") : t("tagFirstTree")}
          </Link>
        }
      />

      <InsightPanel
        title={treeCount > 0 ? t("greetingWithTrees", { name: firstName, count: treeCount }) : t("greetingEmpty", { name: firstName })}
        interpretation={treeCount > 0 ? t("heroWithTrees") : t("heroEmpty")}
        icon={Sparkles}
      >
        <div className="flex flex-wrap gap-3">
          <Link href="/map" className="btn-secondary inline-flex items-center gap-2 text-xs">
            <Map className="h-3.5 w-3.5" />
            {t("openMap")}
          </Link>
        </div>
      </InsightPanel>

      {treeCount > 0 ? (
        <MetricGrid
          columns={4}
          metrics={[
            {
              label: "Trees tagged",
              value: fmtNum(treeCount),
              hint: `${Math.round(pctHealthy)}% healthy`,
              tone: "positive",
            },
            {
              label: "Satellite checked",
              value: kpi ? `${Math.round(kpi.pct_satellite_verified)}%` : "—",
              hint: "When scans are available",
            },
            {
              label: t("carbonMetric"),
              value: carbonValue,
              hint: t("carbonMetricSub"),
              tone: kpi && kpi.total_co2e_kg > 0 ? "positive" : "default",
            },
            {
              label: "AI scans left",
              value: scansLeft != null ? String(scansLeft) : "∞",
              hint: "Complimentary + purchased",
            },
          ]}
        />
      ) : null}

      <div className="dash-panel">
        <div className="dash-panel-head">
          <div>
            <h2 className="dash-panel-title">Stewardship & rewards</h2>
            <p className="dash-panel-sub">Adopt trees, complete check-ins, and earn badges</p>
          </div>
          <Link href="/stewardship" className="dash-link">
            Open stewardship hub
          </Link>
        </div>
        <CitizenStewardshipPanel compact />
      </div>

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
      ) : null}

      <DataTrustBanner variant="strip" />

      {treeCount > 0 ? (
        <CommandCenterEvidence
          title="Grove analytics"
          description="Carbon trajectory, health mix, species, and map"
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="dash-panel border-0 p-0 shadow-none lg:col-span-2">
              <div className="dash-panel-head px-0 pt-0">
                <div>
                  <h2 className="dash-panel-title">Carbon over time</h2>
                  <p className="dash-panel-sub">Estimated carbon stored from your tagged trees</p>
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
                        formatter={(v: number) => [`${fmtNum(v, " kg")}`, "Carbon stored"]}
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
                <EmptyState
                  className="mt-4"
                  icon={HeroIcon}
                  title="No trend yet"
                  description="Tag a few trees to see estimated carbon stored over time."
                  action={{ label: "Tag a tree", href: "/trees/new" }}
                />
              )}
            </div>

            <div className="dash-panel border-0 p-0 shadow-none">
              <div className="dash-panel-head px-0 pt-0">
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
                <p className="mt-6 text-sm text-stone-500">
                  Health breakdown appears after your first analysis.
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {!showChecklist ? (
              <div className="dash-panel border-0 p-0 shadow-none">
                <div className="dash-panel-head px-0 pt-0">
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
            ) : null}

            <div
              className={cn(
                "dash-panel border-0 p-0 shadow-none",
                showChecklist ? "lg:col-span-3" : "lg:col-span-2",
              )}
            >
              <div className="dash-panel-head px-0 pt-0">
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
        </CommandCenterEvidence>
      ) : null}

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
          <EmptyState
            icon={TreePine}
            title="No trees yet"
            description="Your dashboard will light up once you tag your first one."
            action={{ label: "Tag your first tree", href: "/trees/new" }}
          />
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
                    <span title="Satellite checked">
                      <Satellite className="h-4 w-4 shrink-0 text-sky-600" aria-hidden />
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 font-mono text-xs text-stone-500">{tree.public_code}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant={healthBadgeVariant(tree.current_health)}>
                    {tree.current_health}
                  </Badge>
                  {tree.current_carbon_kg > 0 ? (
                    <span className="text-xs text-stone-500">
                      ~{fmtCompact(tree.current_carbon_kg)} kg C
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-xs text-stone-400">{timeAgo(tree.created_at)}</p>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-stone-200 bg-stone-50/80 px-4 py-3 text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-900/40 dark:text-stone-300">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Looking for team projects, compliance reports, or unlimited AI scans?{" "}
            <span className="text-stone-500">Professional programs are available on request.</span>
          </p>
          <Link
            href="/settings/programs"
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-forest-700 hover:underline"
          >
            Explore programs
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
