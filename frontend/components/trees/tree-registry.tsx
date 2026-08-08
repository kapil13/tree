"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, TreePine } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { plantingProjects, trees } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { canWriteInApp, userHasProfessionalAccess } from "@/lib/nav-access";
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
  const { user } = useAuth();
  const canAdd = canWriteInApp(user);
  const showChainage = userHasProfessionalAccess(user);
  const [health, setHealth] = useState("all");
  const [search, setSearch] = useState("");
  const [projectId, setProjectId] = useState("");
  const [workAreaId, setWorkAreaId] = useState("");

  const { data: projectsData } = useQuery({
    queryKey: ["planting-projects"],
    queryFn: () => plantingProjects.list(),
  });

  const projects = projectsData?.items ?? [];

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === projectId),
    [projects, projectId],
  );
  const surveyIntervalDays =
    (selectedProject?.metadata?.survey_interval_days as number | undefined) ?? 30;

  const { data: workAreas = [] } = useQuery({
    queryKey: ["project-work-areas", projectId],
    queryFn: () => plantingProjects.workAreas(projectId),
    enabled: !!projectId,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["trees", health, projectId, workAreaId],
    queryFn: () =>
      trees.list({
        page_size: 100,
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

  const totalTrees = data?.total ?? 0;
  const hasActiveFilters =
    health !== "all" || !!projectId || !!workAreaId || !!search.trim();
  const isOrgEmpty = !isLoading && !error && totalTrees === 0 && !hasActiveFilters;
  const addHref = projectId
    ? `/trees/new?project=${projectId}${workAreaId ? `&work_area=${workAreaId}` : ""}`
    : "/trees/new";

  return (
    <div className="space-y-4">
      <PageHeader
        title="Trees"
        description={
          isLoading
            ? "Loading registry…"
            : `${filtered.length} of ${data?.total ?? filtered.length} trees${
                projectId ? " in selected project" : ""
              }`
        }
        breadcrumbs={[{ label: "Operate" }, { label: "Trees" }]}
        actions={
          canAdd ? (
            <Link href={addHref} className="btn-primary">
              <Plus className="h-4 w-4" /> Add tree
            </Link>
          ) : null
        }
      />

      {isOrgEmpty ? (
        <EmptyState
          icon={TreePine}
          title="No trees yet"
          description="Tag your first tree with GPS and a photo to start survival tracking and satellite health."
          action={
            canAdd
              ? { label: "Tag first tree", href: "/trees/new" }
              : undefined
          }
        />
      ) : (
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
            <p className="text-sm text-rose-700">
              Failed to load trees. Check your session and API.
            </p>
          )}

          {isLoading ? (
            <p className="py-8 text-center text-sm text-stone-500">Loading…</p>
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No trees match your filters"
              description="Try another health status, project, or clear search."
              action={
                canAdd
                  ? { label: "Add tree", href: addHref }
                  : { label: "Clear filters", onClick: () => {
                      setHealth("all");
                      setProjectId("");
                      setWorkAreaId("");
                      setSearch("");
                    } }
              }
              className="border-0 bg-transparent py-8"
            />
          ) : (
            <>
              {/* Mobile cards */}
              <section className="space-y-3 md:hidden">
                {filtered.map((t) => {
                  const dueDays = daysSince(t.last_geotag_at);
                  const geotagDue = dueDays != null && dueDays >= surveyIntervalDays;
                  return (
                    <article
                      key={t.id}
                      className="rounded-xl border border-stone-200 bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            href={`/trees/${t.id}`}
                            className="font-semibold text-forest-900 hover:underline"
                          >
                            {t.species_text || "Unknown species"}
                          </Link>
                          <p className="mt-0.5 font-mono text-xs text-stone-500">
                            {t.public_code}
                          </p>
                        </div>
                        {healthBadge(t.current_health)}
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-stone-600">
                        <div>
                          <dt className="text-stone-400">Survival</dt>
                          <dd className="mt-0.5 capitalize">
                            {t.survival_status || "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-stone-400">Last geotag</dt>
                          <dd
                            className={cn(
                              "mt-0.5",
                              geotagDue && "font-medium text-amber-800",
                            )}
                          >
                            {t.last_geotag_at
                              ? `${new Date(t.last_geotag_at).toLocaleDateString()}${
                                  geotagDue ? " · due" : ""
                                }`
                              : "—"}
                          </dd>
                        </div>
                        {showChainage ? (
                          <div>
                            <dt className="text-stone-400">Chainage</dt>
                            <dd className="mt-0.5">{t.chainage_km || "—"}</dd>
                          </div>
                        ) : null}
                        <div>
                          <dt className="text-stone-400">Location</dt>
                          <dd className="mt-0.5 font-mono">
                            {t.latitude.toFixed(4)}, {t.longitude.toFixed(4)}
                          </dd>
                        </div>
                      </dl>
                      <Link
                        href={`/trees/${t.id}`}
                        className="btn-secondary mt-3 w-full justify-center text-xs"
                      >
                        View tree
                      </Link>
                    </article>
                  );
                })}
              </section>

              {/* Desktop table */}
              <div className="hidden overflow-x-auto rounded-lg border border-stone-200 md:block">
                <table className="min-w-full text-sm">
                  <thead className="bg-stone-50 text-left text-stone-600">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Code</th>
                      <th className="px-4 py-2.5 font-medium">Species</th>
                      <th className="px-4 py-2.5 font-medium">Health</th>
                      <th className="px-4 py-2.5 font-medium">Survival</th>
                      <th className="px-4 py-2.5 font-medium">Last geotag</th>
                      {showChainage ? (
                        <th className="px-4 py-2.5 font-medium">Chainage</th>
                      ) : null}
                      <th className="px-4 py-2.5 font-medium">Location</th>
                      <th className="px-4 py-2.5 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((t) => {
                      const dueDays = daysSince(t.last_geotag_at);
                      const geotagDue =
                        dueDays != null && dueDays >= surveyIntervalDays;
                      return (
                        <tr
                          key={t.id}
                          className="border-t border-stone-100 hover:bg-stone-50/80"
                        >
                          <td className="px-4 py-2.5 font-mono text-xs">
                            {t.public_code}
                          </td>
                          <td className="px-4 py-2.5">{t.species_text || "—"}</td>
                          <td className="px-4 py-2.5">
                            {healthBadge(t.current_health)}
                          </td>
                          <td className="px-4 py-2.5 capitalize">
                            {t.survival_status || "—"}
                          </td>
                          <td className="px-4 py-2.5">
                            {t.last_geotag_at ? (
                              <span
                                className={
                                  geotagDue
                                    ? "font-medium text-amber-800"
                                    : "text-stone-500"
                                }
                              >
                                {new Date(t.last_geotag_at).toLocaleDateString()}
                                {geotagDue ? " · due" : ""}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          {showChainage ? (
                            <td className="px-4 py-2.5 text-stone-500">
                              {t.chainage_km || "—"}
                            </td>
                          ) : null}
                          <td className="px-4 py-2.5 font-mono text-xs text-stone-500">
                            {t.latitude.toFixed(4)}, {t.longitude.toFixed(4)}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <Link
                              href={`/trees/${t.id}`}
                              className="text-forest-700 hover:underline"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
