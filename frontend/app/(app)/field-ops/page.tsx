"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ClipboardList, FolderKanban, TreePine } from "lucide-react";
import { plantingProjects } from "@/lib/api";

const SEGMENT_LABEL: Record<string, string> = {
  nhai_highway: "NHAI / Highway",
  industrial_greenbelt: "Mine / Green belt",
  township_landscape: "Township / Society",
  ngo_watershed: "NGO / Watershed",
  general: "General",
};

export default function FieldOpsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["field-ops-summary"],
    queryFn: () => plantingProjects.fieldOpsSummary(),
  });

  if (isLoading || !data) {
    return <p className="text-sm text-stone-500">Loading field operations…</p>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Field operations</h1>
        <p className="mt-1 text-sm text-stone-600">
          Supervisor view across NHAI packages, mine green belts, and society blocks.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={FolderKanban} label="Projects" value={String(data.project_count)} />
        <KpiCard icon={TreePine} label="Trees registered" value={String(data.tree_count)} />
        <KpiCard
          icon={AlertTriangle}
          label="Open violations"
          value={String(data.open_violations)}
          warn={data.open_violations > 0}
        />
        <KpiCard
          icon={ClipboardList}
          label="Survival survey due"
          value={String(data.survival_due)}
          warn={data.survival_due > 0}
        />
      </div>

      <section className="card">
        <h2 className="text-lg font-medium">Projects by segment</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(data.by_segment).map(([seg, count]) => (
            <span key={seg} className="rounded-full bg-stone-100 px-3 py-1 text-sm">
              {SEGMENT_LABEL[seg] ?? seg}: {count}
            </span>
          ))}
        </div>
      </section>

      <section className="card overflow-hidden p-0">
        <div className="border-b border-stone-200 px-4 py-3">
          <h2 className="font-medium">Project health</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
            <tr>
              <th className="px-4 py-2">Project</th>
              <th className="px-4 py-2">Segment</th>
              <th className="px-4 py-2">Trees</th>
              <th className="px-4 py-2">Violations</th>
              <th className="px-4 py-2">Geotag due</th>
            </tr>
          </thead>
          <tbody>
            {data.projects.map((p) => (
              <tr key={p.id} className="border-t border-stone-100">
                <td className="px-4 py-2">
                  <Link href={`/projects/${p.id}`} className="font-medium text-forest-800 hover:underline">
                    {p.name}
                  </Link>
                  <div className="text-xs text-stone-500">{p.code}</div>
                </td>
                <td className="px-4 py-2">{SEGMENT_LABEL[p.segment] ?? p.segment}</td>
                <td className="px-4 py-2">
                  {p.tree_count}
                  {p.target_tree_count ? ` / ${p.target_tree_count}` : ""}
                </td>
                <td className="px-4 py-2">
                  {p.open_violations > 0 ? (
                    <span className="text-amber-700">{p.open_violations}</span>
                  ) : (
                    "0"
                  )}
                </td>
                <td className="px-4 py-2">{p.survival_due}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {data.recent_violations.length > 0 && (
        <section className="card">
          <h2 className="text-lg font-medium">Recent violations</h2>
          <ul className="mt-3 space-y-2">
            {data.recent_violations.map((v) => (
              <li key={v.id} className="rounded-lg border border-stone-200 px-3 py-2 text-sm">
                <div className="font-medium">
                  <Link href={`/projects/${v.project_id}`} className="text-forest-800 hover:underline">
                    {v.project_name}
                  </Link>
                  <span className="ml-2 text-xs uppercase text-stone-500">{v.severity}</span>
                </div>
                <p className="text-stone-600">{v.message}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  warn = false,
}: {
  icon: typeof FolderKanban;
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className={`card flex items-center gap-3 ${warn ? "border-amber-300 bg-amber-50" : ""}`}>
      <Icon className="h-8 w-8 text-forest-700" />
      <div>
        <div className="text-xs text-stone-500">{label}</div>
        <div className="text-2xl font-semibold">{value}</div>
      </div>
    </div>
  );
}
