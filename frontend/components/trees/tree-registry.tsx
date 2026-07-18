"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { plantingProjects, trees } from "@/lib/api";
import { cn } from "@/lib/cn";

const HEALTH_FILTERS = [
  { value: "all", label: "All" },
  { value: "healthy", label: "Healthy" },
  { value: "moderate", label: "Moderate" },
  { value: "unhealthy", label: "Unhealthy" },
  { value: "unknown", label: "Unknown" },
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

function daysSince(iso: string | null | undefined) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function TreeRegistry() {
  const [health, setHealth] = useState("all");
  const [search, setSearch] = useState("");
  const [projectId, setProjectId] = useState("");
  const [workAreaId, setWorkAreaId] = useState("");

  const { data: projectsData } = useQuery({
    queryKey: ["planting-projects"],
    queryFn: () => plantingProjects.list(),
  });

  const { data: workAreas = [] } = useQuery({
    queryKey: ["project-work-areas", projectId],
    queryFn: () => plantingProjects.workAreas(projectId),
    enabled: !!projectId,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["trees", health, projectId, workAreaId],
    queryFn: () =>
      trees.list({
        page_size: 200,
        ...(health !== "all" ? { health } : {}),
        ...(projectId ? { project_id: projectId } : {}),
        ...(workAreaId ? { work_area_id: workAreaId } : {}),
      }),
  });

  const filtered = useMemo(() => {
    let items = data?.items ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (t) =>
        t.public_code.toLowerCase().includes(q) ||
        (t.species_text?.toLowerCase().includes(q) ?? false),
    );
  }, [data?.items, search]);

  const projects = projectsData?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Trees</h1>
          <p className="text-sm text-stone-500">
            {filtered.length} of {data?.total ?? filtered.length} trees
            {projectId ? " in selected project" : ""}
          </p>
        </div>
        <Link
          href={
            projectId
              ? `/trees/new?project=${projectId}${workAreaId ? `&work_area=${workAreaId}` : ""}`
              : "/trees/new"
          }
          className="btn-primary"
        >
          <Plus className="h-4 w-4" /> Add tree
        </Link>
      </div>

      <div className="card space-y-4">
        <div className="grid gap-3 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              className="input w-full pl-9"
              placeholder="Search code or species…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input"
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              setWorkAreaId("");
            }}
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={workAreaId}
            onChange={(e) => setWorkAreaId(e.target.value)}
            disabled={!projectId}
          >
            <option value="">All work areas</option>
            {workAreas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
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
                <th className="px-4 py-2.5 font-medium">Survival</th>
                <th className="px-4 py-2.5 font-medium">Last geotag</th>
                <th className="px-4 py-2.5 font-medium">Chainage</th>
                <th className="px-4 py-2.5 font-medium">Location</th>
                <th className="px-4 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-stone-500">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-stone-500">
                    No trees match your filters.
                  </td>
                </tr>
              )}
              {filtered.map((t) => {
                const dueDays = daysSince(t.last_geotag_at);
                const geotagDue = dueDays != null && dueDays >= 30;
                return (
                  <tr key={t.id} className="border-t border-stone-100 hover:bg-stone-50/80">
                    <td className="px-4 py-2.5 font-mono text-xs">{t.public_code}</td>
                    <td className="px-4 py-2.5">{t.species_text || "—"}</td>
                    <td className="px-4 py-2.5">{healthBadge(t.current_health)}</td>
                    <td className="px-4 py-2.5 capitalize">{t.survival_status || "—"}</td>
                    <td className="px-4 py-2.5">
                      {t.last_geotag_at ? (
                        <span className={geotagDue ? "font-medium text-amber-800" : "text-stone-500"}>
                          {new Date(t.last_geotag_at).toLocaleDateString()}
                          {geotagDue ? " · due" : ""}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-stone-500">{t.chainage_km || "—"}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-stone-500">
                      {t.latitude.toFixed(4)}, {t.longitude.toFixed(4)}
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
