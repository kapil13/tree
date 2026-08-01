"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FolderKanban, Plus } from "lucide-react";
import { centralSchemes, plantingProjects } from "@/lib/api";
import { schemeByCode } from "@/lib/schemes";

const SEGMENT_LABEL: Record<string, string> = {
  nhai_highway: "NHAI / Highway",
  industrial_greenbelt: "Industrial / Mine",
  township_landscape: "Township / Society",
  ngo_watershed: "NGO / Watershed",
  general: "General",
};

export default function ProjectsPage() {
  const [schemeFilter, setSchemeFilter] = useState("");

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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Planting projects</h1>
          <p className="mt-1 text-sm text-stone-600">
            Tag projects to central schemes, draw work areas, then register trees with audit standards.
          </p>
        </div>
        <Link href="/projects/new" className="btn-primary">
          <Plus className="h-4 w-4" />
          New project
        </Link>
      </div>

      {schemes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="scheme-filter" className="text-sm font-medium text-stone-600">
            Central scheme
          </label>
          <select
            id="scheme-filter"
            className="input max-w-xs"
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

      {isLoading ? (
        <p className="text-sm text-stone-500">Loading projects…</p>
      ) : projects.length === 0 ? (
        <div className="card text-center">
          <FolderKanban className="mx-auto h-10 w-10 text-forest-700" />
          <h2 className="mt-3 text-lg font-medium">No projects yet</h2>
          <p className="mt-2 text-sm text-stone-600">
            Create a CAMPA, NHAI, MISHTI, or Nagar Van project to draw boundaries and enforce planting
            standards.
          </p>
          <Link href="/projects/new" className="btn-primary mt-4 inline-flex">
            Create first project
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
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
              {projects.map((project) => (
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
                    {project.scheme_code
                      ? schemeLabelByCode.get(project.scheme_code) ??
                        schemeByCode(schemes, project.scheme_code)?.label ??
                        project.scheme_code
                      : "—"}
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
                  <td className="px-4 py-3">{project.summary?.open_violations ?? 0}</td>
                  <td className="px-4 py-3">{project.summary?.work_area_count ?? 0}</td>
                  <td className="px-4 py-3 capitalize">{project.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
