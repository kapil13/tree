"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ExternalLink, MapPin, Plus, Satellite, Search, ShieldCheck, TreePine } from "lucide-react";
import { EmptyState, FilterBar, FilterField, MetricGrid, OperationalStatusBar, PageHeader } from "@/components/ui";
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

function mapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function satelliteBadge(verified: boolean) {
  if (verified) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800"
        title="Satellite verified"
      >
        <Satellite className="h-3 w-3" />
        Verified
      </span>
    );
  }
  return <span className="text-xs text-stone-400">—</span>;
}

function LocationLink({ latitude, longitude }: { latitude: number; longitude: number }) {
  return (
    <a
      href={mapsUrl(latitude, longitude)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-mono text-xs text-forest-700 hover:underline"
      title="Open in Google Maps"
    >
      <MapPin className="h-3 w-3 shrink-0" />
      {latitude.toFixed(4)}, {longitude.toFixed(4)}
      <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
    </a>
  );
}

export function TreeRegistry() {
  const tt = useTranslations("treesPage");
  const tc = useTranslations("chrome");
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

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects) map.set(p.id, p.name);
    return map;
  }, [projects]);

  const surveyIntervalByProjectId = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of projects) {
      const days = p.metadata?.survey_interval_days;
      map.set(p.id, typeof days === "number" ? days : 30);
    }
    return map;
  }, [projects]);

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

  function projectLabel(tree: (typeof filtered)[number]) {
    if (!tree.project_id) return "—";
    return projectNameById.get(tree.project_id) ?? "Unknown project";
  }

  function surveyIntervalFor(tree: (typeof filtered)[number]) {
    if (tree.project_id) {
      return surveyIntervalByProjectId.get(tree.project_id) ?? surveyIntervalDays;
    }
    return surveyIntervalDays;
  }

  function isGeotagDue(tree: (typeof filtered)[number]) {
    const dueDays = daysSince(tree.last_geotag_at);
    return dueDays != null && dueDays >= surveyIntervalFor(tree);
  }

  const showWorkAreaColumn = !workAreaId && filtered.some((t) => t.work_area_id);
  const showSurvivalColumn = filtered.some((t) => t.survival_status);
  const showGeotagColumn = filtered.some((t) => t.last_geotag_at);
  const showChainageColumn =
    showChainage && filtered.some((t) => t.chainage_km);

  const totalTrees = data?.total ?? 0;
  const hasActiveFilters =
    health !== "all" || !!projectId || !!workAreaId || !!search.trim();
  const isOrgEmpty = !isLoading && !error && totalTrees === 0 && !hasActiveFilters;
  const addHref = projectId
    ? `/trees/new?project=${projectId}${workAreaId ? `&work_area=${workAreaId}` : ""}`
    : "/trees/new";

  const registryStats = useMemo(() => {
    const items = filtered;
    const healthy = items.filter((t) => t.current_health === "healthy").length;
    const geotagDueCount = items.filter((t) => isGeotagDue(t)).length;
    const satelliteVerified = items.filter((t) => t.satellite_verified).length;
    const pctHealthy = items.length ? Math.round((healthy / items.length) * 100) : 0;
    return { healthy, geotagDueCount, satelliteVerified, pctHealthy };
  }, [filtered]);

  const registryStatus = useMemo(() => {
    if (isOrgEmpty) {
      return {
        tone: "neutral" as const,
        label: "Registry empty",
        summary: "Tag your first tree with GPS and a photo to start survival tracking and satellite health.",
      };
    }
    if (registryStats.geotagDueCount > 0) {
      return {
        tone: "attention" as const,
        label: "Geotag refresh needed",
        summary: `${registryStats.geotagDueCount} tree${registryStats.geotagDueCount === 1 ? "" : "s"} in view need a geotag or survival update.`,
      };
    }
    if (registryStats.pctHealthy < 60 && filtered.length > 0) {
      return {
        tone: "watch" as const,
        label: "Canopy stress in view",
        summary: `${registryStats.pctHealthy}% healthy in current filter — review stressed trees.`,
      };
    }
    return {
      tone: "healthy" as const,
      label: "Registry operational",
      summary: `${filtered.length} tree${filtered.length === 1 ? "" : "s"} in view · ${registryStats.pctHealthy}% healthy.`,
    };
  }, [filtered.length, isOrgEmpty, registryStats.geotagDueCount, registryStats.pctHealthy]);

  return (
    <div className="space-y-6">
      <PageHeader
        purpose={tt("purpose")}
        title={tt("title")}
        description={tt("description")}
        breadcrumbs={[{ label: tc("sectionOperate") }, { label: tc("breadcrumbTree") }]}
        actions={
          canAdd ? (
            <Link href={addHref} className="btn-primary">
              <Plus className="h-4 w-4" /> {tt("registerTree")}
            </Link>
          ) : null
        }
      />

      {!isOrgEmpty ? (
        <>
          <OperationalStatusBar
            tone={registryStatus.tone}
            label={registryStatus.label}
            summary={registryStatus.summary}
            icon={registryStatus.tone === "healthy" ? ShieldCheck : TreePine}
          />

          <MetricGrid
            columns={4}
            metrics={[
              {
                label: "In view",
                value: String(filtered.length),
                hint: `${totalTrees} total in org`,
              },
              {
                label: "Healthy",
                value: `${registryStats.pctHealthy}%`,
                hint: `${registryStats.healthy} trees`,
                tone: registryStats.pctHealthy >= 70 ? "positive" : "warning",
              },
              {
                label: "Geotag due",
                value: String(registryStats.geotagDueCount),
                hint: "Needs field refresh",
                tone: registryStats.geotagDueCount > 0 ? "warning" : "positive",
              },
              {
                label: "Satellite verified",
                value: String(registryStats.satelliteVerified),
                hint: "In current filter",
              },
            ]}
          />
        </>
      ) : null}

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
        <div className="space-y-4">
          <FilterBar>
            <FilterField label="Search" htmlFor="tree-search" className="lg:col-span-2 min-w-[14rem] flex-[2]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input
                  id="tree-search"
                  className="input w-full pl-9"
                  placeholder="Search code or species…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </FilterField>
            <FilterField label="Project" htmlFor="tree-project">
              <select
                id="tree-project"
                className="input w-full"
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
            </FilterField>
            <FilterField label="Work area" htmlFor="tree-work-area">
              <select
                id="tree-work-area"
                className="input w-full"
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
            </FilterField>
          </FilterBar>

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
                  const geotagDue = isGeotagDue(t);
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
                          {t.project_id ? (
                            <Link
                              href={`/projects/${t.project_id}`}
                              className="mt-1 block truncate text-xs text-forest-700 hover:underline"
                            >
                              {projectLabel(t)}
                            </Link>
                          ) : null}
                          {t.work_area_name ? (
                            <p className="mt-0.5 truncate text-xs text-stone-500">
                              {t.work_area_name}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          {healthBadge(t.current_health)}
                          {satelliteBadge(t.satellite_verified)}
                        </div>
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-stone-600">
                        <div>
                          <dt className="text-stone-400">Registered</dt>
                          <dd className="mt-0.5">
                            {new Date(t.created_at).toLocaleDateString()}
                          </dd>
                        </div>
                        {showSurvivalColumn ? (
                          <div>
                            <dt className="text-stone-400">Survival</dt>
                            <dd className="mt-0.5 capitalize">
                              {t.survival_status || "—"}
                            </dd>
                          </div>
                        ) : null}
                        {showGeotagColumn ? (
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
                        ) : null}
                        {showChainageColumn ? (
                          <div>
                            <dt className="text-stone-400">Chainage</dt>
                            <dd className="mt-0.5">{t.chainage_km || "—"}</dd>
                          </div>
                        ) : null}
                        <div className="col-span-2">
                          <dt className="text-stone-400">Location</dt>
                          <dd className="mt-0.5">
                            <LocationLink latitude={t.latitude} longitude={t.longitude} />
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
              <div className="intel-data-table-wrap hidden md:block">
                <table className="intel-data-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Project</th>
                      {showWorkAreaColumn ? <th>Work area</th> : null}
                      <th>Species</th>
                      <th>Health</th>
                      <th>Satellite</th>
                      <th>Registered</th>
                      {showSurvivalColumn ? <th>Survival</th> : null}
                      {showGeotagColumn ? <th>Last geotag</th> : null}
                      {showChainageColumn ? <th>Chainage</th> : null}
                      <th>Location</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((t) => {
                      const geotagDue = isGeotagDue(t);
                      return (
                        <tr key={t.id}>
                          <td className="font-mono text-xs">{t.public_code}</td>
                          <td className="max-w-[12rem]">
                            {t.project_id ? (
                              <Link
                                href={`/projects/${t.project_id}`}
                                className="line-clamp-2 text-forest-800 hover:underline"
                                title={projectLabel(t)}
                              >
                                {projectLabel(t)}
                              </Link>
                            ) : (
                              "—"
                            )}
                          </td>
                          {showWorkAreaColumn ? (
                            <td className="max-w-[10rem] text-stone-600">
                              <span className="line-clamp-2" title={t.work_area_name ?? undefined}>
                                {t.work_area_name || "—"}
                              </span>
                            </td>
                          ) : null}
                          <td>{t.species_text || "—"}</td>
                          <td>{healthBadge(t.current_health)}</td>
                          <td>{satelliteBadge(t.satellite_verified)}</td>
                          <td className="whitespace-nowrap text-stone-600">
                            {new Date(t.created_at).toLocaleDateString()}
                          </td>
                          {showSurvivalColumn ? (
                            <td className="capitalize">{t.survival_status || "—"}</td>
                          ) : null}
                          {showGeotagColumn ? (
                            <td>
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
                          ) : null}
                          {showChainageColumn ? (
                            <td className="text-stone-500">{t.chainage_km || "—"}</td>
                          ) : null}
                          <td>
                            <LocationLink latitude={t.latitude} longitude={t.longitude} />
                          </td>
                          <td className="text-right">
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
