"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { plantingProjects, type PlantingProject } from "@/lib/api";
import { errorMessage } from "@/lib/api";

export function ProjectSettingsPanel({ project }: { project: PlantingProject }) {
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

  return (
    <div className="grid gap-6 lg:grid-cols-2">
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

      <div className="card space-y-3">
        <h2 className="text-sm font-medium">Active compliance standard</h2>
        {project.active_standard ? (
          <div className="space-y-2 text-sm text-stone-700">
            <p className="font-medium">{project.active_standard.name}</p>
            <ul className="list-disc space-y-1 pl-4 text-xs text-stone-600">
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
              {Boolean(rules.guard_type_required) && <li>Tree guard required (no &quot;none&quot;)</li>}
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
              {Boolean(rules.chainage_enabled) && <li>Chainage tracking enabled for corridor</li>}
              {rules.min_photos != null && <li>Minimum photos: {String(rules.min_photos)}</li>}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-stone-500">No standard attached.</p>
        )}
        <Link href={`/trees/new?project=${project.id}`} className="text-sm text-forest-700 hover:underline">
          Register compliant tree →
        </Link>
      </div>
    </div>
  );
}
