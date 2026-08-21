"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Leaf, MapPin, ShieldCheck } from "lucide-react";
import { ProjectSetupChecklist } from "@/components/projects/project-setup-checklist";
import { ProjectTreesByArea } from "@/components/projects/project-trees-by-area";
import { ProjectWorkAreaMap } from "@/components/projects/project-work-area-map";
import { centralSchemes, plantingProjects, type PlantingProject, type WorkArea } from "@/lib/api";
import { projectSecondaryHref } from "@/lib/project-focused-ui";
import type { ProjectSetupStatus } from "@/lib/project-setup-readiness";
import { schemeByCode } from "@/lib/schemes";
import { cn } from "@/lib/cn";

type SurvivalDue = {
  trees_due: number;
  trees_total: number;
  survey_interval_days: number;
};

function ProgrammeStandardAside({
  project,
  surveyDays,
}: {
  project: PlantingProject;
  surveyDays: number;
}) {
  const rules = project.active_standard?.rules ?? {};
  const spacing = rules.spacing_m as { min?: number } | null | undefined;
  const pitSize = rules.pit_size_cm as
    | { length?: number; width?: number; depth?: number }
    | null
    | undefined;
  const pitLabel = pitSize
    ? [pitSize.length, pitSize.width, pitSize.depth].filter(Boolean).join("×")
    : null;

  return (
    <aside className="card space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <ShieldCheck className="h-4 w-4 text-forest-700" />
        Programme standard
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
  );
}

export function ProjectFocusedOverview({
  project,
  projectId,
  workAreas,
  survivalDue,
  registerHref,
  setupStatus,
  autoDraw = false,
}: {
  project: PlantingProject;
  projectId: string;
  workAreas: WorkArea[];
  survivalDue: SurvivalDue | undefined;
  registerHref: string;
  setupStatus?: ProjectSetupStatus;
  autoDraw?: boolean;
}) {
  const surveyDays =
    (project.metadata?.survey_interval_days as number | undefined) ?? 30;
  const openViolations = project.summary?.open_violations ?? 0;
  const treeCount = project.summary?.tree_count ?? 0;
  const workAreaCount = project.summary?.work_area_count ?? 0;
  const treesDue = survivalDue?.trees_due ?? 0;

  const { data: schemes = [] } = useQuery({
    queryKey: ["central-schemes"],
    queryFn: () => centralSchemes.list(),
  });

  const { data: schemeKpis } = useQuery({
    queryKey: ["project-scheme-kpis", projectId],
    queryFn: () => plantingProjects.schemeKpis(projectId),
    enabled: !!project.scheme_code,
  });

  const { data: registrationContext } = useQuery({
    queryKey: ["registration-context", projectId, workAreas[0]?.id],
    queryFn: () => plantingProjects.registrationContext(projectId, workAreas[0]?.id),
    enabled: workAreas.length > 0,
  });

  const scheme = schemeByCode(schemes, project.scheme_code);

  const upNextHref = useMemo(() => {
    const suggested = registrationContext?.suggested_next;
    if (!suggested) return registerHref;
    const params = new URLSearchParams({
      project: project.id,
      work_area: suggested.work_area_id,
      chainage_km: String(suggested.chainage_km),
    });
    if (suggested.latitude != null && suggested.longitude != null) {
      params.set("lat", String(suggested.latitude));
      params.set("lon", String(suggested.longitude));
    }
    return `/trees/new?${params.toString()}`;
  }, [registrationContext?.suggested_next, project.id, registerHref]);

  const nextAction = useMemo(() => {
    if (setupStatus && !setupStatus.setupComplete) {
      const incomplete = setupStatus.steps.find((s) => s.required && !s.complete);
      if (incomplete?.id === "scheme_refs") {
        return {
          title: "Add scheme references",
          description: incomplete.description ?? "Government IDs are required before tree registration.",
          href: projectSecondaryHref(projectId, "settings"),
          label: "Open settings",
          icon: ShieldCheck,
        };
      }
      if (incomplete?.id === "work_areas") {
        return {
          title: "Draw a work area",
          description: "Search your site, use GPS, then draw a polygon or corridor on the map below.",
          href: "#work-areas",
          label: "Go to map",
          icon: MapPin,
        };
      }
      if (incomplete?.id === "planting_standard") {
        return {
          title: "Attach planting standard",
          description: "No compliance standard is linked to this project.",
          href: projectSecondaryHref(projectId, "settings"),
          label: "Open settings",
          icon: ShieldCheck,
        };
      }
    }
    if (openViolations > 0) {
      return {
        title: "Resolve open compliance",
        description: `${openViolations} open violation${openViolations === 1 ? "" : "s"} need attention.`,
        href: projectSecondaryHref(projectId, "compliance"),
        label: "Open compliance",
        icon: AlertTriangle,
      };
    }
    if (treesDue > 0) {
      return {
        title: "Complete survival surveys",
        description: `${treesDue} tree${treesDue === 1 ? "" : "s"} due for re-geotag (every ${surveyDays} days).`,
        href: undefined,
        label: "See tree list below",
        icon: MapPin,
      };
    }
    if (workAreaCount === 0) {
      return {
        title: "Draw a work area",
        description: "Search your site, use GPS, then draw a polygon or corridor on the map below.",
        href: "#work-areas",
        label: "Go to map",
        icon: MapPin,
      };
    }
    if (treeCount === 0) {
      return {
        title: "Register the first tree",
        description: "Tag a tree with GPS and photos to start tracking.",
        href: registerHref,
        label: "Register tree",
        icon: Leaf,
      };
    }
    return null;
  }, [
    openViolations,
    treesDue,
    surveyDays,
    workAreaCount,
    treeCount,
    projectId,
    registerHref,
    setupStatus,
  ]);

  return (
    <div className="space-y-4 md:space-y-6">
      {scheme && (
        <p className="inline-flex items-center rounded-full bg-forest-50 px-3 py-1 text-xs font-medium text-forest-900 ring-1 ring-forest-100">
          {scheme.label}
          <span className="ml-2 text-forest-700">· {scheme.ministry}</span>
        </p>
      )}

      {setupStatus && !setupStatus.setupComplete && (
        <ProjectSetupChecklist status={setupStatus} />
      )}

      {setupStatus?.setupComplete && treeCount === 0 && workAreaCount > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-950">Setup complete — ready to plant</p>
              <p className="mt-1 text-sm text-emerald-900/90">
                Scheme references, standard, and work areas are configured. Register your first tree.
              </p>
            </div>
            <Link href={registerHref} className="btn-primary w-full shrink-0 sm:w-auto">
              <Leaf className="h-4 w-4" />
              Register first tree
            </Link>
          </div>
        </div>
      )}

      {nextAction && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold text-amber-950">
                <nextAction.icon className="h-4 w-4 shrink-0" />
                Next: {nextAction.title}
              </p>
              <p className="mt-1 text-sm text-amber-900/90">{nextAction.description}</p>
            </div>
            {nextAction.href ? (
              <Link href={nextAction.href} className="btn-primary w-full shrink-0 text-xs sm:w-auto">
                {nextAction.label}
              </Link>
            ) : (
              <span className="text-xs font-medium text-amber-900">{nextAction.label}</span>
            )}
          </div>
        </div>
      )}

      {registrationContext?.suggested_next && workAreaCount > 0 && (
        <div className="rounded-xl border border-forest-200 bg-forest-50/60 px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-forest-800">
                Up next
              </p>
              <p className="mt-1 text-xl font-semibold text-stone-900">
                {registrationContext.suggested_next.chainage_display}
              </p>
              <p className="mt-1 text-sm text-stone-600">
                {registrationContext.suggested_next.work_area_name}
                {registrationContext.inherited_standard.pit_size_label
                  ? ` · Pit ${registrationContext.inherited_standard.pit_size_label} cm inherited`
                  : ""}
              </p>
              {registrationContext.progress.target_tree_count != null && (
                <p className="mt-2 text-xs text-stone-500">
                  {registrationContext.progress.tree_count} of{" "}
                  {registrationContext.progress.target_tree_count.toLocaleString()} trees
                  {registrationContext.progress.progress_pct != null
                    ? ` (${registrationContext.progress.progress_pct}%)`
                    : ""}
                </p>
              )}
            </div>
            <Link href={upNextHref} className="btn-primary w-full shrink-0 sm:w-auto">
              <Leaf className="h-4 w-4" />
              Register here
            </Link>
          </div>
        </div>
      )}

      {survivalDue && survivalDue.trees_due > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>{survivalDue.trees_due}</strong> of {survivalDue.trees_total} trees are due
          for re-geotagging (every {survivalDue.survey_interval_days} days). See the tree list
          below or open individual tree records to update GPS and survival status.
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
        <Link
          href={projectSecondaryHref(projectId, "compliance")}
          className="card block transition hover:border-amber-200"
        >
          <p className="kpi-label">Open violations</p>
          <p className="text-2xl font-semibold">{openViolations}</p>
          {openViolations > 0 && <p className="mt-1 text-xs text-forest-700">View & fix →</p>}
        </Link>
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
              </span>
              <span>
                Geo-tagged: <strong>{schemeKpis.metrics.geo_tagged_pct ?? 0}%</strong>
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                  schemeKpis.status === "on_track" && "bg-emerald-50 text-emerald-800",
                  schemeKpis.status === "at_risk" && "bg-amber-50 text-amber-900",
                  schemeKpis.status === "off_track" && "bg-rose-50 text-rose-800",
                  (schemeKpis.status === "not_applicable" ||
                    schemeKpis.status === "not_configured") &&
                    "bg-stone-100 text-stone-600",
                )}
              >
                {schemeKpis.status.replace(/_/g, " ")}
              </span>
            </div>
          </div>
        )}
      </div>

      <div id="work-areas" className="scroll-mt-24 grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="card space-y-4">
          <h2 className="text-sm font-medium">Work areas</h2>
          <ProjectWorkAreaMap
            projectId={projectId}
            workAreas={workAreas}
            autoDraw={autoDraw}
            defaultGeometryType={
              project.segment === "nhai_highway" ? "corridor" : "polygon"
            }
          />
        </div>
        <ProgrammeStandardAside project={project} surveyDays={surveyDays} />
      </div>

      <div className="card">
        <ProjectTreesByArea
          projectId={projectId}
          workAreas={workAreas}
          surveyIntervalDays={surveyDays}
        />
      </div>
    </div>
  );
}
