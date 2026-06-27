"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LineChart, Radar, RefreshCw, Satellite as SatelliteIcon } from "lucide-react";
import { dashboard, errorMessage, trees, type Tree } from "@/lib/api";

export default function SatellitePage() {
  const qc = useQueryClient();
  const dash = useQuery({ queryKey: ["dashboard"], queryFn: dashboard.get });
  const treeList = useQuery({ queryKey: ["trees"], queryFn: () => trees.list({ page_size: 100 }) });

  const scan = useMutation({
    mutationFn: (treeId: string) => trees.scanSatellite(treeId),
    onSuccess: () => {
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
            Sentinel-2 NDVI monitoring verifies vegetation at each registered tree.
            New trees are queued for a baseline scan; open a tree for the full NDVI chart.
          </p>
        </div>
        <Link href="/trees" className="btn-secondary">
          <LineChart className="h-4 w-4" />
          All trees
        </Link>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <div className="text-xs uppercase tracking-wide text-stone-500">Trees monitored</div>
          <div className="mt-1 text-2xl font-semibold">{k?.total_trees ?? "—"}</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase tracking-wide text-stone-500">Satellite verified</div>
          <div className="mt-1 text-2xl font-semibold text-forest-700">
            {k ? `${k.pct_satellite_verified}%` : "—"}
          </div>
          <div className="text-xs text-stone-500">
            {verified} verified · {pending} pending
          </div>
        </div>
        <div className="card">
          <div className="text-xs uppercase tracking-wide text-stone-500">Data source</div>
          <div className="mt-1 flex items-center gap-2 text-lg font-medium">
            <SatelliteIcon className="h-5 w-5 text-forest-700" />
            Sentinel-2 L2A
          </div>
          <div className="text-xs text-stone-500">NDVI / EVI · 10 m · monthly series</div>
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="text-sm font-medium text-stone-800">How it works</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-stone-700">
          <li>Register a tree with GPS — a baseline Sentinel-2 scan is queued automatically.</li>
          <li>NDVI is sampled in a ~30 m box around the tree (cloud-free scenes, max 20% cloud).</li>
          <li>
            <code className="rounded bg-stone-100 px-1">satellite_verified</code> is set when mean
            NDVI ≥ 0.25 (vegetation present).
          </li>
          <li>Open any tree below for the 12-month NDVI time-series chart.</li>
        </ol>
        <p className="text-xs text-stone-500">
          Dev mode uses synthetic NDVI unless{" "}
          <code className="rounded bg-stone-100 px-1">SENTINEL_HUB_CLIENT_ID</code> is set in{" "}
          <code className="rounded bg-stone-100 px-1">backend/.env</code>. Plantation-level maps
          arrive in a follow-up sprint.
        </p>
      </div>

      {scan.error && (
        <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errorMessage(scan.error)}
        </div>
      )}

      <div className="card overflow-hidden p-0">
        <div className="border-b border-stone-100 bg-stone-50 px-4 py-2 text-sm font-medium dark:border-stone-800 dark:bg-stone-900">
          Per-tree satellite status
        </div>
        <table className="min-w-full text-sm">
          <thead className="bg-stone-50 text-stone-600 dark:bg-stone-900">
            <tr>
              <th className="px-4 py-2 text-left">Tree</th>
              <th className="px-4 py-2 text-left">Species</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {treeList.isLoading && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-stone-500">
                  Loading trees…
                </td>
              </tr>
            )}
            {items.map((t: Tree) => (
              <tr key={t.id} className="border-t border-stone-100 dark:border-stone-800">
                <td className="px-4 py-2 font-mono text-xs">{t.public_code}</td>
                <td className="px-4 py-2">{t.species_text || "—"}</td>
                <td className="px-4 py-2">
                  {t.satellite_verified ? (
                    <span className="badge-healthy">Verified</span>
                  ) : (
                    <span className="badge-unknown">Pending scan</span>
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
                      Scan now
                    </button>
                    <Link href={`/trees/${t.id}`} className="btn-primary text-xs">
                      <Radar className="h-3 w-3" />
                      NDVI chart
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {!treeList.isLoading && items.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-stone-500">
                  No trees yet —{" "}
                  <Link className="text-forest-700 underline" href="/trees/new">
                    register one
                  </Link>{" "}
                  to start satellite monitoring.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
