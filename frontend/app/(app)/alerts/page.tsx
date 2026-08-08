"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";
import { alerts, errorMessage } from "@/lib/api";

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

const SAR_KIND_LABEL: Record<string, string> = {
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

export default function AlertsPage() {
  const qc = useQueryClient();
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

  const sarKindsInList = [...new Set((data?.items ?? []).map((a) => a.kind).filter((k) => SAR_ALERT_KINDS.has(k)))];

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Alerts</h1>

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
              {SAR_KIND_LABEL[kind] ?? kind}
            </Link>
          ))}
        </div>
      )}

      <div className="card space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Bell className="h-4 w-4 text-forest-700" />
          Satellite health notifications
        </div>
        {sh && (
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
            {savePrefs.error && (
              <p className="text-rose-700">{errorMessage(savePrefs.error)}</p>
            )}
          </div>
        )}
      </div>

      {ss && (
        <div className="card space-y-4">
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
        <div className="card space-y-4">
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
        <div className="card space-y-4">
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

      <div className="card divide-y divide-stone-100">
        {isLoading && <div className="text-stone-500">Loading…</div>}
        {alertItems.length === 0 && (
          <div className="text-sm text-stone-500">No alerts. Your trees are happy.</div>
        )}
        {alertItems.map((a) => {
          const payload = a.payload as Record<string, string> | undefined;
          const deepLink = payload?.deep_link;
          return (
          <div key={a.id} className="flex items-start justify-between gap-3 py-3">
            <div>
              <div className="font-medium">{a.title}</div>
              <div className="text-sm text-stone-600">{a.message}</div>
              <div className="mt-1 text-xs text-stone-500">
                {a.kind} · {a.severity} · {new Date(a.created_at).toLocaleString()}
              </div>
              {deepLink && (
                <Link href={deepLink} className="mt-2 inline-block text-xs text-forest-700 hover:underline">
                  {payload?.action_label ?? "Open related view"} →
                </Link>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {!a.is_read && <span className="badge-moderate">unread</span>}
              {!a.is_read && (
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  disabled={markRead.isPending}
                  onClick={() => markRead.mutate(a.id)}
                >
                  <Check className="h-3 w-3" />
                  Read
                </button>
              )}
            </div>
          </div>
        );
        })}
      </div>
    </div>
  );
}
