"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SettingsSection } from "@/components/settings/settings-section";
import { errorMessage, webhooks, type WebhookEventType } from "@/lib/api";

export default function WebhooksSettingsPage() {
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<WebhookEventType[]>(["project.mrv.exported"]);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
      setMessage("Webhook created. Copy the signing secret now — it won't be shown again.");
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
      setMessage("Test event sent.");
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
    <div className="space-y-8">
      <SettingsSection
        title="Webhooks"
        description="Receive signed JSON events when trees, exports, credits, or compliance actions occur."
      >
        <div className="card space-y-4">
          <h3 className="text-sm font-medium text-stone-900 dark:text-stone-50">Add endpoint</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="label">Label</label>
              <input className="input mt-1" value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div>
              <label className="label">HTTPS URL</label>
              <input
                className="input mt-1"
                placeholder="https://example.com/webhooks/aranyix"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          </div>
          <div>
            <p className="label">Events</p>
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
                >
                  {event}
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
            {create.isPending ? "Creating…" : "Create webhook"}
          </button>
          {newSecret ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 font-mono text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30">
              Signing secret: {newSecret}
            </p>
          ) : null}
          {message ? <p className="text-sm text-stone-600 dark:text-stone-400">{message}</p> : null}
        </div>
      </SettingsSection>

      <SettingsSection title="Endpoints">
        <div className="card">
          {isLoading ? (
            <p className="text-sm text-stone-500">Loading…</p>
          ) : !endpoints.length ? (
            <p className="text-sm text-stone-500">No webhooks configured yet.</p>
          ) : (
            <ul className="space-y-3">
              {endpoints.map((row) => (
                <li key={row.id} className="rounded-lg border border-stone-200 p-4 text-sm dark:border-stone-700">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{row.label}</p>
                      <p className="mt-1 break-all text-xs text-stone-500">{row.url}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn-secondary text-xs"
                        onClick={() => toggle.mutate({ id: row.id, enabled: !row.enabled })}
                      >
                        {row.enabled ? "Disable" : "Enable"}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary text-xs"
                        disabled={test.isPending}
                        onClick={() => test.mutate(row.id)}
                      >
                        Test
                      </button>
                      <button
                        type="button"
                        className="btn-secondary text-xs text-rose-700"
                        onClick={() => remove.mutate(row.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SettingsSection>

      <SettingsSection title="Recent deliveries">
        <div className="card">
          {!deliveries.length ? (
            <p className="text-sm text-stone-500">No deliveries yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-stone-500">
                  <tr>
                    <th className="px-2 py-1 font-medium">Time</th>
                    <th className="px-2 py-1 font-medium">Event</th>
                    <th className="px-2 py-1 font-medium">Status</th>
                    <th className="px-2 py-1 font-medium">HTTP</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map((d) => (
                    <tr key={d.id} className="border-t border-stone-100 dark:border-stone-800">
                      <td className="px-2 py-2">{new Date(d.created_at).toLocaleString()}</td>
                      <td className="px-2 py-2 text-xs">{d.event_type}</td>
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
  );
}
