"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Leaf, MapPin, ShieldCheck } from "lucide-react";
import { ProjectComplianceTab } from "@/components/projects/project-compliance-tab";
import { ProjectComplianceWorkflowWidget } from "@/components/projects/project-compliance-workflow-widget";
import { ProjectCreditLedgerPanel } from "@/components/projects/project-credit-ledger-panel";
import { ProjectNprtAssessmentPanel } from "@/components/projects/project-nprt-assessment-panel";
import { ProjectGreenCreditPanel } from "@/components/projects/project-green-credit-panel";
import { ProjectVerificationPanel } from "@/components/projects/project-verification-panel";
import { ProjectImpactSharePanel } from "@/components/projects/project-impact-share-panel";
import { ProjectSettingsPanel } from "@/components/projects/project-settings-panel";
import { ProjectTeamPanel } from "@/components/projects/project-team-panel";
import { ProjectTreesByArea } from "@/components/projects/project-trees-by-area";
import { ProjectWorkAreaMap } from "@/components/projects/project-work-area-map";
import { PestIntelPanel } from "@/components/pest-intel-panel";
import { PageHeader } from "@/components/ui/page-header";
import { centralSchemes, plantingProjects } from "@/lib/api";
import { schemeByCode } from "@/lib/schemes";
import { cn } from "@/lib/cn";

const TABS = ["overview", "compliance", "credits", "trees", "team", "settings"] as const;

const TAB_LABELS: Record<(typeof TABS)[number], string> = {
  overview: "Overview",
  compliance: "Compliance",
  credits: "Credits",
  trees: "Trees",
  team: "Team",
  settings: "Scheme & settings",
};

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

  const openViolations = project.summary?.open_violations ?? 0;
  const treesDue = survivalDue?.trees_due ?? 0;
  const treeCount = project.summary?.tree_count ?? 0;
  const workAreaCount = project.summary?.work_area_count ?? 0;

  let nextAction: {
    title: string;
    description: string;
    href?: string;
    onClick?: () => void;
    label: string;
    icon: typeof AlertTriangle;
  } | null = null;

  if (openViolations > 0) {
    nextAction = {
      title: "Resolve open compliance",
      description: `${openViolations} open violation${openViolations === 1 ? "" : "s"} need attention before the next audit checkpoint.`,
      onClick: () => setTab("compliance"),
      label: "Open compliance",
      icon: AlertTriangle,
    };
  } else if (treesDue > 0) {
    nextAction = {
      title: "Complete survival surveys",
      description: `${treesDue} tree${treesDue === 1 ? "" : "s"} due for re-geotag (every ${surveyDays} days).`,
      onClick: () => setTab("trees"),
      label: "Open trees due",
      icon: MapPin,
    };
  } else if (workAreaCount === 0) {
    nextAction = {
      title: "Draw a work area",
      description: "Add at least one boundary so field teams can register trees inside the project.",
      onClick: () => setTab("settings"),
      label: "Project settings",
      icon: ShieldCheck,
    };
  } else if (treeCount === 0) {
    nextAction = {
      title: "Register the first tree",
      description: "Tag a tree with GPS and a photo to start survival and satellite tracking.",
      href: `/trees/new?project=${project.id}${workAreas[0] ? `&work_area=${workAreas[0].id}` : ""}`,
      label: "Register tree",
      icon: Leaf,
    };
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title={project.name}
        description={`${project.code} · ${project.segment.replace(/_/g, " ")} · ${project.compliance_mode} mode · survival survey every ${surveyDays} days`}
        breadcrumbs={[
          { label: "Operate" },
          { label: "Projects", href: "/projects" },
          { label: project.name },
        ]}
        actions={
          <Link
            href={`/trees/new?project=${project.id}${workAreas[0] ? `&work_area=${workAreas[0].id}` : ""}`}
            className="btn-primary"
          >
            <Leaf className="h-4 w-4" />
            Register tree
          </Link>
        }
      />

      {scheme && (
        <p className="inline-flex items-center rounded-full bg-forest-50 px-3 py-1 text-xs font-medium text-forest-900 ring-1 ring-forest-100">
          {scheme.label}
          <span className="ml-2 text-forest-700">· {scheme.ministry}</span>
        </p>
      )}

      {nextAction && tab === "overview" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold text-amber-950 dark:text-amber-100">
                <nextAction.icon className="h-4 w-4 shrink-0" />
                Next: {nextAction.title}
              </p>
              <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-100/80">
                {nextAction.description}
              </p>
            </div>
            {nextAction.href ? (
              <Link href={nextAction.href} className="btn-primary shrink-0 text-xs">
                {nextAction.label}
              </Link>
            ) : (
              <button
                type="button"
                className="btn-primary shrink-0 text-xs"
                onClick={nextAction.onClick}
              >
                {nextAction.label}
              </button>
            )}
          </div>
        </div>
      )}

      {survivalDue && survivalDue.trees_due > 0 && tab !== "overview" && (
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
              {schemeKpis.targets.min_trees != null && (
                <span>
                  Trees: <strong>{schemeKpis.metrics.tree_count ?? 0}</strong>
                  <span className="text-stone-500"> / target {schemeKpis.targets.min_trees.toLocaleString()}</span>
                </span>
              )}
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

      <div className="-mx-1 overflow-x-auto">
        <div className="flex min-w-max gap-1 border-b border-stone-200 px-1">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              className={cn(
                "shrink-0 border-b-2 px-4 py-2 text-sm font-medium capitalize",
                tab === t
                  ? "border-forest-700 text-forest-800"
                  : "border-transparent text-stone-500 hover:text-stone-800",
              )}
              onClick={() => setTab(t)}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
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
          schemeCode={project.scheme_code}
          onNavigateTab={setTab}
        />
      )}

      {tab === "credits" && (
        <div className="space-y-4">
          {project.scheme_code === "green_credit_india" && (
            <div className="card">
              <ProjectGreenCreditPanel projectId={project.id} />
            </div>
          )}
          <div className="card">
            <ProjectNprtAssessmentPanel projectId={project.id} />
          </div>
          <div className="card">
            <ProjectCreditLedgerPanel projectId={project.id} />
          </div>
          <div className="card">
            <ProjectVerificationPanel projectId={project.id} />
          </div>
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
