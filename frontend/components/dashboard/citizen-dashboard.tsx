"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Leaf, Map, Sparkles, TreePine } from "lucide-react";
import { AiScanUsagePanel } from "@/components/settings/ai-scan-usage-panel";
import { DataTrustBanner } from "@/components/data-trust-banner";
import { dashboard, trees } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";

export function CitizenDashboard() {
  const { user } = useAuth();
  const { data: dash, isLoading: dashLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: dashboard.get,
  });
  const { data: treePage, isLoading: treesLoading } = useQuery({
    queryKey: ["trees-citizen-home"],
    queryFn: () => trees.list({ page_size: 5 }),
  });

  const loading = dashLoading || treesLoading;
  const treeCount = dash?.kpi?.total_trees ?? treePage?.total ?? 0;
  const recent = treePage?.items ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-sm font-medium text-forest-700">Welcome{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}</p>
        <h1 className="mt-1 text-2xl font-semibold text-stone-900 dark:text-stone-50">
          Your trees
        </h1>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
          Tag trees you plant or care for, track them on the map, and use complimentary AI health scans.
        </p>
      </div>

      <DataTrustBanner compact />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card">
          <p className="kpi-label">Trees tagged</p>
          <p className="text-2xl font-semibold">{loading ? "…" : treeCount}</p>
        </div>
        <div className="card sm:col-span-2">
          <AiScanUsagePanel compact />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/trees/new" className="card group flex items-center gap-3 transition hover:border-forest-300">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-100 text-forest-800">
            <Leaf className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-stone-900 dark:text-stone-50">Add a tree</p>
            <p className="text-xs text-stone-500">GPS + photos</p>
          </div>
          <ArrowRight className="h-4 w-4 text-stone-400 group-hover:text-forest-700" />
        </Link>
        <Link href="/map" className="card group flex items-center gap-3 transition hover:border-forest-300">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-800">
            <Map className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-stone-900 dark:text-stone-50">Open map</p>
            <p className="text-xs text-stone-500">See your pins</p>
          </div>
          <ArrowRight className="h-4 w-4 text-stone-400 group-hover:text-forest-700" />
        </Link>
        <Link href="/settings/programs" className="card group flex items-center gap-3 transition hover:border-forest-300">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-stone-900 dark:text-stone-50">Programs</p>
            <p className="text-xs text-stone-500">NHAI / ESG access</p>
          </div>
          <ArrowRight className="h-4 w-4 text-stone-400 group-hover:text-forest-700" />
        </Link>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <TreePine className="h-4 w-4 text-forest-700" />
            Recent trees
          </h2>
          <Link href="/trees" className="text-sm text-forest-700 hover:underline">
            View all
          </Link>
        </div>
        {loading ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : recent.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 px-4 py-8 text-center dark:border-stone-700">
            <p className="text-sm text-stone-600 dark:text-stone-300">No trees yet — tag your first one.</p>
            <Link href="/trees/new" className="btn-primary mt-4 inline-flex">
              <Leaf className="h-4 w-4" />
              Tag your first tree
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-stone-100 dark:divide-stone-800">
            {recent.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/trees/${t.id}`}
                  className="flex items-center justify-between py-2.5 text-sm hover:text-forest-800"
                >
                  <span className="font-medium">{t.species_text || "Unknown species"}</span>
                  <span className="text-xs text-stone-500">{t.public_code}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
