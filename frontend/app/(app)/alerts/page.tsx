"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, ShieldCheck } from "lucide-react";
import {
  alertsOperationalStatus,
  CommandCenterEvidence,
} from "@/components/dashboard/command-center-shell";
import { fmtNum } from "@/components/dashboard/format";
import { EmptyState, MetricGrid, OperationalStatusBar, PageHeader } from "@/components/ui";
import { alerts, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { userHasProfessionalAccess } from "@/lib/nav-access";
import { cn } from "@/lib/cn";

const SAR_ALERT_KINDS = new Set([
  "sar_integrity_drop",
  "sar_optical_divergent",
  "sar_integrity_at_risk",
  "sar_monsoon_gap_fill",
  "sar_hidden_moisture",
  "sar_wetland_detected",
  "sar_flood_risk",
  "sar_ground_moisture",
  "sar_ground_instability",
  "sar_sweep_health",
]);

const KIND_LABEL: Record<string, string> = {
  ndvi_degradation: "Canopy decline",
  health_roundup: "Health roundup",
  compliance_open: "Open compliance",
  threat_watch: "Weather & pest watch",
  survival_survey: "Survival check-in",
  satellite_health: "Satellite health",
  satellite_health_digest: "Daily satellite digest",
  compliance_deadline_approaching: "Compliance deadline",
  compliance_deadline_overdue: "Compliance overdue",
  sar_integrity_drop: "Integrity drop",
  sar_optical_divergent: "Optical mismatch",
  sar_integrity_at_risk: "At risk",
  sar_monsoon_gap_fill: "Monsoon gap-fill",
  sar_hidden_moisture: "Hidden moisture",
  sar_wetland_detected: "Wetland",
  sar_flood_risk: "Waterlogging",
  sar_ground_moisture: "Ground moisture",
  sar_ground_instability: "Ground instability",
  sar_sweep_health: "Sweep health",
};

function humanizeKind(kind: string): string {
  if (KIND_LABEL[kind]) return KIND_LABEL[kind];
  return kind
    .replace(/^sar_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function severityClass(severity: string): string {
  if (severity === "critical" || severity === "high") {
    return "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200";
  }
  if (severity === "moderate" || severity === "medium" || severity === "warning") {
    return "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200";
  }
  return "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300";
}

export default function AlertsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isOps = userHasProfessionalAccess(user);
  const searchParams = useSearchParams();
  const sarFilter = searchParams.get("sar");

  const { data, isLoading } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => alerts.list(),
  });

  const alertItems = (data?.items ?? []).filter((a) => {
    if (!sarFilter) return true;
    if (sarFilter === "all") return SAR_ALERT_KINDS.has(a.kind);
    return a.kind === sarFilter;
  });

  const unreadCount = alertItems.filter((a) => !a.is_read).length;
  const sortedItems = [...alertItems].sort((a, b) => {
    if (a.is_read === b.is_read) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    return a.is_read ? 1 : -1;
  });

  const sarKindsInList = [
    ...new Set((data?.items ?? []).map((a) => a.kind).filter((k) => SAR_ALERT_KINDS.has(k))),
  ];

  const { data: prefs } = useQuery({
    queryKey: ["alert-preferences"],
    queryFn: () => alerts.getPreferences(),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => alerts.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });

  const savePrefs = useMutation({
    mutationFn: (payload: Parameters<typeof alerts.updatePreferences>[0]) =>
      alerts.updatePreferences(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alert-preferences"] }),
  });

  const sh = prefs?.satellite_health;
  const ss = prefs?.survival_survey;
  const tw = prefs?.threat_watch;
  const comp = prefs?.compliance;

  const criticalCount = alertItems.filter((a) => a.severity === "critical").length;
  const highCount = alertItems.filter((a) => a.severity === "high").length;
  const sarCount = alertItems.filter((a) => SAR_ALERT_KINDS.has(a.kind)).length;

  const inboxStatus = alertsOperationalStatus({
    unreadCount,
    criticalCount,
    highCount,
    totalCount: alertItems.length,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        purpose="Intelligence · Signals"
        title="Alerts & signals"
        description={
          unreadCount > 0
            ? `${unreadCount} unread — review critical items first, then mark resolved signals as read.`
            : isOps
              ? "Operational notifications for satellite, compliance, SAR, and field work."
              : "Updates about your trees, check-ins, and health scans."
        }
        breadcrumbs={[{ label: "Intelligence" }, { label: "Alerts" }]}
      />

      <OperationalStatusBar
        tone={inboxStatus.tone}
        label={inboxStatus.label}
        summary={inboxStatus.summary}
        icon={inboxStatus.tone === "healthy" ? ShieldCheck : Bell}
        action={
          unreadCount > 0 ? (
            <Link href="/field-ops" className="btn-secondary text-xs">
              Open field ops
            </Link>
          ) : undefined
        }
      />

      <MetricGrid
        columns={4}
        metrics={[
          {
            label: "Unread",
            value: fmtNum(unreadCount),
            hint: "In current filter",
            tone: unreadCount > 0 ? "warning" : "positive",
          },
          {
            label: "Critical / high",
            value: fmtNum(criticalCount + highCount),
            hint: `${criticalCount} critical · ${highCount} high`,
            tone: criticalCount > 0 ? "critical" : highCount > 0 ? "warning" : "default",
          },
          {
            label: "SAR signals",
            value: fmtNum(sarCount),
            hint: "Sentinel / integrity alerts",
          },
          {
            label: "Total in view",
            value: fmtNum(alertItems.length),
            hint: sarFilter ? "Filtered inbox" : "All alert kinds",
          },
        ]}
      />

      {sarKindsInList.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Link
            href="/alerts"
            className={`rounded-full px-3 py-1 text-sm ${
              !sarFilter ? "bg-forest-800 text-white" : "bg-stone-100 hover:bg-stone-200"
            }`}
          >
            All alerts
          </Link>
          <Link
            href="/alerts?sar=all"
            className={`rounded-full px-3 py-1 text-sm ${
              sarFilter === "all" ? "bg-forest-800 text-white" : "bg-stone-100 hover:bg-stone-200"
            }`}
          >
            All SAR
          </Link>
          {sarKindsInList.map((kind) => (
            <Link
              key={kind}
              href={`/alerts?sar=${kind}`}
              className={`rounded-full px-3 py-1 text-sm ${
                sarFilter === kind ? "bg-forest-800 text-white" : "bg-stone-100 hover:bg-stone-200"
              }`}
            >
              {humanizeKind(kind)}
            </Link>
          ))}
        </div>
      )}

      <section className="card">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Bell className="h-4 w-4 text-forest-700" />
            Inbox
            {unreadCount > 0 ? (
              <span className="rounded-md bg-forest-100 px-2 py-0.5 text-xs font-semibold text-forest-800">
                {unreadCount} unread
              </span>
            ) : null}
          </div>
        </div>

        <div className="divide-y divide-stone-100 dark:divide-stone-800">
          {isLoading && <div className="py-6 text-sm text-stone-500">Loading inbox…</div>}
          {!isLoading && sortedItems.length === 0 && (
            <EmptyState
              className="my-2 border-0 bg-transparent"
              icon={Bell}
              title={isOps ? "Inbox clear" : "No alerts right now"}
              description={
                isOps
                  ? "No satellite, compliance, or field alerts match this filter. You're caught up."
                  : "Nothing waiting for you — check back after your next health scan or check-in."
              }
              action={
                isOps
                  ? { label: "Open field ops", href: "/field-ops" }
                  : { label: "Tag a tree", href: "/trees/new" }
              }
            />
          )}
          {sortedItems.map((a) => {
            const payload = a.payload as Record<string, string> | undefined;
            const deepLink = payload?.deep_link;
            return (
              <div
                key={a.id}
                className={cn(
                  "flex items-start justify-between gap-3 py-3",
                  !a.is_read && "bg-forest-50/40 -mx-2 rounded-lg px-2 dark:bg-forest-950/20",
                )}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {!a.is_read ? (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-forest-600" aria-hidden />
                    ) : null}
                    <div className={cn("font-medium", !a.is_read && "text-stone-950")}>{a.title}</div>
                  </div>
                  <div className="mt-0.5 text-sm text-stone-600 dark:text-stone-300">{a.message}</div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                    <span className="font-medium text-stone-700 dark:text-stone-300">
                      {humanizeKind(a.kind)}
                    </span>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        severityClass(a.severity),
                      )}
                    >
                      {a.severity}
                    </span>
                    <span>{new Date(a.created_at).toLocaleString()}</span>
                  </div>
                  {deepLink && (
                    <Link
                      href={deepLink}
                      className="mt-2 inline-block text-xs text-forest-700 hover:underline"
                    >
                      {payload?.action_label ?? "Open related view"} →
                    </Link>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!a.is_read && (
                    <button
                      type="button"
                      className="btn-secondary text-xs"
                      disabled={markRead.isPending}
                      onClick={() => markRead.mutate(a.id)}
                    >
                      <Check className="h-3 w-3" />
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <CommandCenterEvidence title="Notification preferences" description="Email, SMS, and digest settings">
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="text-sm font-medium">Satellite health</div>
            {sh ? (
              <div className="space-y-3 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={sh.enabled}
                    onChange={(e) =>
                      savePrefs.mutate({
                        satellite_health: { ...sh, enabled: e.target.checked },
                      })
                    }
                  />
                  Email/SMS when NDVI risk is high or critical
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={sh.channels.includes("email")}
                    onChange={(e) => {
                      const channels = new Set(sh.channels);
                      if (e.target.checked) channels.add("email");
                      else channels.delete("email");
                      if (!channels.has("in_app")) channels.add("in_app");
                      savePrefs.mutate({
                        satellite_health: { ...sh, channels: [...channels] },
                      });
                    }}
                  />
                  Email alerts
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={sh.sms_on_critical}
                    onChange={(e) =>
                      savePrefs.mutate({
                        satellite_health: { ...sh, sms_on_critical: e.target.checked },
                      })
                    }
                  />
                  SMS on critical risk (requires phone on profile)
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={sh.daily_digest !== false}
                    onChange={(e) =>
                      savePrefs.mutate({
                        satellite_health: { ...sh, daily_digest: e.target.checked },
                      })
                    }
                  />
                  Daily email/SMS digest of satellite alerts (once per day)
                </label>
              </div>
            ) : (
              <p className="text-sm text-stone-500">Loading preferences…</p>
            )}
          </div>

          {ss && (
            <div className="space-y-3">
              <div className="text-sm font-medium">Survival survey reminders</div>
              <div className="space-y-3 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={ss.enabled}
                    onChange={(e) =>
                      savePrefs.mutate({
                        survival_survey: { ...ss, enabled: e.target.checked },
                      })
                    }
                  />
                  Alert when trees are due for re-geotagging
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={ss.channels.includes("email")}
                    onChange={(e) => {
                      const channels = new Set(ss.channels);
                      if (e.target.checked) channels.add("email");
                      else channels.delete("email");
                      if (!channels.has("in_app")) channels.add("in_app");
                      savePrefs.mutate({
                        survival_survey: { ...ss, channels: [...channels] },
                      });
                    }}
                  />
                  Email survival survey alerts
                </label>
              </div>
            </div>
          )}

          {tw && (
            <div className="space-y-3">
              <div className="text-sm font-medium">Weather & pest early warnings</div>
              <div className="space-y-3 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={tw.enabled}
                    onChange={(e) =>
                      savePrefs.mutate({
                        threat_watch: { ...tw, enabled: e.target.checked },
                      })
                    }
                  />
                  Location-specific weather, pest, and locust watch alerts
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={tw.channels.includes("email")}
                    onChange={(e) => {
                      const channels = new Set(tw.channels);
                      if (e.target.checked) channels.add("email");
                      else channels.delete("email");
                      if (!channels.has("in_app")) channels.add("in_app");
                      savePrefs.mutate({
                        threat_watch: { ...tw, channels: [...channels] },
                      });
                    }}
                  />
                  Email threat watch alerts
                </label>
              </div>
            </div>
          )}

          {comp && (
            <div className="space-y-3">
              <div className="text-sm font-medium">Compliance deadline reminders</div>
              <div className="space-y-3 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={comp.enabled}
                    onChange={(e) =>
                      savePrefs.mutate({
                        compliance: { ...comp, enabled: e.target.checked },
                      })
                    }
                  />
                  Email when compliance violations or checklists are approaching due
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={comp.channels.includes("email")}
                    onChange={(e) => {
                      const channels = new Set(comp.channels);
                      if (e.target.checked) channels.add("email");
                      else channels.delete("email");
                      if (!channels.has("in_app")) channels.add("in_app");
                      savePrefs.mutate({
                        compliance: { ...comp, channels: [...channels] },
                      });
                    }}
                  />
                  Email compliance deadline alerts
                </label>
              </div>
            </div>
          )}

          {savePrefs.error && (
            <p className="text-sm text-rose-700">{errorMessage(savePrefs.error)}</p>
          )}
        </div>
      </CommandCenterEvidence>
    </div>
  );
}
