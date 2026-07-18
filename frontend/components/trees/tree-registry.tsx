"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { trees } from "@/lib/api";
import { cn } from "@/lib/cn";

const HEALTH_FILTERS = [
  { value: "all", label: "All" },
  { value: "healthy", label: "Healthy" },
  { value: "moderate", label: "Moderate" },
  { value: "unhealthy", label: "Unhealthy" },
  { value: "unknown", label: "Unknown" },
] as const;

const SATELLITE_FILTERS = [
  { value: "all", label: "All satellite" },
  { value: "verified", label: "Verified" },
  { value: "pending", label: "Pending" },
] as const;

function healthBadge(h: string) {
  const cls =
    h === "healthy"
      ? "badge-healthy"
      : h === "moderate"
        ? "badge-moderate"
        : h === "unhealthy"
          ? "badge-unhealthy"
          : "badge-unknown";
  return <span className={cls}>{h}</span>;
}

export function TreeRegistry() {
  const [health, setHealth] = useState("all");
  const [satellite, setSatellite] = useState("all");
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
    let items = data?.items ?? [];
    if (satellite === "verified") items = items.filter((t) => t.satellite_verified);
    if (satellite === "pending") items = items.filter((t) => !t.satellite_verified);
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (t) =>
        t.public_code.toLowerCase().includes(q) ||
        (t.species_text?.toLowerCase().includes(q) ?? false),
    );
  }, [data?.items, search, satellite]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Trees</h1>
          <p className="text-sm text-stone-500">
            {filtered.length} of {data?.total ?? filtered.length} trees shown
          </p>
        </div>
        <Link href="/trees/new" className="btn-primary">
          <Plus className="h-4 w-4" /> Add tree
        </Link>
      </div>

      <div className="card space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              className="input w-full pl-9"
              placeholder="Search code or species…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {HEALTH_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium",
                  health === f.value
                    ? "bg-forest-700 text-white"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200",
                )}
                onClick={() => setHealth(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {SATELLITE_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium",
                  satellite === f.value
                    ? "bg-sky-700 text-white"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200",
                )}
                onClick={() => setSatellite(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-rose-700">Failed to load trees. Check your session and API.</p>
        )}

        <div className="overflow-x-auto rounded-lg border border-stone-200">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-50 text-left text-stone-600">
              <tr>
                <th className="px-4 py-2.5 font-medium">Code</th>
                <th className="px-4 py-2.5 font-medium">Species</th>
                <th className="px-4 py-2.5 font-medium">Health</th>
                <th className="px-4 py-2.5 font-medium text-right">Carbon (kg)</th>
                <th className="px-4 py-2.5 font-medium text-right">CO₂e (kg)</th>
                <th className="px-4 py-2.5 font-medium">Satellite</th>
                <th className="px-4 py-2.5 font-medium">Location</th>
                <th className="px-4 py-2.5 font-medium">Registered</th>
                <th className="px-4 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-stone-500">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-stone-500">
                    No trees match your filters.{" "}
                    <Link href="/trees/new" className="text-forest-700 underline">
                      Register one
                    </Link>
                  </td>
                </tr>
              )}
              {filtered.map((t) => {
                const co2e = (Number(t.current_carbon_kg) * 44) / 12;
                return (
                  <tr key={t.id} className="border-t border-stone-100 hover:bg-stone-50/80">
                    <td className="px-4 py-2.5 font-mono text-xs">{t.public_code}</td>
                    <td className="px-4 py-2.5">{t.species_text || "—"}</td>
                    <td className="px-4 py-2.5">{healthBadge(t.current_health)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {Number(t.current_carbon_kg).toFixed(1)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{co2e.toFixed(1)}</td>
                    <td className="px-4 py-2.5">
                      {t.satellite_verified ? (
                        <span className="text-sky-700">Verified</span>
                      ) : (
                        <span className="text-stone-400">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-stone-500">
                      {t.latitude.toFixed(4)}, {t.longitude.toFixed(4)}
                    </td>
                    <td className="px-4 py-2.5 text-stone-500">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Link href={`/trees/${t.id}`} className="text-forest-700 hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
