"use client";

import Link from "next/link";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  ClipboardList,
  FileText,
  FolderKanban,
  Radar,
  Satellite,
  ShieldAlert,
  Sparkles,
  TreePine,
} from "lucide-react";
import { DataTrustBanner } from "@/components/data-trust-banner";
import { OrgAdminChecklist } from "@/components/onboarding/org-admin-checklist";
import { MetricCard } from "@/components/dashboard/metric-card";
import { fmtNum, fmtPct, timeAgo } from "@/components/dashboard/format";
import { EmptyState } from "@/components/ui/empty-state";
import { TrustChip } from "@/components/ui/trust-chip";
import { alerts, dashboard, intelligence, plantingProjects } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { canGenerateReports, canWriteInApp } from "@/lib/nav-access";
import { scopedKey } from "@/lib/query-keys";
import { cn } from "@/lib/cn";

type PriorityItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  tone: "critical" | "warn" | "info";
};

function DashboardSkeleton() {
  return (
    <div className="dash-shell space-y-6">
      <div className="dash-hero dash-skeleton h-36" />
      <div className="dash-skeleton h-40 rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="dash-skeleton h-28 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function ExecutiveDashboard() {
  const { user } = useAuth();
  const canWrite = canWriteInApp(user);
  const canReport = canGenerateReports(user);

  const [dashQ, alertsQ, fieldOpsQ, monitoringQ] = useQueries({
    queries: [
      { queryKey: scopedKey(user, "dashboard"), queryFn: dashboard.get },
      { queryKey: scopedKey(user, "alerts"), queryFn: async () => (await alerts.list()).items },
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

  const { data: brief } = useQuery({
    queryKey: scopedKey(user, "executive-brief"),
    queryFn: () => intelligence.brief(),
    staleTime: 60_000,
  });

  const isLoading = dashQ.isLoading || alertsQ.isLoading;

  if (isLoading) return <DashboardSkeleton />;

  if (dashQ.error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Dashboard unavailable"
        description="Failed to load portfolio data. Check your session and try again."
        action={{ label: "Retry", onClick: () => dashQ.refetch() }}
      />
    );
  }

  const data = dashQ.data!;
  const k = data.kpi;
  const alertItems = alertsQ.data ?? [];
  const unreadAlerts = alertItems.filter((a) => !a.is_read);
  const fieldOps = fieldOpsQ.data;
  const monitoring = monitoringQ.data;
  const openViolations = monitoring?.open_violations ?? fieldOps?.open_violations ?? 0;
  const sitesNeedingScan =
    monitoring?.stale_satellite_work_areas ??
    monitoring?.work_area_monitoring?.filter(
      (wa) => wa.days_since_scan == null || (wa.days_since_scan ?? 0) >= 14,
    ).length ??
    0;
  const greeting = getGreeting();
  const firstName = user?.full_name?.split(" ")[0] || "steward";

  const priorityItems: PriorityItem[] = [];
  if (openViolations > 0) {
    priorityItems.push({
      id: "violations",
      title: `${openViolations} open violation${openViolations === 1 ? "" : "s"}`,
      detail: "Compliance items need resolution",
      href: "/field-ops#attention",
      tone: "critical",
    });
  }
  if (unreadAlerts.length > 0) {
    const top = unreadAlerts[0];
    priorityItems.push({
      id: "alerts",
      title: `${unreadAlerts.length} unread alert${unreadAlerts.length === 1 ? "" : "s"}`,
      detail: top?.title ? top.title : "Review your alert inbox",
      href: "/alerts",
      tone: unreadAlerts.some((a) => a.severity === "critical" || a.severity === "high")
        ? "critical"
        : "warn",
    });
  }
  if (sitesNeedingScan > 0) {
    priorityItems.push({
      id: "scans",
      title: `${sitesNeedingScan} site${sitesNeedingScan === 1 ? "" : "s"} need a scan`,
      detail: "Satellite monitoring is stale or missing",
      href: "/satellite",
      tone: "warn",
    });
  }
  if (brief?.priority_alert && priorityItems.length < 3) {
    priorityItems.push({
      id: "brief-alert",
      title: brief.priority_alert.title,
      detail: brief.priority_alert.work_area_name || "Priority from executive brief",
      href: "/alerts",
      tone: "info",
    });
  }
  const topPriority = priorityItems.slice(0, 3);

  const integrityScore =
    monitoring?.sar_avg_forest_integrity != null
      ? Math.round(monitoring.sar_avg_forest_integrity)
      : null;
  const carbonTons = k.total_co2e_kg / 1000;

  return (
    <div className="dash-shell space-y-6">
      <section className="dash-hero">
        <div className="dash-hero-header">
          <div className="flex flex-wrap items-center gap-2">
            <div className="dash-live-pill">
              <span className="dash-live-dot" />
              Portfolio overview
            </div>
            <TrustChip tone="live" label="Ops view" />
          </div>
          <h1 className="dash-hero-title mt-4">
            {greeting}, {firstName}
          </h1>
          <p className="dash-hero-copy">
            {brief?.headline ||
              "Focus on what needs attention today — then dive into portfolio details when you need depth."}
          </p>
          {brief?.lines?.length ? (
            <ul className="mt-3 space-y-1 text-sm text-emerald-50/90">
              {brief.lines.slice(0, 2).map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime-300" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      <DataTrustBanner variant="strip" />
      <OrgAdminChecklist compact />

      <section className="dash-panel">
        <div className="dash-panel-head">
          <div>
            <h2 className="dash-panel-title">Needs attention</h2>
            <p className="dash-panel-sub">Top priorities across compliance, alerts, and monitoring</p>
          </div>
          <Link href="/alerts" className="dash-link">
            Alert inbox <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {topPriority.length === 0 ? (
          <EmptyState
            className="mt-4 border-0 bg-transparent py-8"
            icon={ShieldAlert}
            title="All clear for now"
            description="No open violations, unread alerts, or stale scans in your queue."
            action={canWrite ? { label: "Register a tree", href: "/trees/new" } : undefined}
          />
        ) : (
          <ul className="mt-4 space-y-2">
            {topPriority.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border px-4 py-3 transition hover:border-forest-300",
                    item.tone === "critical" && "border-rose-200 bg-rose-50/60",
                    item.tone === "warn" && "border-amber-200 bg-amber-50/60",
                    item.tone === "info" && "border-stone-200 bg-stone-50/80",
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      item.tone === "critical" && "bg-rose-100 text-rose-700",
                      item.tone === "warn" && "bg-amber-100 text-amber-800",
                      item.tone === "info" && "bg-stone-100 text-stone-700",
                    )}
                  >
                    {item.tone === "info" ? (
                      <Bell className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-stone-900">{item.title}</p>
                    <p className="mt-0.5 text-xs text-stone-600">{item.detail}</p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-stone-400" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={TreePine}
          label="Trees"
          value={fmtNum(k.total_trees)}
          sub={`${fmtPct(k.pct_healthy)} healthy`}
          accent="green"
        />
        <MetricCard
          icon={FolderKanban}
          label="Projects"
          value={fmtNum(fieldOps?.project_count ?? monitoring?.project_count ?? 0)}
          sub={`${fmtNum(fieldOps?.tree_count ?? k.total_trees)} trees in field ops`}
          accent="lime"
        />
        <MetricCard
          icon={Bell}
          label="Alerts & risks"
          value={fmtNum(unreadAlerts.length + openViolations)}
          sub={`${unreadAlerts.length} unread · ${openViolations} violations`}
          accent="amber"
        />
        <MetricCard
          icon={Radar}
          label={integrityScore != null ? "Forest integrity" : "Carbon stored (est.)"}
          value={
            integrityScore != null ? String(integrityScore) : fmtNum(carbonTons, " t")
          }
          sub={
            integrityScore != null
              ? `${fmtNum(carbonTons, " t")} CO₂e estimated`
              : `+${fmtNum(k.annual_sequestration_kg / 1000, " t/yr")} projected`
          }
          accent="sky"
        />
      </section>

      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            href: "/portfolio-health",
            icon: Radar,
            label: "Portfolio health",
            sub: "Threats & monitoring depth",
          },
          {
            href: "/field-ops",
            icon: ClipboardList,
            label: "Field ops",
            sub: "Violations & survival due",
          },
          {
            href: "/satellite",
            icon: Satellite,
            label: "Satellite",
            sub: "NDVI & site scans",
          },
          {
            href: "/reports",
            icon: FileText,
            label: canReport ? "Reports" : "View reports",
            sub: canReport ? "PDF / Excel exports" : "Download exports",
          },
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
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-stone-200 bg-stone-50/70 px-4 py-3 dark:border-stone-700 dark:bg-stone-900/40">
        <div>
          <p className="text-sm font-medium text-stone-800 dark:text-stone-100">
            Want charts, SAR, biodiversity, and threat watch?
          </p>
          <p className="text-xs text-stone-500">
            Heavy analytics live on Portfolio health so this page stays decision-first.
          </p>
        </div>
        <Link href="/portfolio-health" className="btn-secondary inline-flex items-center gap-2 text-sm">
          Portfolio details
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {unreadAlerts.length > 0 ? (
        <section className="dash-panel">
          <div className="dash-panel-head">
            <div>
              <h2 className="dash-panel-title">Latest unread</h2>
              <p className="dash-panel-sub">Quick peek before opening the inbox</p>
            </div>
            <Link href="/alerts" className="dash-link">
              Open inbox <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <ul className="mt-3 space-y-2">
            {unreadAlerts.slice(0, 3).map((alert) => (
              <li key={alert.id} className="dash-alert-row dash-alert-row--unread">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-stone-900">{alert.title}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-stone-500">{alert.message}</p>
                  <p className="mt-1 text-[11px] text-stone-400">{timeAgo(alert.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
