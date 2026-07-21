"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Webhook } from "lucide-react";
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
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href="/settings"
          className="mb-2 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Settings
        </Link>
        <div className="flex items-center gap-2">
          <Webhook className="h-6 w-6 text-forest-700" />
          <h1 className="text-2xl font-semibold tracking-tight">Outbound webhooks</h1>
        </div>
        <p className="mt-1 text-sm text-stone-600">
          Receive HMAC-signed JSON events when trees, exports, credit ledger, or compliance actions
          occur in your workspace.
        </p>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold">Add endpoint</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="label text-xs">Label</label>
            <input className="input mt-1" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div>
            <label className="label text-xs">HTTPS URL</label>
            <input
              className="input mt-1"
              placeholder="https://example.com/webhooks/aranyix"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
        </div>
        <div>
          <p className="label text-xs">Events</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {eventTypes.map((event) => (
              <button
                key={event}
                type="button"
                className={`rounded-full border px-2.5 py-1 text-[10px] font-mono ${
                  events.includes(event)
                    ? "border-forest-600 bg-forest-50 text-forest-800"
                    : "border-stone-200 text-stone-600"
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
          className="btn-primary text-xs"
          disabled={create.isPending || !label.trim() || !url.trim() || !events.length}
          onClick={() => create.mutate()}
        >
          {create.isPending ? "Creating…" : "Create webhook"}
        </button>
        {newSecret ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 font-mono text-xs text-amber-900">
            Signing secret: {newSecret}
          </p>
        ) : null}
        {message ? <p className="text-sm text-stone-600">{message}</p> : null}
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold">Endpoints</h2>
        {isLoading ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : !endpoints.length ? (
          <p className="text-sm text-stone-500">No webhooks configured yet.</p>
        ) : (
          <ul className="space-y-3">
            {endpoints.map((row) => (
              <li key={row.id} className="rounded-lg border border-stone-100 p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{row.label}</p>
                    <p className="mt-1 break-all font-mono text-xs text-stone-500">{row.url}</p>
                    <p className="mt-1 text-xs text-stone-400">{row.signing_secret_preview}</p>
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

      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold">Recent deliveries</h2>
        {!deliveries.length ? (
          <p className="text-sm text-stone-500">No deliveries yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="text-left text-stone-500">
                <tr>
                  <th className="px-2 py-1">Time</th>
                  <th className="px-2 py-1">Event</th>
                  <th className="px-2 py-1">Status</th>
                  <th className="px-2 py-1">HTTP</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => (
                  <tr key={d.id} className="border-t border-stone-100">
                    <td className="px-2 py-1">{new Date(d.created_at).toLocaleString()}</td>
                    <td className="px-2 py-1 font-mono">{d.event_type}</td>
                    <td className="px-2 py-1 capitalize">{d.status}</td>
                    <td className="px-2 py-1">{d.response_status ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-stone-500">
        Verify signatures with HMAC-SHA256 over <code>{`{timestamp}.{body}`}</code> using the signing
        secret. Headers: <code>X-Aranyix-Signature</code>, <code>X-Aranyix-Timestamp</code>,{" "}
        <code>X-Aranyix-Event</code>.
      </p>
    </div>
  );
}
