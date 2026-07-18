"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { plantingProjects, type Tree, type WorkArea } from "@/lib/api";

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

export function ProjectTreesByArea({
  projectId,
  workAreas,
}: {
  projectId: string;
  workAreas: WorkArea[];
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["project-trees-all", projectId],
    queryFn: () => plantingProjects.projectTrees(projectId, { page_size: 200 }),
  });

  const trees = data?.items ?? [];

  if (isLoading) return <p className="text-sm text-stone-500">Loading trees…</p>;

  if (!workAreas.length) {
    return (
      <p className="text-sm text-stone-600">
        Draw a work area first, then register trees inside it.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {workAreas.map((area) => {
        const areaTrees = trees.filter((t) => t.work_area_id === area.id);
        return (
          <section key={area.id} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-medium text-stone-900">{area.name}</h3>
                <p className="text-xs text-stone-500">
                  {area.geometry_type} · {area.tree_count} trees ·{" "}
                  {area.area_ha != null ? `${area.area_ha.toFixed(2)} ha` : "—"}
                </p>
              </div>
              <Link
                href={`/trees/new?project=${projectId}&work_area=${area.id}`}
                className="text-sm text-forest-700 hover:underline"
              >
                Add tree here
              </Link>
            </div>
            <TreeMiniTable trees={areaTrees} />
          </section>
        );
      })}
      {trees.filter((t) => !t.work_area_id).length > 0 && (
        <section className="space-y-2">
          <h3 className="font-medium text-stone-900">Unassigned to work area</h3>
          <TreeMiniTable trees={trees.filter((t) => !t.work_area_id)} />
        </section>
      )}
    </div>
  );
}

function TreeMiniTable({ trees }: { trees: Tree[] }) {
  if (!trees.length) {
    return <p className="text-sm text-stone-500">No trees in this area yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-stone-200">
      <table className="min-w-full text-sm">
        <thead className="bg-stone-50 text-left text-stone-600">
          <tr>
            <th className="px-3 py-2 font-medium">Code</th>
            <th className="px-3 py-2 font-medium">Species</th>
            <th className="px-3 py-2 font-medium">Health</th>
            <th className="px-3 py-2 font-medium">Survival</th>
            <th className="px-3 py-2 font-medium">Last geotag</th>
            <th className="px-3 py-2 font-medium">Chainage</th>
            <th className="px-3 py-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {trees.map((t) => (
            <tr key={t.id} className="border-t border-stone-100 hover:bg-stone-50">
              <td className="px-3 py-2 font-mono text-xs">{t.public_code}</td>
              <td className="px-3 py-2">{t.species_text || "—"}</td>
              <td className="px-3 py-2">{healthBadge(t.current_health)}</td>
              <td className="px-3 py-2 capitalize">{t.survival_status || "—"}</td>
              <td className="px-3 py-2 text-stone-500">
                {t.last_geotag_at ? new Date(t.last_geotag_at).toLocaleDateString() : "—"}
              </td>
              <td className="px-3 py-2 text-stone-500">{t.chainage_km || "—"}</td>
              <td className="px-3 py-2 text-right">
                <Link href={`/trees/${t.id}`} className="text-forest-700 hover:underline">
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
