"use client";

import { useQuery } from "@tanstack/react-query";
import { bhoonidhi } from "@/lib/api";

export function BhoonidhiFenceCatalogPanel({
  fenceId,
  fenceName,
}: {
  fenceId: string;
  fenceName: string;
}) {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["bhoonidhi-catalog", fenceId],
    queryFn: () => bhoonidhi.fenceCatalog(fenceId, { days_back: 90, limit: 12 }),
    enabled: Boolean(fenceId),
  });

  if (!fenceId) return null;

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium text-stone-800">ISRO Bhoonidhi scenes — {fenceName}</h2>
          <p className="text-xs text-stone-500">IRS / ResourceSat / EOS-06 catalog for this site (last 90 days)</p>
        </div>
        <button type="button" className="btn-secondary text-xs" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? "Loading…" : "Refresh"}
        </button>
      </div>

      {isLoading && <p className="text-sm text-stone-500">Searching Bhoonidhi STAC catalog…</p>}
      {error && (
        <p className="text-sm text-amber-800">
          Bhoonidhi catalog unavailable. Ensure VPS IP is whitelisted and credentials are configured.
        </p>
      )}
      {data && data.search.scenes.length === 0 && (
        <p className="text-sm text-stone-500">No online scenes found for this polygon in the last 90 days.</p>
      )}
      {data && data.search.scenes.length > 0 && (
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
              {scene.download_path && (
                <a
                  href={scene.download_path}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-forest-700 hover:underline"
                >
                  Download
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
