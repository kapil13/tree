"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Filter,
  Leaf,
  MapPin,
  Plus,
  Satellite,
  Search,
  TreePine,
} from "lucide-react";
import { trees, type Tree } from "@/lib/api";
import { cn } from "@/lib/cn";

const HEALTH_FILTERS = [
  { value: "all", label: "All" },
  { value: "healthy", label: "Healthy" },
  { value: "moderate", label: "Moderate" },
  { value: "unhealthy", label: "Unhealthy" },
  { value: "unknown", label: "Unknown" },
] as const;

function healthBadgeClass(h: string) {
  if (h === "healthy") return "dash-health-badge--healthy";
  if (h === "moderate") return "dash-health-badge--moderate";
  if (h === "unhealthy") return "dash-health-badge--unhealthy";
  return "dash-health-badge--unknown";
}

export function TreeRegistry() {
  const [health, setHealth] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["trees", health],
    queryFn: () =>
      trees.list({
        page_size: 200,
        ...(health !== "all" ? { health } : {}),
      }),
  });

  const filtered = useMemo(() => {
    const items = data?.items ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (t) =>
        t.public_code.toLowerCase().includes(q) ||
        (t.species_text?.toLowerCase().includes(q) ?? false),
    );
  }, [data?.items, search]);

  const stats = useMemo(() => {
    const items = data?.items ?? [];
    const totalCarbon = items.reduce((s, t) => s + Number(t.current_carbon_kg), 0);
    const verified = items.filter((t) => t.satellite_verified).length;
    const healthy = items.filter((t) => t.current_health === "healthy").length;
    return { total: items.length, totalCarbon, verified, healthy };
  }, [data?.items]);

  return (
    <div className="trees-shell space-y-6">
      <section className="trees-hero">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="trees-eyebrow">Tree registry</p>
            <h1 className="trees-title">Your living tree portfolio</h1>
            <p className="trees-subtitle">
              Every registered tree with health, carbon, satellite verification, and digital passport.
            </p>
          </div>
          <Link href="/trees/new" className="btn-primary px-5 py-2.5">
            <Plus className="h-4 w-4" /> Register tree
          </Link>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total trees", value: stats.total, icon: TreePine },
            { label: "Healthy", value: stats.healthy, icon: Leaf },
            { label: "Satellite verified", value: stats.verified, icon: Satellite },
            {
              label: "Carbon stored",
              value: `${(stats.totalCarbon / 1000).toFixed(2)} t`,
              icon: Leaf,
            },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="trees-stat">
              <Icon className="h-4 w-4 text-lime-400" />
              <p className="trees-stat-value">{value}</p>
              <p className="trees-stat-label">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            className="input w-full pl-9"
            placeholder="Search by code or species…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-stone-500" />
          {HEALTH_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition",
                health === f.value
                  ? "bg-forest-700 text-white"
                  : "border border-stone-200 bg-white text-stone-600 hover:border-forest-200",
              )}
              onClick={() => setHealth(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {error && (
        <div className="dash-panel border-rose-200 bg-rose-50 text-rose-800">
          Failed to load trees. Please sign in again or check API connectivity.
        </div>
      )}

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="dash-skeleton h-48 rounded-2xl" />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="trees-empty">
          <TreePine className="h-10 w-10 text-stone-400" />
          <h2 className="text-lg font-semibold text-stone-800">No trees found</h2>
          <p className="max-w-md text-sm text-stone-500">
            {search || health !== "all"
              ? "Try clearing filters or search terms."
              : "Register your first tree to start building your environmental portfolio."}
          </p>
          <Link href="/trees/new" className="btn-primary mt-2">
            <Plus className="h-4 w-4" /> Add your first tree
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((tree) => (
          <TreeCard key={tree.id} tree={tree} />
        ))}
      </div>
    </div>
  );
}

function TreeCard({ tree }: { tree: Tree }) {
  const co2e = (Number(tree.current_carbon_kg) * 44) / 12;

  return (
    <Link href={`/trees/${tree.id}`} className="trees-card group">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-stone-500">{tree.public_code}</p>
          <h2 className="mt-1 text-lg font-semibold text-stone-900 group-hover:text-forest-800">
            {tree.species_text || "Species pending"}
          </h2>
        </div>
        <span className={cn("dash-health-badge capitalize", healthBadgeClass(tree.current_health))}>
          {tree.current_health}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="trees-mini-metric">
          <p className="text-[10px] uppercase tracking-wide text-stone-500">Carbon</p>
          <p className="font-semibold text-stone-900">{Number(tree.current_carbon_kg).toFixed(1)} kg</p>
        </div>
        <div className="trees-mini-metric">
          <p className="text-[10px] uppercase tracking-wide text-stone-500">CO₂e</p>
          <p className="font-semibold text-stone-900">{co2e.toFixed(1)} kg</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-stone-500">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          {tree.latitude.toFixed(4)}, {tree.longitude.toFixed(4)}
        </span>
        <span className={tree.satellite_verified ? "text-sky-700" : "text-stone-400"}>
          {tree.satellite_verified ? "Satellite ✓" : "Satellite pending"}
        </span>
      </div>

      <div className="mt-4 text-xs font-medium text-forest-700 group-hover:underline">
        View tree passport →
      </div>
    </Link>
  );
}
