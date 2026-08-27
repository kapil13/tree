"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, FolderKanban, Plus, Search, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  EmptyState,
  FilterBar,
  FilterField,
  InsightPanel,
  MetricGrid,
  OperationalStatusBar,
  PageHeader,
} from "@/components/ui";
import { projectsOperationalStatus } from "@/components/dashboard/command-center-shell";
import { centralSchemes, plantingProjects } from "@/lib/api";
import { projectSecondaryHref } from "@/lib/project-focused-ui";
import { schemeByCode } from "@/lib/schemes";
import { cn } from "@/lib/cn";

const SEGMENT_CODES = [
  "nhai_highway",
  "industrial_greenbelt",
  "township_landscape",
  "nagar_van_urban",
  "sahakar_van_coop",
  "ngo_watershed",
  "general",
] as const;

function RowComplianceStatus({ violations, t }: { violations: number; t: ReturnType<typeof useTranslations<"projects">> }) {
  if (violations > 0) {
    return (
      <span className={cn("intel-row-status", violations >= 3 ? "intel-row-status--risk" : "intel-row-status--watch")}>
        {t("openViolations", { count: violations })}
      </span>
    );
  }
  return <span className="intel-row-status intel-row-status--ok">{t("clear")}</span>;
}

export default function ProjectsPage() {
  const tp = useTranslations("projects");
  const ts = useTranslations("segments");
  const tc = useTranslations("chrome");
  const [schemeFilter, setSchemeFilter] = useState("");
  const [search, setSearch] = useState("");

  const { data: schemes = [] } = useQuery({
    queryKey: ["central-schemes"],
    queryFn: () => centralSchemes.list(),
  });

  const { data, isLoading, isError, refetch } = useQuery({
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
      (p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q),
    );
  }, [projects, search]);

  const portfolioStats = useMemo(() => {
    const openViolations = projects.reduce(
      (sum, p) => sum + (p.summary?.open_violations ?? 0),
      0,
    );
    const flagged = projects.filter((p) => (p.summary?.open_violations ?? 0) > 0).length;
    const progressValues = projects
      .map((p) => p.summary?.progress_pct)
      .filter((v): v is number => v != null);
    const avgProgress =
      progressValues.length > 0
        ? Math.round(progressValues.reduce((a, b) => a + b, 0) / progressValues.length)
        : null;
    return { openViolations, flagged, avgProgress };
  }, [projects]);

  const ops = projectsOperationalStatus(tp, portfolioStats.openViolations, projects.length);

  function schemeLabel(code: string | null | undefined) {
    if (!code) return "—";
    return schemeLabelByCode.get(code) ?? schemeByCode(schemes, code)?.label ?? code;
  }

  function segmentLabel(seg: string) {
    return (SEGMENT_CODES as readonly string[]).includes(seg)
      ? ts(seg as (typeof SEGMENT_CODES)[number])
      : seg.replace(/_/g, " ");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        purpose={tp("purpose")}
        title={tp("title")}
        description={tp("description")}
        breadcrumbs={[{ label: tc("sectionOperate") }, { label: tc("breadcrumbProjects") }]}
        status={
          !isLoading ? (
            <OperationalStatusBar
              tone={ops.tone}
              label={ops.label}
              summary={ops.summary}
              icon={ops.tone === "healthy" ? ShieldCheck : AlertTriangle}
              action={
                portfolioStats.flagged > 0 ? (
                  <Link href="/portfolio-health?tab=compliance" className="btn-secondary text-xs">
                    {tp("portfolioCompliance")}
                  </Link>
                ) : undefined
              }
            />
          ) : undefined
        }
        actions={
          <Link href="/projects/new" className="btn-primary">
            <Plus className="h-4 w-4" />
            {tp("newProject")}
          </Link>
        }
      />

      {!isLoading && projects.length > 0 ? (
        <MetricGrid
          columns={4}
          metrics={[
            { label: tp("title"), value: projects.length },
            {
              label: tp("avgProgress"),
              value: portfolioStats.avgProgress != null ? `${portfolioStats.avgProgress}%` : "—",
              hint: tp("treesVsTarget"),
            },
            {
              label: tp("flaggedProjects"),
              value: portfolioStats.flagged,
              tone: portfolioStats.flagged > 0 ? "warning" : "positive",
            },
            {
              label: tp("violations"),
              value: portfolioStats.openViolations,
              tone: portfolioStats.openViolations > 0 ? "critical" : "positive",
            },
          ]}
        />
      ) : null}

      <InsightPanel
        title={tp("keyInsight")}
        interpretation={
          portfolioStats.openViolations > 0 ? tp("insightViolations") : tp("insightHealthy")
        }
      />

      <FilterBar>
        {schemes.length > 0 ? (
          <FilterField label={tp("centralScheme")} htmlFor="scheme-filter">
            <select
              id="scheme-filter"
              className="input w-full max-w-xs"
              value={schemeFilter}
              onChange={(e) => setSchemeFilter(e.target.value)}
            >
              <option value="">{tp("allSchemes")}</option>
              {schemes.map((scheme) => (
                <option key={scheme.code} value={scheme.code}>
                  {scheme.label}
                </option>
              ))}
            </select>
          </FilterField>
        ) : null}
        <FilterField label={tp("search")} htmlFor="project-search" className="min-w-[14rem] flex-[2]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              id="project-search"
              className="input w-full pl-9"
              placeholder={tp("searchCodePlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </FilterField>
      </FilterBar>

      {isLoading ? (
        <p className="text-sm text-stone-500">{tp("loading")}</p>
      ) : isError ? (
        <EmptyState
          icon={AlertTriangle}
          title={tp("loadError")}
          description={tp("loadErrorDesc")}
          action={{ label: tc("retry"), onClick: () => refetch() }}
        />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={tp("emptyTitle")}
          description={tp("emptyDesc")}
          action={{ label: tp("createFirst"), href: "/projects/new" }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={tp("noMatchTitle")}
          description={tp("noMatchDesc")}
          action={{ label: tp("clearSearch"), onClick: () => setSearch("") }}
        />
      ) : (
        <>
          <section className="space-y-3 md:hidden">
            {filtered.map((project) => {
              const violations = project.summary?.open_violations ?? 0;
              return (
                <article key={project.id} className="intel-panel">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <RowComplianceStatus violations={violations} t={tp} />
                      <Link
                        href={`/projects/${project.id}`}
                        className="mt-2 block font-semibold text-forest-900 hover:underline"
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
                      <dt className="text-stone-400">Progress</dt>
                      <dd className="mt-0.5 font-medium text-stone-800">
                        {project.summary?.progress_pct != null
                          ? `${project.summary.progress_pct.toFixed(0)}%`
                          : "—"}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex gap-2">
                    <Link
                      href={`/projects/${project.id}`}
                      className="btn-primary flex-1 justify-center text-xs"
                    >
                      Open workspace
                    </Link>
                    {violations > 0 ? (
                      <Link
                        href={projectSecondaryHref(project.id, "compliance")}
                        className="btn-secondary flex-1 justify-center text-xs"
                      >
                        Resolve issues
                      </Link>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </section>

          <div className="intel-data-table-wrap hidden md:block">
            <table className="intel-data-table">
              <thead>
                <tr>
                  <th>Compliance</th>
                  <th>Project</th>
                  <th>Progress</th>
                  <th>Scheme</th>
                  <th>Segment</th>
                  <th>Areas</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((project) => {
                  const violations = project.summary?.open_violations ?? 0;
                  return (
                    <tr key={project.id}>
                      <td>
                        {violations > 0 ? (
                          <Link href={projectSecondaryHref(project.id, "compliance")}>
                            <RowComplianceStatus violations={violations} t={tp} />
                          </Link>
                        ) : (
                          <RowComplianceStatus violations={0} t={tp} />
                        )}
                      </td>
                      <td>
                        <Link
                          href={`/projects/${project.id}`}
                          className="font-medium text-forest-800 hover:underline"
                        >
                          {project.name}
                        </Link>
                        <div className="text-xs text-stone-500">{project.code}</div>
                      </td>
                      <td className="tabular-nums">
                        {project.summary?.progress_pct != null
                          ? `${project.summary.progress_pct.toFixed(0)}%`
                          : "—"}
                      </td>
                      <td className="text-xs text-stone-700">{schemeLabel(project.scheme_code)}</td>
                      <td className="capitalize text-stone-700">
                        {segmentLabel(project.segment)}
                      </td>
                      <td className="tabular-nums">{project.summary?.work_area_count ?? 0}</td>
                      <td className="capitalize">{project.status}</td>
                      <td>
                        <Link href={`/projects/${project.id}`} className="btn-secondary px-3 py-1.5 text-xs">
                          {tp("openProject")}
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
  );
}
