"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { OrgAdminGuard } from "@/components/org-admin-guard";
import { SettingsSection } from "@/components/settings/settings-section";
import { errorMessage, webhooks, type WebhookEventType } from "@/lib/api";

export default function WebhooksSettingsPage() {
  const t = useTranslations("settingsWebhooksPage");
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<WebhookEventType[]>(["project.mrv.exported"]);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  function eventLabel(event: string) {
    const key = `events.${event}`;
    if (t.has(key as "events.tree.registered")) {
      return t(key as "events.tree.registered");
    }
    return event.replace(/[._]/g, " ");
  }

  const { data: eventTypes = [] } = useQuery({
    queryKey: ["webhook-events"],
    queryFn: () => webhooks.events(),
  });

  const { data: endpoints = [], isLoading } = useQuery({
    queryKey: ["webhooks"],
    queryFn: () => webhooks.list(),
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ["webhook-deliveries"],
    queryFn: () => webhooks.deliveries(30),
  });

  const create = useMutation({
    mutationFn: () => webhooks.create({ label, url, events }),
    onSuccess: (row) => {
      setNewSecret(row.signing_secret);
      setLabel("");
      setUrl("");
      setMessage(t("createdMessage"));
      setShowCreate(false);
      qc.invalidateQueries({ queryKey: ["webhooks"] });
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      webhooks.update(id, { enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  const test = useMutation({
    mutationFn: (id: string) => webhooks.test(id),
    onSuccess: () => {
      setMessage(t("testSent"));
      qc.invalidateQueries({ queryKey: ["webhook-deliveries"] });
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => webhooks.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  function toggleEvent(event: WebhookEventType) {
    setEvents((current) =>
      current.includes(event) ? current.filter((e) => e !== event) : [...current, event],
    );
  }

  return (
    <OrgAdminGuard>
      <div className="space-y-8">
        <SettingsSection title={t("title")} description={t("description")}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-stone-600 dark:text-stone-400">
              {isLoading
                ? t("loadingEndpoints")
                : endpoints.length
                  ? t("endpointCount", { count: endpoints.length })
                  : t("noEndpoints")}
            </p>
            {endpoints.length > 0 ? (
              <button
                type="button"
                className="btn-primary text-sm"
                onClick={() => setShowCreate((v) => !v)}
              >
                {showCreate ? t("cancel") : t("addEndpoint")}
              </button>
            ) : null}
          </div>

          {message ? <p className="mb-4 text-sm text-stone-600 dark:text-stone-400">{message}</p> : null}
          {newSecret ? (
            <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 font-mono text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30">
              {t("signingSecret", { secret: newSecret })}
            </p>
          ) : null}

          <div className="card">
            {isLoading ? (
              <div className="space-y-3" aria-busy="true">
                <div className="h-16 animate-pulse rounded-lg bg-stone-100 dark:bg-stone-800" />
                <div className="h-16 animate-pulse rounded-lg bg-stone-100 dark:bg-stone-800" />
              </div>
            ) : !endpoints.length ? (
              <p className="text-sm text-stone-500">{t("noWebhooks")}</p>
            ) : (
              <ul className="space-y-3">
                {endpoints.map((row) => (
                  <li
                    key={row.id}
                    className="rounded-lg border border-stone-200 p-4 text-sm dark:border-stone-700"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">
                          {row.label}
                          {!row.enabled ? (
                            <span className="ml-2 text-xs font-normal text-stone-500">{t("disabled")}</span>
                          ) : null}
                        </p>
                        <p className="mt-1 break-all text-xs text-stone-500">{row.url}</p>
                        {row.events?.length ? (
                          <p className="mt-2 text-xs text-stone-600 dark:text-stone-400">
                            {row.events.map(eventLabel).join(" · ")}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-secondary text-xs"
                          onClick={() => toggle.mutate({ id: row.id, enabled: !row.enabled })}
                        >
                          {row.enabled ? t("disable") : t("enable")}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary text-xs"
                          disabled={test.isPending}
                          onClick={() => test.mutate(row.id)}
                        >
                          {t("test")}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary text-xs text-rose-700"
                          onClick={() => remove.mutate(row.id)}
                        >
                          {t("delete")}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {showCreate || !endpoints.length ? (
            <div className="card mt-4 space-y-4">
              <h3 className="text-sm font-medium text-stone-900 dark:text-stone-50">
                {endpoints.length ? t("newEndpoint") : t("firstEndpoint")}
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="label">{t("label")}</label>
                  <input
                    className="input mt-1"
                    placeholder={t("labelPlaceholder")}
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">{t("httpsUrl")}</label>
                  <input
                    className="input mt-1"
                    placeholder={t("urlPlaceholder")}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <p className="label">{t("notifyWhen")}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {eventTypes.map((event) => (
                    <button
                      key={event}
                      type="button"
                      className={`rounded-full border px-2.5 py-1 text-xs ${
                        events.includes(event)
                          ? "border-forest-600 bg-forest-50 text-forest-800 dark:bg-forest-950/30"
                          : "border-stone-200 text-stone-600 dark:border-stone-700"
                      }`}
                      onClick={() => toggleEvent(event)}
                      title={event}
                    >
                      {eventLabel(event)}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                className="btn-primary"
                disabled={create.isPending || !label.trim() || !url.trim() || !events.length}
                onClick={() => create.mutate()}
              >
                {create.isPending ? t("creating") : t("createWebhook")}
              </button>
            </div>
          ) : null}
        </SettingsSection>

        <SettingsSection title={t("recentDeliveries")}>
          <div className="card">
            {!deliveries.length ? (
              <p className="text-sm text-stone-500">{t("noDeliveries")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-stone-500">
                    <tr>
                      <th className="px-2 py-1 font-medium">{t("colTime")}</th>
                      <th className="px-2 py-1 font-medium">{t("colEvent")}</th>
                      <th className="px-2 py-1 font-medium">{t("colStatus")}</th>
                      <th className="px-2 py-1 font-medium">{t("colHttp")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveries.map((d) => (
                      <tr key={d.id} className="border-t border-stone-100 dark:border-stone-800">
                        <td className="px-2 py-2">{new Date(d.created_at).toLocaleString()}</td>
                        <td className="px-2 py-2 text-xs" title={d.event_type}>
                          {eventLabel(d.event_type)}
                        </td>
                        <td className="px-2 py-2 capitalize">{d.status}</td>
                        <td className="px-2 py-2">{d.response_status ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </SettingsSection>
      </div>
    </OrgAdminGuard>
  );
}
