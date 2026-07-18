"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Leaf, ShieldCheck } from "lucide-react";
import { ProjectWorkAreaMap } from "@/components/projects/project-work-area-map";
import { plantingProjects } from "@/lib/api";

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  const { data: project, isLoading } = useQuery({
    queryKey: ["planting-project", projectId],
    queryFn: () => plantingProjects.get(projectId),
  });

  const { data: workAreas = [] } = useQuery({
    queryKey: ["project-work-areas", projectId],
    queryFn: () => plantingProjects.workAreas(projectId),
    enabled: !!projectId,
  });

  if (isLoading || !project) {
    return <p className="text-sm text-stone-500">Loading project workspace…</p>;
  }

  const rules = project.active_standard?.rules ?? {};
  const spacing = rules.spacing_m as { min?: number } | null | undefined;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/projects" className="text-sm text-forest-700 hover:underline">
            ← All projects
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{project.name}</h1>
          <p className="text-sm text-stone-500">
            {project.code} · {project.segment.replace(/_/g, " ")} · {project.compliance_mode} mode
          </p>
        </div>
        <Link
          href={`/trees/new?project=${project.id}${workAreas[0] ? `&work_area=${workAreas[0].id}` : ""}`}
          className="btn-primary"
        >
          <Leaf className="h-4 w-4" />
          Register tree in project
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <p className="kpi-label">Trees planted</p>
          <p className="text-2xl font-semibold">{project.summary?.tree_count ?? 0}</p>
          {project.target_tree_count && (
            <p className="text-xs text-stone-500">Target {project.target_tree_count}</p>
          )}
        </div>
        <div className="card">
          <p className="kpi-label">Work areas</p>
          <p className="text-2xl font-semibold">{project.summary?.work_area_count ?? 0}</p>
        </div>
        <div className="card">
          <p className="kpi-label">Open violations</p>
          <p className="text-2xl font-semibold">{project.summary?.open_violations ?? 0}</p>
        </div>
        <div className="card">
          <p className="kpi-label">Progress</p>
          <p className="text-2xl font-semibold">
            {project.summary?.progress_pct != null ? `${project.summary.progress_pct}%` : "—"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="card">
          <h2 className="mb-3 text-sm font-medium">Draw work areas</h2>
          <p className="mb-4 text-xs text-stone-500">
            Polygon for blocks and green belts. Corridor (line + buffer) for highways and canals.
            Trees must be planted inside these boundaries.
          </p>
          <ProjectWorkAreaMap projectId={project.id} workAreas={workAreas} />
        </div>

        <aside className="card space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="h-4 w-4 text-forest-700" />
            Planting standard
          </div>
          {project.active_standard ? (
            <div className="space-y-2 text-sm text-stone-700">
              <p className="font-medium">{project.active_standard.name}</p>
              {spacing?.min != null && <p>Min spacing: {spacing.min} m</p>}
              {rules.pit_size_cm && (
                <p>
                  Pit:{" "}
                  {[
                    (rules.pit_size_cm as { length?: number }).length,
                    (rules.pit_size_cm as { width?: number }).width,
                    (rules.pit_size_cm as { depth?: number }).depth,
                  ]
                    .filter(Boolean)
                    .join("×")}{" "}
                  cm
                </p>
              )}
              {rules.max_gps_accuracy_m != null && (
                <p>Max GPS accuracy: {String(rules.max_gps_accuracy_m)} m</p>
              )}
              {rules.min_photos != null && <p>Min photos: {String(rules.min_photos)}</p>}
              <p className="text-xs text-stone-500">
                Layout: {String(rules.layout_pattern ?? "—")}
              </p>
            </div>
          ) : (
            <p className="text-sm text-stone-500">No standard attached.</p>
          )}

          {workAreas.length > 0 && (
            <div className="border-t border-stone-100 pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                Quick plant links
              </p>
              <ul className="mt-2 space-y-1">
                {workAreas.map((area) => (
                  <li key={area.id}>
                    <Link
                      href={`/trees/new?project=${project.id}&work_area=${area.id}`}
                      className="text-sm text-forest-800 hover:underline"
                    >
                      {area.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
