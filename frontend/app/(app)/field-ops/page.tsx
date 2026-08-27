"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  ArrowRight,
  FolderKanban,
  MapPin,
  Plus,
  ShieldCheck,
} from "lucide-react";
import {
  CommandCenterEvidence,
  fieldOperationalStatus,
} from "@/components/dashboard/command-center-shell";
import { fmtNum } from "@/components/dashboard/format";
import { EmptyState, MetricGrid, OperationalStatusBar, PageHeader } from "@/components/ui";
import { plantingProjects } from "@/lib/api";
import { projectOverviewHref, projectSecondaryHref } from "@/lib/project-focused-ui";
import { cn } from "@/lib/cn";

export default function FieldOpsPage() {
  const tf = useTranslations("fieldOps");
  const ts = useTranslations("segments");
  const to = useTranslations("opsStatus");
  const tc = useTranslations("chrome");

  function segmentLabel(seg: string) {
    const codes = [
      "nhai_highway",
      "industrial_greenbelt",
      "township_landscape",
      "nagar_van_urban",
      "sahakar_van_coop",
      "ngo_watershed",
      "general",
    ] as const;
    return (codes as readonly string[]).includes(seg) ? ts(seg as (typeof codes)[number]) : seg;
  }
  const { data, isLoading } = useQuery({
    queryKey: ["field-ops-summary"],
    queryFn: () => plantingProjects.fieldOpsSummary(),
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="intel-skeleton h-20 rounded-xl" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="intel-skeleton h-24 rounded-lg" />
          ))}
        </div>
        <div className="intel-skeleton h-48 rounded-xl" />
      </div>
    );
  }

  const needsAttention = data.projects.filter(
    (p) => p.open_violations > 0 || p.survival_due > 0,
  );

  const fieldStatus = fieldOperationalStatus(to, {
    openViolations: data.open_violations,
    survivalDue: data.survival_due,
    queueCount: needsAttention.length,
    geotagDue: 0,
    unassigned: data.project_count === 0,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        purpose={tf("purpose")}
        title={tf("title")}
        description={tf("description")}
        breadcrumbs={[{ label: tc("sectionOperate") }, { label: tc("breadcrumbFieldOps") }]}
        actions={
          <Link href="/projects/new" className="btn-primary inline-flex items-center gap-1.5">
            <Plus className="h-4 w-4" />
            {tf("newProject")}
          </Link>
        }
      />

      <OperationalStatusBar
        tone={fieldStatus.tone}
        label={fieldStatus.label}
        summary={fieldStatus.summary}
        icon={fieldStatus.tone === "healthy" ? ShieldCheck : AlertTriangle}
        action={
          needsAttention[0] ? (
            <Link href={`/projects/${needsAttention[0].id}`} className="btn-secondary text-xs">
              {tf("openProject", { name: needsAttention[0].name })}
            </Link>
          ) : (
            <Link href="/trees/new" className="btn-secondary text-xs">
              {tf("registerTree")}
            </Link>
          )
        }
      />

      <MetricGrid
        columns={4}
        metrics={[
          { label: "Projects", value: fmtNum(data.project_count), hint: "Active packages" },
          { label: "Trees registered", value: fmtNum(data.tree_count), hint: "Across portfolio" },
          {
            label: "Open violations",
            value: fmtNum(data.open_violations),
            hint: "Compliance blockers",
            tone: data.open_violations > 0 ? "critical" : "positive",
          },
          {
            label: "Survival due",
            value: fmtNum(data.survival_due),
            hint: "Geotag / survival checks",
            tone: data.survival_due > 0 ? "warning" : "default",
          },
        ]}
      />

      {data.project_count === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={tf("noProjectsTitle")}
          description={tf("noProjectsDesc")}
          action={{ label: "Create first project", href: "/projects/new" }}
        />
      ) : (
        <>
          {needsAttention.length > 0 ? (
            <section id="attention" className="dash-panel dash-panel--priority">
              <div className="dash-panel-head">
                <div>
                  <h2 className="dash-panel-title">Needs attention</h2>
                  <p className="dash-panel-sub">Violations and survival checks by project</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {needsAttention.map((p) => (
                  <ProjectActionCard key={p.id} project={p} highlight />
                ))}
              </div>
            </section>
          ) : null}

          <CommandCenterEvidence
            title={tf("projectHealthTitle")}
            description="Segment mix and project-level field metrics"
          >
            <section className="rounded-xl border border-stone-200 bg-stone-50/60 p-4 dark:border-stone-800 dark:bg-stone-900/40">
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-50">Projects by segment</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(data.by_segment).map(([seg, count]) => (
                  <span key={seg} className="rounded-full bg-white px-3 py-1 text-sm dark:bg-stone-900">
                    {segmentLabel(seg)}: {count}
                  </span>
                ))}
              </div>
            </section>

            <section className="space-y-3 md:hidden">
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-50">All projects</h3>
              {data.projects.map((p) => (
                <ProjectActionCard key={p.id} project={p} />
              ))}
            </section>

            <div className="intel-data-table-wrap hidden md:block">
              <table className="intel-data-table min-w-[36rem]">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Segment</th>
                    <th>Trees</th>
                    <th>Violations</th>
                    <th>Survival due</th>
                  </tr>
                </thead>
                <tbody>
                  {data.projects.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link
                          href={`/projects/${p.id}`}
                          className="font-medium text-forest-800 hover:underline"
                        >
                          {p.name}
                        </Link>
                        <div className="text-xs text-stone-500">{p.code}</div>
                      </td>
                      <td>{segmentLabel(p.segment)}</td>
                      <td>
                        {p.tree_count}
                        {p.target_tree_count ? ` / ${p.target_tree_count}` : ""}
                      </td>
                      <td>
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
                      <td>{p.survival_due}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CommandCenterEvidence>
        </>
      )}

      {data.recent_violations.length > 0 ? (
        <CommandCenterEvidence
          title="Recent violations"
          description="Latest compliance issues across projects"
        >
          <ul className="space-y-2">
            {data.recent_violations.map((v) => (
              <li key={v.id} className="rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-800">
                <div className="font-medium">
                  <Link href={`/projects/${v.project_id}`} className="text-forest-800 hover:underline">
                    {v.project_name}
                  </Link>
                  <span className="ml-2 text-xs uppercase text-stone-500">{v.severity}</span>
                </div>
                <p className="text-stone-600">{v.message}</p>
                <Link
                  href={projectSecondaryHref(v.project_id, "compliance")}
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-forest-700 hover:underline"
                >
                  Fix in compliance <ArrowRight className="h-3 w-3" />
                </Link>
              </li>
            ))}
          </ul>
        </CommandCenterEvidence>
      ) : null}
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
  const ts = useTranslations("segments");
  const segmentCodes = [
    "nhai_highway",
    "industrial_greenbelt",
    "township_landscape",
    "nagar_van_urban",
    "sahakar_van_coop",
    "ngo_watershed",
    "general",
  ] as const;
  const segmentLabel = (seg: string) =>
    (segmentCodes as readonly string[]).includes(seg) ? ts(seg as (typeof segmentCodes)[number]) : seg;

  return (
    <article
      className={cn(
        "rounded-xl border bg-white p-4 shadow-sm dark:bg-stone-900",
        highlight ? "border-amber-300 bg-amber-50/40 dark:border-amber-800" : "border-stone-200 dark:border-stone-800",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link href={`/projects/${p.id}`} className="font-semibold text-forest-900 hover:underline">
            {p.name}
          </Link>
          <p className="mt-0.5 text-xs text-stone-500">
            {segmentLabel(p.segment)} · {p.code}
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
