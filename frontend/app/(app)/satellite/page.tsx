"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Radar, RefreshCw, Satellite as SatelliteIcon } from "lucide-react";
import { TreesSatelliteMap } from "@/components/trees-satellite-map";
import { dashboard, errorMessage, trees, type Tree } from "@/lib/api";

export default function SatellitePage() {
  const qc = useQueryClient();
  const dash = useQuery({ queryKey: ["dashboard"], queryFn: dashboard.get });
  const treeList = useQuery({
    queryKey: ["trees-satellite"],
    queryFn: () => trees.list({ page_size: 500 }),
  });

  const scan = useMutation({
    mutationFn: (treeId: string) => trees.scanSatellite(treeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trees-satellite"] });
      qc.invalidateQueries({ queryKey: ["trees"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const k = dash.data?.kpi;
  const items = treeList.data?.items ?? [];
  const verified = items.filter((t) => t.satellite_verified).length;
  const pending = items.length - verified;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Satellite</h1>
          <p className="mt-1 max-w-2xl text-sm text-stone-600">
            Satellite imagery with all registered trees. Green markers are Sentinel-2 verified;
            grey markers are awaiting a baseline NDVI scan.
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <div className="text-xs uppercase tracking-wide text-stone-500">Trees on map</div>
          <div className="mt-1 text-2xl font-semibold">{items.length}</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase tracking-wide text-stone-500">Satellite verified</div>
          <div className="mt-1 text-2xl font-semibold text-forest-700">
            {k ? `${k.pct_satellite_verified}%` : verified}
          </div>
          <div className="text-xs text-stone-500">
            {verified} verified · {pending} pending
          </div>
        </div>
        <div className="card">
          <div className="text-xs uppercase tracking-wide text-stone-500">Imagery</div>
          <div className="mt-1 flex items-center gap-2 text-lg font-medium">
            <SatelliteIcon className="h-5 w-5 text-forest-700" />
            Mapbox + Sentinel-2 NDVI
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-stone-200 bg-stone-900">
        <TreesSatelliteMap
          trees={items}
          className="h-[min(70vh,720px)] w-full"
        />
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-black/60 px-3 py-2 text-xs text-white backdrop-blur-sm">
          <div className="font-medium">Legend</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-forest-600 ring-2 ring-white" />
            Verified (NDVI ≥ 0.25)
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-stone-400 ring-2 ring-white" />
            Pending scan
          </div>
        </div>
      </div>

      {scan.error && (
        <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errorMessage(scan.error)}
        </div>
      )}

      <div className="card overflow-hidden p-0">
        <div className="border-b border-stone-100 bg-stone-50 px-4 py-2 text-sm font-medium dark:border-stone-800 dark:bg-stone-900">
          Tree list
        </div>
        <table className="min-w-full text-sm">
          <thead className="bg-stone-50 text-stone-600 dark:bg-stone-900">
            <tr>
              <th className="px-4 py-2 text-left">Tree</th>
              <th className="px-4 py-2 text-left">Species</th>
              <th className="px-4 py-2 text-left">Coordinates</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {treeList.isLoading && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-stone-500">
                  Loading trees…
                </td>
              </tr>
            )}
            {items.map((t: Tree) => (
              <tr key={t.id} className="border-t border-stone-100 dark:border-stone-800">
                <td className="px-4 py-2 font-mono text-xs">{t.public_code}</td>
                <td className="px-4 py-2">{t.species_text || "—"}</td>
                <td className="px-4 py-2 font-mono text-xs text-stone-500">
                  {t.latitude?.toFixed(5)}, {t.longitude?.toFixed(5)}
                </td>
                <td className="px-4 py-2">
                  {t.satellite_verified ? (
                    <span className="badge-healthy">Verified</span>
                  ) : (
                    <span className="badge-unknown">Pending</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="btn-secondary text-xs"
                      disabled={scan.isPending}
                      onClick={() => scan.mutate(t.id)}
                    >
                      <RefreshCw className={`h-3 w-3 ${scan.isPending ? "animate-spin" : ""}`} />
                      Scan
                    </button>
                    <Link href={`/trees/${t.id}`} className="btn-primary text-xs">
                      <Radar className="h-3 w-3" />
                      NDVI
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {!treeList.isLoading && items.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-stone-500">
                  No trees yet —{" "}
                  <Link className="text-forest-700 underline" href="/trees/new">
                    register one
                  </Link>{" "}
                  to see it on the satellite map.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
