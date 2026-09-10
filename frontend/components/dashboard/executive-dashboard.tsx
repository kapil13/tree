"use client";

import Link from "next/link";
import { useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
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
  Sparkles,
  Sprout,
  TreePine,
} from "lucide-react";
import {
  CommandCenterEvidence,
  portfolioOperationalStatus,
} from "@/components/dashboard/command-center-shell";
import {
  CommandCenterOpsBand,
  type ActivityItem,
  type MrvStage,
} from "@/components/dashboard/command-center-ops-band";
import { AudienceDashboardStrip } from "@/components/dashboard/audience-dashboard-strip";
import { ProjectPerformancePanel } from "@/components/dashboard/project-performance-panel";
import { GovernmentRollupPanel } from "@/components/dashboard/government-rollup-panel";
import { useTranslations, useLocale } from "next-intl";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { CommandCenterHero, type CommandCenterPriority } from "@/components/dashboard/command-center-hero";
import {
  CommandCenterSignalRibbon,
  type SignalCell,
} from "@/components/dashboard/command-center-signal-ribbon";
import {
  CommandCenterTrendsCanvas,
  type TrendChartConfig,
} from "@/components/dashboard/command-center-trends-canvas";
import { localizeExecutiveBriefLine } from "@/lib/localize-executive-brief";
import type { AppLocale } from "@/i18n/request";
import { DataTrustBanner } from "@/components/data-trust-banner";
import { OrgAdminChecklist } from "@/components/onboarding/org-admin-checklist";
import { useProjectContext } from "@/lib/project-context";
import { EmptyState } from "@/components/ui/empty-state";
import { OperationalStatusBar } from "@/components/ui";
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
  compliance,
  dashboard,
  intelligence,
  plantationFences,
  plantingProjects,
  sar,
  trees,
} from "@/lib/api";
import {
  priorityToSignal,
  signalFromChart,
  type CommandCenterFocus,
  type CommandCenterSignalId,
} from "@/lib/command-center-focus";
import { useAuth } from "@/lib/auth-store";
import { alertsHref } from "@/lib/alerts-links";
import { fieldOpsHref } from "@/lib/field-ops-links";
import { portfolioComplianceHref, portfolioHealthHref, portfolioThreatsHref } from "@/lib/portfolio-health-links";
import { resolvePlantingAudience } from "@/lib/audience";
import { canGenerateReports, canWriteInApp } from "@/lib/nav-access";
import { scopedKey } from "@/lib/query-keys";
import { cn } from "@/lib/cn";

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="intel-skeleton h-16 rounded-xl" />
      <div className="intel-skeleton min-h-[420px] rounded-2xl" />
      <div className="intel-skeleton h-14 rounded-xl" />
      <div className="intel-skeleton min-h-[360px] rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="intel-skeleton h-24 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function ExecutiveDashboard() {
  const { user } = useAuth();
  const { projectId } = useProjectContext();
  const locale = useLocale() as AppLocale;
  const t = useTranslations("dashboard");
  const te = useTranslations("executive");
  const to = useTranslations("opsStatus");
  const tChrome = useTranslations("chrome");
  const tDataTrust = useTranslations("dataTrust");
  const canWrite = canWriteInApp(user);
  const canReport = canGenerateReports(user);
  const audience = resolvePlantingAudience(user?.audience);
  const showPlantingFocus = Boolean(user?.audience) && audience !== "general";
  const showDistrictRollup = audience === "government";

  const [dashQ, alertsQ, treesQ, fencesQ, bioQ, fieldOpsQ, monitoringQ] = useQueries({
    queries: [
      { queryKey: scopedKey(user, "dashboard"), queryFn: dashboard.get },
      { queryKey: scopedKey(user, "alerts"), queryFn: async () => (await alerts.list()).items },
      { queryKey: scopedKey(user, "trees-dashboard"), queryFn: () => trees.list({ page_size: 10 }) },
      { queryKey: scopedKey(user, "plantation-fences"), queryFn: () => plantationFences.list({ page_size: 20 }) },
      { queryKey: scopedKey(user, "bio-summary"), queryFn: () => bioacoustic.summary() },
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

  const { data: complianceSummary } = useQuery({
    queryKey: scopedKey(user, "compliance-portfolio-summary"),
    queryFn: () => compliance.portfolioSummary(),
    staleTime: 60_000,
  });

  const primaryFenceId = fencesQ.data?.items[0]?.id;
  const { data: ecosystem } = useQuery({
    queryKey: scopedKey(user, "ecosystem-health", primaryFenceId),
    queryFn: () => plantationFences.ecosystemHealth(primaryFenceId!),
    enabled: !!primaryFenceId,
  });

  const { data: sarMonitoring } = useQuery({
    queryKey: scopedKey(user, "sar-monitoring", primaryFenceId, "trends"),
    queryFn: () => sar.fenceMonitoring(primaryFenceId!),
    enabled: !!primaryFenceId,
    staleTime: 60_000,
  });

  const [focus, setFocus] = useState<CommandCenterFocus>({
    signalId: null,
    priorityId: null,
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
      href: fieldOpsHref({ section: "attention" }),
      tone: "critical",
    });
  }
  if (unreadAlerts.length > 0) {
    priorityItems.push({
      id: "alerts",
      title: te("unreadAlertItems", { count: unreadAlerts.length }),
      detail: unreadAlerts[0]?.title ?? te("reviewInbox"),
      href: alertsHref(),
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
      href: portfolioThreatsHref(),
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

  const integrityScore =
    sarIntegrity != null ? Math.round(sarIntegrity) : Math.round(k.pct_healthy);

  const ndviTrend = ecosystem?.ndvi_trend?.toLowerCase() ?? "";
  const integrityTrend: "up" | "down" | "flat" | null =
    ndviTrend.includes("declin") || ndviTrend.includes("decreas")
      ? "down"
      : ndviTrend.includes("improv") || ndviTrend.includes("increas")
        ? "up"
        : null;

  const primarySignal = brief?.priority_alert
    ? `${brief.priority_alert.work_area_name} · ${brief.priority_alert.title}`
    : localizeExecutiveBriefLine(brief?.headline?.slice(0, 96), locale, te) || portfolioStatus.label;

  const cascadeSteps: Array<{ label: string; active?: boolean }> = [];
  if (brief?.priority_alert) {
    cascadeSteps.push({ label: brief.priority_alert.title, active: true });
  } else if (ecosystem?.ndvi_trend) {
    cascadeSteps.push({ label: `NDVI ${ecosystem.ndvi_trend}`, active: true });
  }
  if (unreadAlerts.length > 0) {
    cascadeSteps.push({ label: te("unreadAlertItems", { count: unreadAlerts.length }) });
  }
  if (openViolations > 0) {
    cascadeSteps.push({ label: te("openComplianceItems", { count: openViolations }) });
  }
  if (fieldOps?.survival_due && fieldOps.survival_due > 0) {
    cascadeSteps.push({ label: te("survivalDueCount", { count: fieldOps.survival_due }) });
  }
  cascadeSteps.push({ label: te("fieldInspection") });

  const heroPriorities: CommandCenterPriority[] = priorityItems.map((item) => {
    const signals: string[] = [];
    if (item.id === "alerts") {
      signals.push(te("unreadAlertItems", { count: unreadAlerts.length }));
      if (criticalAlerts.length > 0) {
        signals.push(te("highPriority", { count: criticalAlerts.length }));
      }
    } else if (item.id === "violations") {
      signals.push(te("openComplianceItems", { count: openViolations }));
    } else if (item.id === "scans") {
      signals.push(te("sitesNeedRefresh", { count: sitesNeedingScan }));
    } else if (item.id === "brief" && brief?.priority_alert) {
      signals.push(brief.priority_alert.work_area_name);
    }
    return {
      ...item,
      signals: signals.length > 0 ? signals : [item.detail],
      sla: item.id === "scans" && sitesNeedingScan > 0 ? te("slaOverdue") : undefined,
    };
  });

  const heroPrimaryHref = priorityItems[0]?.href ?? portfolioHealthHref();
  const heroPrimaryLabel = priorityItems[0]?.title ?? te("portfolioIntelligence");

  const workAreas = monitoring?.work_area_monitoring ?? [];
  const freshSites = workAreas.filter(
    (wa) => wa.days_since_scan != null && wa.days_since_scan < 14,
  ).length;
  const satelliteFreshPct =
    workAreas.length > 0 ? Math.round((freshSites / workAreas.length) * 100) : k.pct_satellite_verified;

  const carbonSeries = data.carbon_growth.map((p) => ({
    label: p.label,
    value: +(p.value / 1000).toFixed(2),
  }));
  const carbonLatest = carbonSeries.at(-1)?.value ?? 0;
  const carbonPrev = carbonSeries.at(-2)?.value ?? carbonLatest;
  const carbonDeltaPct =
    carbonPrev > 0 ? Math.round(((carbonLatest - carbonPrev) / carbonPrev) * 100) : 0;

  const integritySeries =
    sarMonitoring?.points
      ?.map((p) => ({
        label: new Date(p.scene_acquired_at).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        value: p.fusion?.forest_integrity_score ?? 0,
      }))
      .filter((p) => p.value > 0) ?? [];
  if (integritySeries.length === 0 && integrityScore > 0) {
    carbonSeries.forEach((p) => {
      integritySeries.push({ label: p.label, value: integrityScore });
    });
  }

  const survivalPct = Math.round(k.pct_healthy);
  const survivalSeries = carbonSeries.map((p) => ({ label: p.label, value: survivalPct }));

  const satelliteSeries = carbonSeries.map((p, i) => ({
    label: p.label,
    value: Math.max(
      0,
      Math.min(100, satelliteFreshPct + (i - carbonSeries.length + 1) * 2),
    ),
  }));

  const alertBuckets = new Map<string, number>();
  alertItems.forEach((alert) => {
    const key = new Date(alert.created_at).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    alertBuckets.set(key, (alertBuckets.get(key) ?? 0) + 1);
  });
  const alertSeries = Array.from(alertBuckets.entries())
    .slice(-6)
    .map(([label, value]) => ({ label, value }));
  if (alertSeries.length === 0) {
    alertSeries.push({ label: te("signalAlerts"), value: unreadAlerts.length });
  }
  const alertDelta =
    alertSeries.length >= 2
      ? alertSeries[alertSeries.length - 1].value - alertSeries[alertSeries.length - 2].value
      : unreadAlerts.length;

  const bioScore = Math.round(bio?.avg_health_score ?? data.bioacoustic?.avg_health_score ?? 0);
  const bioSeries = taxonData.length > 0
    ? taxonData.map((t) => ({ label: t.name.slice(0, 8), value: t.value }))
    : [{ label: te("recordings"), value: bio?.total_recordings ?? 0 }];

  const ndviValue = avgNdvi > 0 ? avgNdvi.toFixed(2) : ndviSeries.at(-1)?.ndvi?.toFixed(2) ?? "—";
  const ndviTone: "up" | "down" | "warn" | null =
    ecosystem?.ndvi_trend?.toLowerCase().includes("declin") ||
    ecosystem?.ndvi_trend?.toLowerCase().includes("decreas")
      ? "down"
      : ecosystem?.ndvi_trend?.toLowerCase().includes("improv") ||
          ecosystem?.ndvi_trend?.toLowerCase().includes("increas")
        ? "up"
        : null;

  const mrvReadiness = complianceSummary?.avg_readiness_pct ?? k.pct_satellite_verified;

  const signalCells: SignalCell[] = [
    {
      id: "ndvi" as CommandCenterSignalId,
      value: ndviValue,
      label: te("signalNdvi"),
      tone: ndviTone,
    },
    {
      id: "satellite" as CommandCenterSignalId,
      value: `${satelliteFreshPct}%`,
      label: te("signalSatellite"),
      tone: sitesNeedingScan > 0 ? "warn" : null,
    },
    {
      id: "survival" as CommandCenterSignalId,
      value: `${survivalPct}%`,
      label: te("signalSurvival"),
      tone: survivalPct < 70 ? "down" : null,
    },
    {
      id: "alerts" as CommandCenterSignalId,
      value: alertDelta >= 0 ? `+${alertDelta}` : String(alertDelta),
      label: te("signalAlerts"),
      tone: unreadAlerts.length > 0 ? "down" : null,
    },
    {
      id: "bio" as CommandCenterSignalId,
      value: `${bioScore}`,
      label: te("signalBioChorus"),
      tone: bioScore >= 60 ? "up" : bioScore > 0 ? "warn" : null,
    },
    {
      id: "carbon" as CommandCenterSignalId,
      value: `+${carbonDeltaPct}%`,
      label: te("signalCarbon"),
      tone: carbonDeltaPct >= 0 ? "up" : "down",
    },
    {
      id: "integrity" as CommandCenterSignalId,
      value: String(integrityScore),
      label: te("signalIntegrity"),
      tone: integrityTrend === "down" ? "down" : integrityTrend === "up" ? "up" : null,
    },
    {
      id: "mrv" as CommandCenterSignalId,
      value: fmtPct(mrvReadiness),
      label: te("signalMrvReady"),
      tone: mrvReadiness < 80 ? "warn" : null,
    },
  ];

  const trendCharts: TrendChartConfig[] = [
    {
      chartId: "ndvi",
      id: "ndvi",
      title: te("signalNdvi"),
      value: ndviValue,
      valueTone: ndviTone ?? undefined,
      target: te("chartTargetNdvi"),
      targetValue: 0.6,
      series: ndviSeries.map((p) => ({ label: p.label, value: p.ndvi })),
      seriesColor: "#0ea5e9",
      domain: [0, 1],
      valueFormatter: (v) => v.toFixed(3),
      anomaly:
        ndviTone === "down" && ecosystem?.ndvi_trend ? ecosystem.ndvi_trend : undefined,
    },
    {
      chartId: "integrity",
      id: "integrity",
      title: te("signalIntegrity"),
      value: String(integrityScore),
      valueTone: integrityTrend === "down" ? "down" : integrityTrend === "up" ? "up" : undefined,
      target: te("chartTargetIntegrity"),
      targetValue: 75,
      series: integritySeries,
      seriesColor: "#16a34a",
      domain: [0, 100],
      meta: [te("sarComposite")],
    },
    {
      chartId: "carbon",
      id: "carbon",
      title: te("carbon"),
      value: `${carbonLatest} t`,
      valueTone: carbonDeltaPct >= 0 ? "up" : "down",
      target: te("chartBaseline"),
      series: carbonSeries,
      seriesColor: "#15803d",
      valueFormatter: (v) => `${v} t`,
      meta: [te("carbonStockTrendSub")],
    },
    {
      chartId: "survival",
      id: "survival",
      title: te("signalSurvival"),
      value: `${survivalPct}%`,
      valueTone: survivalPct < 70 ? "down" : "up",
      target: te("chartTargetSurvival"),
      targetValue: 85,
      series: survivalSeries,
      seriesColor: "#84cc16",
      domain: [0, 100],
      meta: [(fieldOps?.survival_due ?? 0) > 0 ? te("survivalDueCount", { count: fieldOps?.survival_due ?? 0 }) : te("onTrack")],
    },
    {
      chartId: "satellite",
      id: "satellite",
      title: te("signalSatellite"),
      value: `${satelliteFreshPct}%`,
      valueTone: sitesNeedingScan > 0 ? "warn" : undefined,
      target: te("chartTargetSatellite"),
      targetValue: 90,
      series: satelliteSeries,
      seriesColor: "#0284c7",
      domain: [0, 100],
      anomaly: sitesNeedingScan > 0 ? te("sitesNeedRefresh", { count: sitesNeedingScan }) : undefined,
    },
    {
      chartId: "bio",
      id: "bio",
      title: te("signalBioChorus"),
      value: String(bio?.total_recordings ?? data.bioacoustic?.total_recordings ?? 0),
      valueTone: bioScore >= 60 ? "up" : undefined,
      target: te("recordings"),
      series: bioSeries,
      seriesColor: "#a855f7",
      meta: [te("shannon"), (bio?.avg_shannon_index ?? 0).toFixed(2)],
    },
  ];

  const handleSignalSelect = (signalId: CommandCenterSignalId) => {
    setFocus((prev) => ({
      ...prev,
      signalId: prev.signalId === signalId ? null : signalId,
    }));
  };

  const handlePrioritySelect = (priorityId: string) => {
    setFocus({
      priorityId,
      signalId: priorityToSignal(priorityId),
    });
  };

  const handleChartSelect = (chartId: TrendChartConfig["chartId"]) => {
    const signalId = signalFromChart(chartId);
    setFocus((prev) => ({
      ...prev,
      signalId: prev.signalId === signalId ? null : signalId,
    }));
  };

  const selectedPriorityId = focus.priorityId ?? priorityItems[0]?.id ?? null;

  const complianceProjects = complianceSummary?.projects ?? [];
  const workflowDone = complianceProjects.reduce((sum, p) => sum + p.workflow_done, 0);
  const workflowTotal = complianceProjects.reduce((sum, p) => sum + p.workflow_total, 0);
  const evidencePct =
    workflowTotal > 0 ? Math.round((workflowDone / workflowTotal) * 100) : 0;
  const capturePct = Math.round(k.pct_satellite_verified);
  const verifyPct = Math.round(complianceSummary?.avg_readiness_pct ?? mrvReadiness);
  const reportReadyCount = complianceProjects.filter(
    (p) => p.workflow_total > 0 && p.workflow_done >= p.workflow_total,
  ).length;
  const reportPct =
    complianceProjects.length > 0
      ? Math.round((reportReadyCount / complianceProjects.length) * 100)
      : 0;
  const mrvStagePct = Math.round((capturePct + evidencePct + verifyPct) / 3);

  const stageStatus = (pct: number, blocked = false): MrvStage["status"] => {
    if (blocked) return "active";
    if (pct >= 90) return "done";
    if (pct >= 40) return "active";
    return "pending";
  };

  const mrvStages: MrvStage[] = [
    {
      id: "capture",
      label: te("mrvStageCapture"),
      pct: capturePct,
      status: stageStatus(capturePct),
    },
    {
      id: "evidence",
      label: te("mrvStageEvidence"),
      pct: evidencePct,
      status: stageStatus(evidencePct),
    },
    {
      id: "verify",
      label: te("mrvStageVerify"),
      pct: verifyPct,
      status: stageStatus(verifyPct, (complianceSummary?.blocking_violations ?? 0) > 0),
      blocked: (complianceSummary?.blocking_violations ?? 0) > 0,
    },
    {
      id: "mrv",
      label: te("mrvStageMrv"),
      pct: mrvStagePct,
      status: stageStatus(mrvStagePct),
    },
    {
      id: "report",
      label: te("mrvStageReport"),
      pct: reportPct,
      status: stageStatus(reportPct),
    },
  ];

  const recentBioCount =
    bio?.recent_recordings?.filter((recording) => {
      const age = Date.now() - new Date(recording.recorded_at).getTime();
      return age < 7 * 24 * 60 * 60 * 1000;
    }).length ?? 0;

  const activityItems: ActivityItem[] = [
    ...alertItems.slice(0, 4).map((alert) => ({
      id: `alert-${alert.id}`,
      type: "alert" as const,
      label: alert.title,
      meta: alert.severity,
      time: timeAgo(alert.created_at),
      href: alertsHref(),
      at: new Date(alert.created_at).getTime(),
    })),
    ...(treesQ.data?.items ?? []).slice(0, 3).map((tree) => ({
      id: `tree-${tree.id}`,
      type: "tree" as const,
      label: tree.public_code,
      meta: tree.species_text || te("speciesPending"),
      time: timeAgo(tree.created_at),
      href: `/trees/${tree.id}`,
      at: new Date(tree.created_at).getTime(),
    })),
    ...(bio?.recent_recordings ?? []).slice(0, 2).map((recording) => ({
      id: `bio-${recording.id}`,
      type: "bio" as const,
      label: te("recordBiodiversity"),
      meta: recording.status,
      time: timeAgo(recording.recorded_at),
      href: "/bioacoustic",
      at: new Date(recording.recorded_at).getTime(),
    })),
    ...(monitoring?.recent_violations ?? []).slice(0, 2).map((violation) => ({
      id: `violation-${violation.id}`,
      type: "evidence" as const,
      label: violation.message,
      meta: violation.project_name,
      time: violation.created_at ? timeAgo(violation.created_at) : te("fieldInspection"),
      href: fieldOpsHref({ section: "attention" }),
      at: violation.created_at ? new Date(violation.created_at).getTime() : 0,
    })),
    ...(sitesNeedingScan > 0
      ? [
          {
            id: "satellite-stale",
            type: "satellite" as const,
            label: te("sitesNeedRefresh", { count: sitesNeedingScan }),
            meta: te("ndviStale"),
            time: te("slaOverdue"),
            href: "/satellite",
            at: Date.now(),
          },
        ]
      : []),
    ...((fieldOps?.survival_due ?? 0) > 0
      ? [
          {
            id: "field-survival",
            type: "field" as const,
            label: te("survivalDueCount", { count: fieldOps?.survival_due ?? 0 }),
            meta: te("fieldInspection"),
            time: te("slaOverdue"),
            href: fieldOpsHref(),
            at: Date.now() - 60_000,
          },
        ]
      : []),
  ]
    .sort((a, b) => b.at - a.at)
    .slice(0, 6);

  const carbonTarget =
    k.lifetime_credits_tco2e > 0
      ? +(k.lifetime_credits_tco2e / 1000).toFixed(2)
      : carbonLatest > 0
        ? +(carbonLatest * 1.25).toFixed(2)
        : undefined;

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
            <Link href={portfolioHealthHref()} className="btn-secondary text-xs">
              {te("portfolioIntelligence")}
            </Link>
          )
        }
      />

      <CommandCenterHero
        integrityScore={integrityScore}
        integrityTrend={integrityTrend}
        primarySignal={primarySignal}
        cascade={cascadeSteps}
        metrics={[
          { label: te("treesRegistered"), value: fmtCompact(k.total_trees) },
          {
            label: te("unreadAlerts"),
            value: unreadAlerts.length,
            tone: criticalAlerts.length > 0 ? "critical" : unreadAlerts.length > 0 ? "warn" : "default",
          },
          {
            label: te("openViolations"),
            value: openViolations,
            tone: openViolations > 0 ? "critical" : "default",
          },
          {
            label: te("satelliteVerified"),
            value: fmtPct(k.pct_satellite_verified),
          },
        ]}
        priorities={heroPriorities}
        primaryActionHref={heroPrimaryHref}
        primaryActionLabel={heroPrimaryLabel}
        selectedPriorityId={selectedPriorityId}
        onPrioritySelect={handlePrioritySelect}
      />

      <CommandCenterSignalRibbon
        signals={signalCells}
        activeSignalId={focus.signalId}
        onSignalSelect={handleSignalSelect}
      />

      <CommandCenterTrendsCanvas
        charts={trendCharts}
        focus={focus}
        onChartSelect={handleChartSelect}
      />

      <CommandCenterOpsBand
        focus={focus}
        onZoneSelect={handleSignalSelect}
        carbon={{
          latestTco2e: carbonLatest,
          targetTco2e: carbonTarget,
          onTrack: carbonDeltaPct >= 0,
          series: carbonSeries,
          deltaPct: carbonDeltaPct,
          href: "/reports",
        }}
        bio={{
          species: bio?.total_species_detected ?? 0,
          threatened: bio?.threatened_species_count ?? 0,
          observationsDelta: recentBioCount,
          chorusPct: bioScore,
          taxonBars: bioSeries,
          href: "/bioacoustic",
        }}
        mrv={{
          stages: mrvStages,
          gaps: complianceSummary?.safeguard_gap_count ?? 0,
          blockers: complianceSummary?.blocking_violations ?? 0,
          readinessPct: mrvReadiness,
          href: portfolioComplianceHref(),
        }}
        activity={activityItems}
      />

      <ProjectPerformancePanel
        monitoring={monitoring}
        complianceSummary={complianceSummary}
        selectedProjectId={projectId}
      />

      {showPlantingFocus ? (
        <CommandCenterEvidence title={te("plantingFocus")} description={te("plantingFocusDesc")}>
          <AudienceDashboardStrip />
        </CommandCenterEvidence>
      ) : null}

      {showDistrictRollup ? (
        <CommandCenterEvidence title={te("districtRollup")} description={te("districtRollupDesc")}>
          <GovernmentRollupPanel embedded />
        </CommandCenterEvidence>
      ) : null}

      <CommandCenterEvidence title={tDataTrust("title")} description={te("dataTrustDesc")}>
        <DataTrustBanner variant="strip" />
      </CommandCenterEvidence>

      <CommandCenterEvidence title={te("orgSetup")} description={te("orgSetupDesc")}>
        <OrgAdminChecklist compact />
      </CommandCenterEvidence>

      <CommandCenterEvidence title={te("sarTitle")} description={te("sarDesc")}>
        <SarIntelligencePanel />
        {primaryFenceId ? <SarIntegrityTrendPreview fenceId={primaryFenceId} /> : null}
      </CommandCenterEvidence>

      <CommandCenterEvidence title={te("portfolioAnalytics")} description={te("portfolioAnalyticsDesc")}>
        <section className="grid gap-4 xl:grid-cols-12">
        <div className="dash-panel xl:col-span-8">
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

          {taxonData.length === 0 ? (
            <div className="dash-empty mt-4">
              <Bird className="h-8 w-8 text-stone-400" />
              <p>Upload ambient recordings to unlock biodiversity analytics.</p>
            </div>
          ) : null}
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
              { href: portfolioComplianceHref(), icon: ShieldCheck, label: te("portfolioCompliance"), sub: te("readinessSafeguards") },
              { href: portfolioHealthHref(), icon: Radar, label: te("portfolioHealth"), sub: te("portfolioHealthHub") },
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
      <section className="dash-panel">
          <div className="dash-panel-head">
            <div>
              <h2 className="dash-panel-title">Recent registrations</h2>
              <p className="dash-panel-sub">Latest trees added to portfolio</p>
            </div>
            <Link href="/map" className="dash-link">
              Full map <ArrowRight className="h-3.5 w-3.5" />
            </Link>
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
      </section>
      </CommandCenterEvidence>
    </div>
  );
}
