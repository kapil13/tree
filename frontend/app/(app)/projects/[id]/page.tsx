"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Leaf, ShieldCheck } from "lucide-react";
import { ProjectComplianceTab } from "@/components/projects/project-compliance-tab";
import { ProjectCreditLedgerPanel } from "@/components/projects/project-credit-ledger-panel";
import { ProjectSettingsPanel } from "@/components/projects/project-settings-panel";
import { ProjectTreesByArea } from "@/components/projects/project-trees-by-area";
import { ProjectWorkAreaMap } from "@/components/projects/project-work-area-map";
import { PestIntelPanel } from "@/components/pest-intel-panel";
import { plantingProjects } from "@/lib/api";
import { cn } from "@/lib/cn";

const TABS = ["overview", "compliance", "credits", "trees", "settings"] as const;

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [tab, setTab] = useState<(typeof TABS)[number]>("overview");
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);

  const { data: project, isLoading } = useQuery({
    queryKey: ["planting-project", projectId],
    queryFn: () => plantingProjects.get(projectId),
  });

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
            {project.code} · {project.segment.replace(/_/g, " ")} · {project.compliance_mode}{" "}
            mode · survival survey every {surveyDays} days
          </p>
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
        <div className="card">
          <p className="kpi-label">Open violations</p>
          <p className="text-2xl font-semibold">{project.summary?.open_violations ?? 0}</p>
        </div>
        <div className="card">
          <p className="kpi-label">Geotag due</p>
          <p className="text-2xl font-semibold">{survivalDue?.trees_due ?? 0}</p>
        </div>
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
      )}

      {tab === "compliance" && (
        <ProjectComplianceTab projectId={project.id} projectCode={project.code} />
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

      {tab === "settings" && <ProjectSettingsPanel project={project} />}
    </div>
  );
}
