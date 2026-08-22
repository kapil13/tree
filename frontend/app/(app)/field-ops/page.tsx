"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ClipboardList,
  FolderKanban,
  MapPin,
  Plus,
  TreePine,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { plantingProjects } from "@/lib/api";
import { projectOverviewHref, projectSecondaryHref } from "@/lib/project-focused-ui";

const SEGMENT_LABEL: Record<string, string> = {
  nhai_highway: "NHAI / Highway",
  industrial_greenbelt: "Mine / Green belt",
  township_landscape: "Township / Society",
  nagar_van_urban: "Nagar Van / Urban forest",
  sahakar_van_coop: "Sahakar Van / Cooperative forest",
  ngo_watershed: "NGO / Watershed",
  general: "General",
};

export default function FieldOpsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["field-ops-summary"],
    queryFn: () => plantingProjects.fieldOpsSummary(),
  });

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-stone-200" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-stone-200" />
          ))}
        </div>
        <div className="h-40 animate-pulse rounded-xl bg-stone-200" />
      </div>
    );
  }

  const needsAttention = data.projects.filter(
    (p) => p.open_violations > 0 || p.survival_due > 0,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Field operations</h1>
          <p className="mt-1 text-sm text-stone-600">
            Today’s priorities across packages, green belts, and society blocks.
          </p>
        </div>
        <Link href="/projects/new" className="btn-primary inline-flex items-center gap-1.5">
          <Plus className="h-4 w-4" />
          New project
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={FolderKanban} label="Projects" value={String(data.project_count)} />
        <KpiCard icon={TreePine} label="Trees registered" value={String(data.tree_count)} />
        <KpiCard
          icon={AlertTriangle}
          label="Open violations"
          value={String(data.open_violations)}
          warn={data.open_violations > 0}
          href={data.open_violations > 0 ? "#attention" : undefined}
        />
        <KpiCard
          icon={ClipboardList}
          label="Survival due"
          value={String(data.survival_due)}
          warn={data.survival_due > 0}
          href={data.survival_due > 0 ? "#attention" : undefined}
        />
      </div>

      {data.project_count === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No field projects yet"
          description="Create a project, draw work areas, then register trees with spacing standards."
          action={{ label: "Create first project", href: "/projects/new" }}
        />
      ) : (
        <>
          {needsAttention.length > 0 && (
            <section id="attention" className="space-y-3">
              <h2 className="text-lg font-medium text-stone-900">Needs attention</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {needsAttention.map((p) => (
                  <ProjectActionCard key={p.id} project={p} highlight />
                ))}
              </div>
            </section>
          )}

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

          {/* Mobile: action cards */}
          <section className="space-y-3 md:hidden">
            <h2 className="font-medium text-stone-900">All projects</h2>
            {data.projects.map((p) => (
              <ProjectActionCard key={p.id} project={p} />
            ))}
          </section>

          {/* Desktop: table */}
          <section className="card hidden overflow-hidden p-0 md:block">
            <div className="border-b border-stone-200 px-4 py-3">
              <h2 className="font-medium">Project health</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
                  <tr>
                    <th className="px-4 py-2">Project</th>
                    <th className="px-4 py-2">Segment</th>
                    <th className="px-4 py-2">Trees</th>
                    <th className="px-4 py-2">Violations</th>
                    <th className="px-4 py-2">Survival due</th>
                  </tr>
                </thead>
                <tbody>
                  {data.projects.map((p) => (
                    <tr key={p.id} className="border-t border-stone-100">
                      <td className="px-4 py-2">
                        <Link
                          href={`/projects/${p.id}`}
                          className="font-medium text-forest-800 hover:underline"
                        >
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
                          <Link
                            href={projectSecondaryHref(p.id, "compliance")}
                            className="text-amber-700 hover:underline"
                          >
                            {p.open_violations}
                          </Link>
                        ) : (
                          "0"
                        )}
                      </td>
                      <td className="px-4 py-2">{p.survival_due}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

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
                <Link
                  href={projectSecondaryHref(v.project_id, "compliance")}
                  className="mt-1 inline-block text-xs font-medium text-forest-700 hover:underline"
                >
                  Fix in compliance →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

type FieldProject = {
  id: string;
  name: string;
  code: string;
  segment: string;
  tree_count: number;
  target_tree_count: number | null;
  open_violations: number;
  survival_due: number;
};

function ProjectActionCard({
  project: p,
  highlight = false,
}: {
  project: FieldProject;
  highlight?: boolean;
}) {
  return (
    <article
      className={`rounded-xl border bg-white p-4 shadow-sm ${
        highlight ? "border-amber-300 bg-amber-50/40" : "border-stone-200"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link href={`/projects/${p.id}`} className="font-semibold text-forest-900 hover:underline">
            {p.name}
          </Link>
          <p className="mt-0.5 text-xs text-stone-500">
            {SEGMENT_LABEL[p.segment] ?? p.segment} · {p.code}
          </p>
        </div>
        <span className="text-xs text-stone-500">
          {p.tree_count}
          {p.target_tree_count ? `/${p.target_tree_count}` : ""} trees
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {p.open_violations > 0 && (
          <Link
            href={projectSecondaryHref(p.id, "compliance")}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-1.5 text-xs font-medium text-amber-950"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {p.open_violations} violation{p.open_violations === 1 ? "" : "s"}
          </Link>
        )}
        {p.survival_due > 0 && (
          <Link
            href={projectOverviewHref(p.id)}
            className="inline-flex items-center gap-1 rounded-lg bg-sky-100 px-2.5 py-1.5 text-xs font-medium text-sky-950"
          >
            <MapPin className="h-3.5 w-3.5" />
            {p.survival_due} survival due
          </Link>
        )}
        {p.open_violations === 0 && p.survival_due === 0 && (
          <span className="rounded-lg bg-forest-50 px-2.5 py-1.5 text-xs font-medium text-forest-800">
            On track
          </span>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <Link href={`/projects/${p.id}`} className="btn-secondary flex-1 justify-center text-xs">
          Open project
        </Link>
        <Link
          href={`/trees/new?project=${p.id}`}
          className="btn-primary flex-1 justify-center text-xs"
        >
          Add tree
        </Link>
      </div>
    </article>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  warn = false,
  href,
}: {
  icon: typeof FolderKanban;
  label: string;
  value: string;
  warn?: boolean;
  href?: string;
}) {
  const inner = (
    <>
      <Icon className="h-8 w-8 shrink-0 text-forest-700" />
      <div>
        <div className="text-xs text-stone-500">{label}</div>
        <div className="text-2xl font-semibold">{value}</div>
      </div>
    </>
  );
  const cls = `card flex items-center gap-3 ${warn ? "border-amber-300 bg-amber-50" : ""}`;
  if (href) {
    return (
      <a href={href} className={`${cls} transition hover:border-forest-300`}>
        {inner}
      </a>
    );
  }
  return <div className={cls}>{inner}</div>;
}
