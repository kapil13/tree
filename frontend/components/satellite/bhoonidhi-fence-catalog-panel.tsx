"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { bhoonidhi } from "@/lib/api";
import { downloadBlob } from "@/lib/download-blob";
import { showToast } from "@/components/toast";

export function BhoonidhiFenceCatalogPanel({
  fenceId,
  fenceName,
  configured = true,
}: {
  fenceId: string;
  fenceName: string;
  configured?: boolean;
}) {
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["bhoonidhi-catalog", fenceId],
    queryFn: () => bhoonidhi.fenceCatalog(fenceId, { days_back: 90, limit: 12 }),
    enabled: Boolean(fenceId) && configured,
  });

  if (!fenceId) return null;

  async function handleDownload(scene: {
    id: string;
    collection: string | null;
    download_path: string | null;
  }) {
    if (!scene.download_path || !scene.collection) return;
    const key = `${scene.collection}-${scene.id}`;
    setDownloadingKey(key);
    try {
      const { blob, filename } = await bhoonidhi.downloadScene({
        id: scene.id,
        collection: scene.collection,
      });
      downloadBlob(blob, filename);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Bhoonidhi download failed");
    } finally {
      setDownloadingKey(null);
    }
  }

  return (
    <div className="card border-forest-200/60 dark:border-forest-900">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium text-stone-800">ISRO Bhoonidhi scenes — {fenceName}</h2>
          <p className="text-xs text-stone-500">
            GET /bhoonidhi/plantation-fences/…/catalog — IRS / ResourceSat / EOS-06 (last 90 days)
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary text-xs"
          onClick={() => refetch()}
          disabled={isFetching || !configured}
        >
          {isFetching ? "Loading…" : "Refresh"}
        </button>
      </div>

      {!configured && (
        <p className="text-sm text-amber-800">
          Bhoonidhi API is not configured on this server. Add credentials to{" "}
          <code className="rounded bg-stone-100 px-1 text-xs dark:bg-stone-800">.env.production</code> and redeploy
          to search the STAC catalog.
        </p>
      )}
      {configured && isLoading && <p className="text-sm text-stone-500">Searching Bhoonidhi STAC catalog…</p>}
      {configured && error && (
        <p className="text-sm text-amber-800">
          Bhoonidhi catalog unavailable. Ensure VPS IP is whitelisted and credentials are configured.
        </p>
      )}
      {configured && data && data.search.scenes.length === 0 && (
        <p className="text-sm text-stone-500">No online scenes found for this polygon in the last 90 days.</p>
      )}
      {configured && data && data.search.scenes.length > 0 && (
        <ul className="max-h-56 space-y-2 overflow-y-auto text-sm">
          {data.search.scenes.map((scene) => (
            <li
              key={`${scene.collection}-${scene.id}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-stone-50 px-3 py-2 dark:bg-stone-900"
            >
              <div>
                <div className="font-medium">{scene.collection || "scene"}</div>
                <div className="text-xs text-stone-500">{scene.id}</div>
                <div className="text-xs text-stone-400">
                  {scene.datetime ? new Date(scene.datetime).toLocaleString() : "—"}
                  {scene.online ? ` · online ${scene.online}` : ""}
                </div>
              </div>
              {scene.download_path && scene.collection && (
                <button
                  type="button"
                  className="text-xs text-forest-700 hover:underline disabled:opacity-50"
                  disabled={downloadingKey === `${scene.collection}-${scene.id}`}
                  onClick={() => void handleDownload(scene)}
                >
                  {downloadingKey === `${scene.collection}-${scene.id}` ? (
                    <span className="inline-flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Downloading…
                    </span>
                  ) : (
                    "Download"
                  )}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
