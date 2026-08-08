"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { OrgAdminGuard } from "@/components/org-admin-guard";
import { SettingsSection } from "@/components/settings/settings-section";
import { errorMessage, webhooks, type WebhookEventType } from "@/lib/api";

const EVENT_LABELS: Record<string, string> = {
  "tree.registered": "Tree registered",
  "tree.updated": "Tree updated",
  "compliance.violation.resolved": "Compliance gap resolved",
  "project.mrv.exported": "MRV export ready",
  "project.evidence_bundle.generated": "Evidence bundle generated",
  "project.framework_report.exported": "Framework report exported",
  "project.credit_ledger.updated": "Credit ledger updated",
  "compliance.checklist.updated": "Checklist updated",
  "webhook.test": "Test ping",
};

function eventLabel(event: string) {
  return EVENT_LABELS[event] ?? event.replace(/[._]/g, " ");
}

export default function WebhooksSettingsPage() {
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<WebhookEventType[]>(["project.mrv.exported"]);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

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
    <OrgAdminGuard>
      <div className="space-y-8">
        <SettingsSection
          title="Webhooks"
          description="Get a signed JSON notification when trees, exports, credits, or compliance actions happen."
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-stone-600 dark:text-stone-400">
              {isLoading
                ? "Loading endpoints…"
                : endpoints.length
                  ? `${endpoints.length} endpoint${endpoints.length === 1 ? "" : "s"} configured`
                  : "No endpoints yet — add one to start receiving events."}
            </p>
            {endpoints.length > 0 ? (
              <button
                type="button"
                className="btn-primary text-sm"
                onClick={() => setShowCreate((v) => !v)}
              >
                {showCreate ? "Cancel" : "Add endpoint"}
              </button>
            ) : null}
          </div>

          {message ? <p className="mb-4 text-sm text-stone-600 dark:text-stone-400">{message}</p> : null}
          {newSecret ? (
            <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 font-mono text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30">
              Signing secret: {newSecret}
            </p>
          ) : null}

          <div className="card">
            {isLoading ? (
              <div className="space-y-3" aria-busy="true">
                <div className="h-16 animate-pulse rounded-lg bg-stone-100 dark:bg-stone-800" />
                <div className="h-16 animate-pulse rounded-lg bg-stone-100 dark:bg-stone-800" />
              </div>
            ) : !endpoints.length ? (
              <p className="text-sm text-stone-500">No webhooks configured yet.</p>
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
                            <span className="ml-2 text-xs font-normal text-stone-500">Disabled</span>
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

          {showCreate || !endpoints.length ? (
            <div className="card mt-4 space-y-4">
              <h3 className="text-sm font-medium text-stone-900 dark:text-stone-50">
                {endpoints.length ? "New endpoint" : "Add your first endpoint"}
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="label">Label</label>
                  <input
                    className="input mt-1"
                    placeholder="Ops Slack bridge"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                  />
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
                <p className="label">Notify me when</p>
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
                {create.isPending ? "Creating…" : "Create webhook"}
              </button>
            </div>
          ) : null}
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
