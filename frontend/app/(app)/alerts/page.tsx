"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";
import { alerts, errorMessage } from "@/lib/api";

export default function AlertsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => alerts.list(),
  });

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Alerts</h1>

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

      <div className="card divide-y divide-stone-100">
        {isLoading && <div className="text-stone-500">Loading…</div>}
        {data?.length === 0 && (
          <div className="text-sm text-stone-500">No alerts. Your trees are happy.</div>
        )}
        {data?.map((a) => (
          <div key={a.id} className="flex items-start justify-between gap-3 py-3">
            <div>
              <div className="font-medium">{a.title}</div>
              <div className="text-sm text-stone-600">{a.message}</div>
              <div className="mt-1 text-xs text-stone-500">
                {a.kind} · {a.severity} · {new Date(a.created_at).toLocaleString()}
              </div>
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
        ))}
      </div>
    </div>
  );
}
