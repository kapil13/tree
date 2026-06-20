"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { trees, type Tree } from "@/lib/api";

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

export default function TreesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["trees"],
    queryFn: () => trees.list({ page_size: 100 }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Trees</h1>
        <Link href="/trees/new" className="btn-primary">
          <Plus className="h-4 w-4" /> Add tree
        </Link>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="min-w-full text-sm">
          <thead className="bg-stone-50 text-stone-600 dark:bg-stone-900">
            <tr>
              <th className="px-4 py-2 text-left">Public code</th>
              <th className="px-4 py-2 text-left">Species</th>
              <th className="px-4 py-2 text-left">Health</th>
              <th className="px-4 py-2 text-right">Carbon (kg)</th>
              <th className="px-4 py-2 text-left">Satellite</th>
              <th className="px-4 py-2 text-left">Registered</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-stone-500">
                  Loading…
                </td>
              </tr>
            )}
            {data?.items.map((t: Tree) => (
              <tr key={t.id} className="border-t border-stone-100 dark:border-stone-800">
                <td className="px-4 py-2 font-mono text-xs">{t.public_code}</td>
                <td className="px-4 py-2">{t.species_text || "—"}</td>
                <td className="px-4 py-2">{healthBadge(t.current_health)}</td>
                <td className="px-4 py-2 text-right">{Number(t.current_carbon_kg).toFixed(1)}</td>
                <td className="px-4 py-2">{t.satellite_verified ? "✓" : "—"}</td>
                <td className="px-4 py-2 text-stone-500">
                  {new Date(t.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/trees/${t.id}`} className="text-forest-700 hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {!isLoading && data?.items.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-stone-500">
                  No trees yet — <Link className="text-forest-700 underline" href="/trees/new">register one</Link>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
