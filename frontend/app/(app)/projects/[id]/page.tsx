"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Leaf, ShieldCheck } from "lucide-react";
import { ProjectComplianceTab } from "@/components/projects/project-compliance-tab";
import { ProjectComplianceWorkflowWidget } from "@/components/projects/project-compliance-workflow-widget";
import { ProjectCreditLedgerPanel } from "@/components/projects/project-credit-ledger-panel";
import { ProjectImpactSharePanel } from "@/components/projects/project-impact-share-panel";
import { ProjectSettingsPanel } from "@/components/projects/project-settings-panel";
import { ProjectTeamPanel } from "@/components/projects/project-team-panel";
import { ProjectTreesByArea } from "@/components/projects/project-trees-by-area";
import { ProjectWorkAreaMap } from "@/components/projects/project-work-area-map";
import { PestIntelPanel } from "@/components/pest-intel-panel";
import { centralSchemes, plantingProjects } from "@/lib/api";
import { schemeByCode } from "@/lib/schemes";
import { cn } from "@/lib/cn";

const TABS = ["overview", "compliance", "credits", "trees", "team", "settings"] as const;

export default function ProjectDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const [tab, setTab] = useState<(typeof TABS)[number]>("overview");
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);

  useEffect(() => {
    const requested = searchParams.get("tab");
    if (requested && TABS.includes(requested as (typeof TABS)[number])) {
      setTab(requested as (typeof TABS)[number]);
    }
  }, [searchParams]);

  const { data: project, isLoading } = useQuery({
    queryKey: ["planting-project", projectId],
    queryFn: () => plantingProjects.get(projectId),
  });

  const { data: schemes = [] } = useQuery({
    queryKey: ["central-schemes"],
    queryFn: () => centralSchemes.list(),
  });

  const scheme = schemeByCode(schemes, project?.scheme_code);

  const { data: workAreas = [] } = useQuery({
    queryKey: ["project-work-areas", projectId],
    queryFn: () => plantingProjects.workAreas(projectId),
    enabled: !!projectId,
  });

  const { data: survivalDue } = useQuery({
    queryKey: ["project-survival-due", projectId],
    queryFn: () => plantingProjects.survivalDue(projectId),
    enabled: !!projectId,
  });

  const { data: schemeKpis } = useQuery({
    queryKey: ["project-scheme-kpis", projectId],
    queryFn: () => plantingProjects.schemeKpis(projectId),
    enabled: !!projectId && !!project?.scheme_code,
  });

  const pestAreaId = useMemo(
    () => selectedAreaId ?? workAreas[0]?.id ?? null,
    [selectedAreaId, workAreas],
  );

  if (isLoading || !project) {
    return <p className="text-sm text-stone-500">Loading project workspace…</p>;
  }

  const rules = project.active_standard?.rules ?? {};
  const spacing = rules.spacing_m as { min?: number } | null | undefined;
  const pitSize = rules.pit_size_cm as
    | { length?: number; width?: number; depth?: number }
    | null
    | undefined;
  const pitLabel = pitSize
    ? [pitSize.length, pitSize.width, pitSize.depth].filter(Boolean).join("×")
    : null;
  const surveyDays =
    (project.metadata?.survey_interval_days as number | undefined) ?? 30;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/projects" className="text-sm text-forest-700 hover:underline">
            ← All projects
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{project.name}</h1>
          <p className="text-sm text-stone-500">
            {project.code} · {project.segment.replace(/_/g, " ")} · {project.compliance_mode} mode ·
            survival survey every {surveyDays} days
          </p>
          {scheme && (
            <p className="mt-2 inline-flex items-center rounded-full bg-forest-50 px-3 py-1 text-xs font-medium text-forest-900 ring-1 ring-forest-100">
              {scheme.label}
              <span className="ml-2 text-forest-700">· {scheme.ministry}</span>
            </p>
          )}
        </div>
        <Link
          href={`/trees/new?project=${project.id}${workAreas[0] ? `&work_area=${workAreas[0].id}` : ""}`}
          className="btn-primary"
        >
          <Leaf className="h-4 w-4" />
          Register tree
        </Link>
      </div>

      {survivalDue && survivalDue.trees_due > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>{survivalDue.trees_due}</strong> of {survivalDue.trees_total} trees are due for
          re-geotagging (every {survivalDue.survey_interval_days} days). Open the Trees tab or
          individual tree records to update GPS and survival status.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <p className="kpi-label">Trees planted</p>
          <p className="text-2xl font-semibold">{project.summary?.tree_count ?? 0}</p>
        </div>
        <div className="card">
          <p className="kpi-label">Work areas</p>
          <p className="text-2xl font-semibold">{project.summary?.work_area_count ?? 0}</p>
        </div>
        <button
          type="button"
          className="card w-full text-left transition hover:border-amber-200"
          onClick={() => setTab("compliance")}
        >
          <p className="kpi-label">Open violations</p>
          <p className="text-2xl font-semibold">{project.summary?.open_violations ?? 0}</p>
          {(project.summary?.open_violations ?? 0) > 0 && (
            <p className="mt-1 text-xs text-forest-700">View & fix →</p>
          )}
        </button>
        <div className="card">
          <p className="kpi-label">Geotag due</p>
          <p className="text-2xl font-semibold">{survivalDue?.trees_due ?? 0}</p>
        </div>
        {schemeKpis && schemeKpis.scheme_code && (
          <div className="card sm:col-span-2 lg:col-span-4">
            <p className="kpi-label">Scheme KPI — {schemeKpis.scheme_label}</p>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              <span>
                Survival: <strong>{schemeKpis.metrics.survival_pct ?? 0}%</strong>
                {schemeKpis.targets.survival_pct_min != null && (
                  <span className="text-stone-500"> / target {schemeKpis.targets.survival_pct_min}%</span>
                )}
              </span>
              <span>
                Geo-tagged: <strong>{schemeKpis.metrics.geo_tagged_pct ?? 0}%</strong>
                {schemeKpis.targets.geo_tagged_pct_min != null && (
                  <span className="text-stone-500">
                    {" "}
                    / target {schemeKpis.targets.geo_tagged_pct_min}%
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                  schemeKpis.status === "on_track" && "bg-emerald-50 text-emerald-800",
                  schemeKpis.status === "at_risk" && "bg-amber-50 text-amber-900",
                  schemeKpis.status === "off_track" && "bg-rose-50 text-rose-800",
                  schemeKpis.status === "not_applicable" && "bg-stone-100 text-stone-600",
                  schemeKpis.status === "not_configured" && "bg-stone-100 text-stone-600",
                )}
              >
                {schemeKpis.status.replace(/_/g, " ")}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 border-b border-stone-200">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={cn(
              "border-b-2 px-4 py-2 text-sm font-medium capitalize",
              tab === t
                ? "border-forest-700 text-forest-800"
                : "border-transparent text-stone-500 hover:text-stone-800",
            )}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-4">
          <ProjectImpactSharePanel projectId={project.id} />
          <ProjectComplianceWorkflowWidget
            projectId={project.id}
            projectMetadata={project.metadata}
            onOpenCompliance={() => setTab("compliance")}
          />
          <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <div className="card space-y-4">
            <h2 className="text-sm font-medium">Work areas</h2>
            <ProjectWorkAreaMap projectId={project.id} workAreas={workAreas} />
            {workAreas.length > 0 && (
              <div>
                <label className="kpi-label">Pest intel for area</label>
                <select
                  className="input mt-1 mb-3"
                  value={pestAreaId ?? ""}
                  onChange={(e) => setSelectedAreaId(e.target.value || null)}
                >
                  {workAreas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                {pestAreaId && <PestIntelPanel kind="work-area" targetId={pestAreaId} />}
              </div>
            )}
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
                {pitLabel ? <p>Pit: {pitLabel} cm</p> : null}
                {Boolean(rules.guard_type_required) && <p>Tree guard required</p>}
                {rules.species_native_pct_min != null && (
                  <p>Native species min: {String(rules.species_native_pct_min)}%</p>
                )}
                <p className="text-xs text-stone-500">
                  Re-geotag / survival check every {surveyDays} days (alerts sent automatically).
                </p>
              </div>
            ) : (
              <p className="text-sm text-stone-500">No standard attached.</p>
            )}
          </aside>
          </div>
        </div>
      )}

      {tab === "compliance" && (
        <ProjectComplianceTab
          projectId={project.id}
          projectCode={project.code}
          projectMetadata={project.metadata}
          onNavigateTab={setTab}
        />
      )}

      {tab === "credits" && (
        <div className="card">
          <ProjectCreditLedgerPanel projectId={project.id} />
        </div>
      )}

      {tab === "trees" && (
        <div className="card">
          <ProjectTreesByArea
            projectId={project.id}
            workAreas={workAreas}
            surveyIntervalDays={surveyDays}
          />
        </div>
      )}

      {tab === "team" && (
        <ProjectTeamPanel
          projectId={project.id}
          workAreas={workAreas.map((a) => ({ id: a.id, name: a.name }))}
        />
      )}

      {tab === "settings" && <ProjectSettingsPanel project={project} />}
    </div>
  );
}
