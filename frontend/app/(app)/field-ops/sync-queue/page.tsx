"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CloudOff, RefreshCw, Trash2, TreePine, Wifi } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui";
import {
  listQueuedTreeRegistrations,
  removeTreeRegistration,
  updateTreeRegistrationStatus,
  type QueuedTreeRegistration,
} from "@/lib/offline/tree-registration-queue";
import {
  isBrowserOnline,
  syncQueuedTreeRegistrations,
} from "@/lib/offline/tree-registration-sync";

export default function SyncQueuePage() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<QueuedTreeRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const online = isBrowserOnline();

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listQueuedTreeRegistrations());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (searchParams.get("queued") === "1") {
      setStatus("Tree registration saved offline — sync when connected.");
    }
  }, [searchParams]);

  async function syncAll() {
    setSyncing(true);
    setStatus("Syncing…");
    try {
      const count = await syncQueuedTreeRegistrations();
      await reload();
      setStatus(count > 0 ? `Synced ${count} tree registration(s)` : "All synced");
    } catch {
      setStatus("Sync failed — try again when online");
    } finally {
      setSyncing(false);
    }
  }

  async function removeItem(id: string) {
    if (!confirm("Remove this queued registration from your device?")) return;
    await removeTreeRegistration(id);
    await reload();
    setStatus("Item removed");
  }

  async function retryItem(item: QueuedTreeRegistration) {
    await updateTreeRegistrationStatus(item.id, { status: "pending", errorMessage: undefined });
    await syncAll();
  }

  const pending = items.filter((i) => i.status !== "syncing").length;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      <PageHeader
        title="Sync queue"
        description="Offline tree registrations upload when you are back online."
        breadcrumbs={[
          { label: "Operate", href: "/field-ops" },
          { label: "Sync queue" },
        ]}
      />

      <div className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            {online ? (
              <Wifi className="h-4 w-4 text-forest-600" />
            ) : (
              <CloudOff className="h-4 w-4 text-amber-600" />
            )}
            {online ? "Online" : "Offline — items stay queued until connected"}
          </div>
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-2 text-sm"
            disabled={syncing || pending === 0}
            onClick={() => void syncAll()}
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            Sync now
          </button>
        </div>
        <p className="text-sm text-stone-600">
          {pending === 0
            ? "All tree registrations are synced."
            : `${pending} registration(s) waiting to upload.`}
        </p>
        {status ? <p className="text-xs text-forest-700">{status}</p> : null}
      </div>

      {loading ? (
        <p className="text-sm text-stone-500">Loading queue…</p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={TreePine}
          title="Queue empty"
          description="Tree registrations saved offline while disconnected will appear here."
          action={{ label: "Register a tree", href: "/trees/new" }}
        />
      ) : (
        <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
          {items.map((item) => {
            const species =
              (item.payload.species_text as string | undefined) ?? "Tree registration";
            return (
              <li key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-stone-900">{species}</p>
                  <p className="text-xs text-stone-500">
                    {item.photos.length} photo(s) · {item.status} ·{" "}
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                  {item.errorMessage ? (
                    <p className="mt-1 text-xs text-rose-700">{item.errorMessage}</p>
                  ) : null}
                  {item.photos.length > 0 ? (
                    <div className="mt-2 flex gap-2 overflow-x-auto">
                      {item.photos.slice(0, 4).map((photo, index) => (
                        <img
                          key={`${item.id}-${index}`}
                          src={photo.dataUrl}
                          alt=""
                          className="h-14 w-14 rounded-md object-cover"
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  {item.status === "failed" ? (
                    <button
                      type="button"
                      className="btn-secondary text-xs"
                      onClick={() => void retryItem(item)}
                    >
                      Retry
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn-secondary text-xs text-rose-700"
                    onClick={() => void removeItem(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs text-stone-500">
        Queued on this browser only. Open{" "}
        <Link href="/trees/new" className="text-forest-700 hover:underline">
          tree registration
        </Link>{" "}
        to capture more trees when offline.
      </p>
    </div>
  );
}
