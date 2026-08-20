"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FolderKanban, Plus, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { centralSchemes, plantingProjects } from "@/lib/api";
import { projectSecondaryHref } from "@/lib/project-focused-ui";
import { schemeByCode } from "@/lib/schemes";

const SEGMENT_LABEL: Record<string, string> = {
  nhai_highway: "NHAI / Highway",
  industrial_greenbelt: "Industrial / Mine",
  township_landscape: "Township / Society",
  nagar_van_urban: "Nagar Van / Urban forest",
  sahakar_van_coop: "Sahakar Van / Cooperative forest",
  ngo_watershed: "NGO / Watershed",
  general: "General",
};

export default function ProjectsPage() {
  const [schemeFilter, setSchemeFilter] = useState("");
  const [search, setSearch] = useState("");

  const { data: schemes = [] } = useQuery({
    queryKey: ["central-schemes"],
    queryFn: () => centralSchemes.list(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["planting-projects", schemeFilter],
    queryFn: () =>
      plantingProjects.list(schemeFilter ? { scheme_code: schemeFilter } : undefined),
  });

  const projects = data?.items ?? [];

  const schemeLabelByCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const scheme of schemes) {
      map.set(scheme.code, scheme.label);
    }
    return map;
  }, [schemes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q),
    );
  }, [projects, search]);

  function schemeLabel(code: string | null | undefined) {
    if (!code) return "—";
    return (
      schemeLabelByCode.get(code) ?? schemeByCode(schemes, code)?.label ?? code
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Planting projects"
        description="Tag projects to central schemes, draw work areas, then register trees with audit standards."
        breadcrumbs={[{ label: "Operate" }, { label: "Projects" }]}
        actions={
          <Link href="/projects/new" className="btn-primary">
            <Plus className="h-4 w-4" />
            New project
          </Link>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        {schemes.length > 0 && (
          <div className="min-w-[12rem] flex-1 sm:flex-none">
            <label htmlFor="scheme-filter" className="mb-1 block text-sm font-medium text-stone-600">
              Central scheme
            </label>
            <select
              id="scheme-filter"
              className="input w-full max-w-xs"
              value={schemeFilter}
              onChange={(e) => setSchemeFilter(e.target.value)}
            >
              <option value="">All schemes</option>
              {schemes.map((scheme) => (
                <option key={scheme.code} value={scheme.code}>
                  {scheme.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="relative min-w-[12rem] flex-1">
          <label htmlFor="project-search" className="mb-1 block text-sm font-medium text-stone-600">
            Search
          </label>
          <Search className="pointer-events-none absolute bottom-2.5 left-3 h-4 w-4 text-stone-400" />
          <input
            id="project-search"
            className="input w-full pl-9"
            placeholder="Search by name or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-stone-500">Loading projects…</p>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create a CAMPA, NHAI, MISHTI, or Nagar Van project to draw boundaries and enforce planting standards."
          action={{ label: "Create first project", href: "/projects/new" }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No matching projects"
          description="Try a different name, code, or clear the scheme filter."
          action={{ label: "Clear search", onClick: () => setSearch("") }}
        />
      ) : (
        <>
          {/* Mobile cards */}
          <section className="space-y-3 md:hidden">
            {filtered.map((project) => {
              const violations = project.summary?.open_violations ?? 0;
              return (
                <article
                  key={project.id}
                  className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/projects/${project.id}`}
                        className="font-semibold text-forest-900 hover:underline"
                      >
                        {project.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-stone-500">{project.code}</p>
                    </div>
                    <span className="shrink-0 rounded-md bg-stone-100 px-2 py-0.5 text-xs capitalize text-stone-700">
                      {project.status}
                    </span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-stone-600">
                    <div>
                      <dt className="text-stone-400">Scheme</dt>
                      <dd className="mt-0.5 font-medium text-stone-800">
                        {schemeLabel(project.scheme_code)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-stone-400">Segment</dt>
                      <dd className="mt-0.5 font-medium capitalize text-stone-800">
                        {SEGMENT_LABEL[project.segment] ?? project.segment.replace(/_/g, " ")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-stone-400">Progress</dt>
                      <dd className="mt-0.5 font-medium text-stone-800">
                        {project.summary?.progress_pct != null
                          ? `${project.summary.progress_pct.toFixed(0)}%`
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-stone-400">Violations</dt>
                      <dd className="mt-0.5 font-medium">
                        {violations > 0 ? (
                          <Link
                            href={projectSecondaryHref(project.id, "compliance")}
                            className="text-amber-800 hover:underline"
                          >
                            {violations} open
                          </Link>
                        ) : (
                          <span className="text-stone-800">0</span>
                        )}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex gap-2">
                    <Link
                      href={`/projects/${project.id}`}
                      className="btn-secondary flex-1 justify-center text-xs"
                    >
                      Open
                    </Link>
                    {violations > 0 ? (
                      <Link
                        href={projectSecondaryHref(project.id, "compliance")}
                        className="btn-secondary flex-1 justify-center text-xs"
                      >
                        Compliance
                      </Link>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </section>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border border-stone-200 bg-white md:block">
            <table className="w-full min-w-[44rem] text-sm">
              <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Central scheme</th>
                  <th className="px-4 py-3">Segment</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Violations</th>
                  <th className="px-4 py-3">Areas</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((project) => {
                  const violations = project.summary?.open_violations ?? 0;
                  return (
                    <tr key={project.id} className="border-t border-stone-100 hover:bg-stone-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/projects/${project.id}`}
                          className="font-medium text-forest-800 hover:underline"
                        >
                          {project.name}
                        </Link>
                        <div className="text-xs text-stone-500">{project.code}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-stone-700">
                        {schemeLabel(project.scheme_code)}
                      </td>
                      <td className="px-4 py-3 capitalize">
                        {SEGMENT_LABEL[project.segment] ?? project.segment.replace(/_/g, " ")}
                      </td>
                      <td className="px-4 py-3 capitalize">{project.compliance_mode}</td>
                      <td className="px-4 py-3">
                        {project.summary?.progress_pct != null
                          ? `${project.summary.progress_pct.toFixed(0)}%`
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {violations > 0 ? (
                          <Link
                            href={projectSecondaryHref(project.id, "compliance")}
                            className="font-medium text-amber-800 hover:underline"
                          >
                            {violations}
                          </Link>
                        ) : (
                          0
                        )}
                      </td>
                      <td className="px-4 py-3">{project.summary?.work_area_count ?? 0}</td>
                      <td className="px-4 py-3 capitalize">{project.status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
