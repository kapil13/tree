"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { plantingProjects, type PlantingProject } from "@/lib/api";
import { errorMessage } from "@/lib/api";
import { ProjectRuleOverridePanel } from "@/components/projects/project-rule-override-panel";
import { projectSetupHref } from "@/lib/project-focused-ui";

export function ProjectSettingsPanel({
  project,
  monitoringMode = false,
}: {
  project: PlantingProject;
  monitoringMode?: boolean;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");
  const [status, setStatus] = useState(project.status);
  const [complianceMode, setComplianceMode] = useState(project.compliance_mode);
  const [targetTrees, setTargetTrees] = useState(
    project.target_tree_count != null ? String(project.target_tree_count) : "",
  );
  const [surveyDays, setSurveyDays] = useState(
    String((project.metadata?.survey_interval_days as number) ?? 30),
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: () =>
      plantingProjects.update(project.id, {
        name,
        description,
        status: status as PlantingProject["status"],
        compliance_mode: complianceMode as PlantingProject["compliance_mode"],
        target_tree_count: targetTrees ? Number(targetTrees) : undefined,
        metadata: {
          ...project.metadata,
          survey_interval_days: Number(surveyDays) === 15 ? 15 : 30,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planting-project", project.id] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const rules = project.active_standard?.rules ?? {};
  const scanCadenceDays =
    (rules.satellite_scan_cadence_days as number | undefined) ??
    (project.metadata?.satellite_scan_cadence_days as number | undefined) ??
    30;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card space-y-4 lg:col-span-2">
        <h2 className="text-sm font-medium">Programme setup</h2>
        <p className="text-sm text-stone-600">
          {monitoringMode
            ? "Estate details, monitoring standard confirmation, and work areas are configured in the 4-step project setup wizard — not here."
            : "Scheme references, tree registration defaults, planting standard confirmation, and work areas are configured in the 4-step project setup wizard — not here."}
        </p>
        <Link href={projectSetupHref(project.id)} className="btn-secondary inline-flex w-fit">
          Open project setup wizard →
        </Link>
      </div>

      <div className="card space-y-4">
        <h2 className="text-sm font-medium">Project settings</h2>
        <div className="space-y-3 text-sm">
          <div>
            <label className="kpi-label">Name</label>
            <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="kpi-label">Description</label>
            <textarea
              className="input mt-1 min-h-[80px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="kpi-label">Status</label>
              <select
                className="input mt-1"
                value={status}
                onChange={(e) => setStatus(e.target.value as PlantingProject["status"])}
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="kpi-label">Compliance mode</label>
              <select
                className="input mt-1"
                value={complianceMode}
                onChange={(e) =>
                  setComplianceMode(e.target.value as PlantingProject["compliance_mode"])
                }
              >
                <option value="strict">Strict (NHAI / ESG audit)</option>
                <option value="guided">Guided</option>
                <option value="open">Open</option>
              </select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {!monitoringMode ? (
              <>
                <div>
                  <label className="kpi-label">Target tree count</label>
                  <input
                    className="input mt-1"
                    type="number"
                    min={1}
                    value={targetTrees}
                    onChange={(e) => setTargetTrees(e.target.value)}
                  />
                </div>
                <div>
                  <label className="kpi-label">Survival survey interval</label>
                  <select
                    className="input mt-1"
                    value={surveyDays}
                    onChange={(e) => setSurveyDays(e.target.value)}
                  >
                    <option value="15">Every 15 days</option>
                    <option value="30">Every 30 days</option>
                  </select>
                </div>
              </>
            ) : (
              <div className="sm:col-span-2">
                <label className="kpi-label">Satellite scan cadence</label>
                <p className="mt-1 text-sm text-stone-700">
                  Every {scanCadenceDays} days (from monitoring standard)
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  NDVI and SAR scans run on work-area polygons. Adjust the attached monitoring standard
                  in project setup if your programme needs a different cadence.
                </p>
              </div>
            )}
          </div>
          {error && <p className="text-rose-700">{error}</p>}
          <button
            type="button"
            className="btn-primary"
            disabled={save.isPending}
            onClick={() => {
              setError(null);
              save.mutate();
            }}
          >
            {save.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving…
              </>
            ) : saved ? (
              "Saved"
            ) : (
              "Save settings"
            )}
          </button>
        </div>
      </div>

      <ProjectRuleOverridePanel project={project} />

      <div className="card space-y-3">
        <h2 className="text-sm font-medium">
          {monitoringMode ? "Active monitoring standard" : "Active compliance standard"}
        </h2>
        {project.active_standard ? (
          <div className="space-y-2 text-sm text-stone-700">
            <p className="font-medium">{project.active_standard.name}</p>
            <ul className="list-disc space-y-1 pl-4 text-xs text-stone-600">
              {monitoringMode ? (
                <>
                  {(rules.satellite_scan_cadence_days as number | undefined) != null && (
                    <li>
                      NDVI scan cadence: every {String(rules.satellite_scan_cadence_days)} days
                    </li>
                  )}
                  {(rules.recommended_work_area_ha as number | undefined) != null && (
                    <li>
                      Recommended block size: ~{String(rules.recommended_work_area_ha)} ha
                    </li>
                  )}
                  {(rules.max_work_area_ha as number | undefined) != null && (
                    <li>Max work area: {String(rules.max_work_area_ha)} ha per polygon</li>
                  )}
                  {Boolean(rules.plot_based_monitoring_recommended) && (
                    <li>Plot-based ground truth recommended for large estates</li>
                  )}
                </>
              ) : (
                <>
                  {(rules.spacing_m as { min?: number })?.min != null && (
                    <li>Min spacing: {(rules.spacing_m as { min: number }).min} m</li>
                  )}
                  {(rules.pit_size_cm as { length?: number })?.length != null && (
                    <li>
                      Pit size: {(rules.pit_size_cm as { length: number }).length}×
                      {(rules.pit_size_cm as { width: number }).width}×
                      {(rules.pit_size_cm as { depth: number }).depth} cm
                    </li>
                  )}
                  {Boolean(rules.guard_type_required) && (
                    <li>Tree guard required (no &quot;none&quot;)</li>
                  )}
                  {rules.layout_pattern === "single_row" && (
                    <li>NHAI single-row layout — road side (LHS/RHS) required</li>
                  )}
                  {(rules.planting_density_per_ha as { min?: number })?.min != null && (
                    <li>
                      ESG density: {(rules.planting_density_per_ha as { min: number }).min}–
                      {(rules.planting_density_per_ha as { max: number }).max} trees/ha
                    </li>
                  )}
                  {rules.species_native_pct_min != null && (
                    <li>Native species minimum: {String(rules.species_native_pct_min)}%</li>
                  )}
                  {Boolean(rules.chainage_enabled) && (
                    <li>Chainage tracking enabled for corridor</li>
                  )}
                  {rules.min_photos != null && <li>Minimum photos: {String(rules.min_photos)}</li>}
                </>
              )}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-stone-500">No standard attached.</p>
        )}
        {!monitoringMode ? (
          <Link href={`/trees/new?project=${project.id}`} className="text-sm text-forest-700 hover:underline">
            Register compliant tree →
          </Link>
        ) : (
          <p className="text-xs text-stone-500">
            Tree registration is optional for plot-based ground truth.
          </p>
        )}
      </div>
    </div>
  );
}
