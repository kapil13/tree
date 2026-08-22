"use client";

import Link from "next/link";
import { projectSetupHref } from "@/lib/project-focused-ui";
import { AlertTriangle, CheckCircle2, Leaf, ShieldCheck } from "lucide-react";
import type { PlantingProject } from "@/lib/api";
import type { CentralScheme } from "@/lib/schemes";
import { plantingRulesSummary, uniqueSpeciesChips } from "@/lib/tree-registration-prefill";
import { cn } from "@/lib/cn";

type Props = {
  project: PlantingProject;
  scheme?: CentralScheme;
  workAreaId: string | null;
  workAreaCount: number;
  requiresWorkArea: boolean;
  compliancePreview: {
    passed: boolean;
    chainage_km?: number | null;
    issues: { message: string }[];
  } | null;
};

export function ProjectTreeSchemeContext({
  project,
  scheme,
  workAreaId,
  workAreaCount,
  requiresWorkArea,
  compliancePreview,
}: Props) {
  const rules = (project.active_standard?.rules ?? {}) as Record<string, unknown>;
  const ruleLines = plantingRulesSummary(rules);
  const speciesChips = uniqueSpeciesChips(rules.allowed_species as string[] | undefined);
  const refs = (project.metadata?.scheme_refs as Record<string, string> | undefined) ?? {};
  const siteLabel = refs.village_name ?? refs.ulb_name ?? refs.urban_forest_name;

  return (
    <div className="card mx-auto max-w-3xl space-y-4 border-forest-200/80 bg-gradient-to-br from-forest-50/50 via-white to-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-forest-700">
            Planting under project
          </p>
          <p className="font-semibold text-stone-900">
            <Link href={`/projects/${project.id}`} className="text-forest-800 hover:underline">
              {project.name}
            </Link>
          </p>
          {scheme ? (
            <p className="text-sm text-stone-600">
              <span className="font-medium text-stone-800">{scheme.label}</span>
              <span className="text-stone-400"> · </span>
              {scheme.ministry}
            </p>
          ) : (
            <p className="text-sm text-stone-500 capitalize">{project.compliance_mode} compliance</p>
          )}
          {siteLabel && (
            <p className="text-xs text-stone-500">
              Site: {siteLabel}
              {refs.district ? `, ${refs.district}` : ""}
              {refs.state_name ? `, ${refs.state_name}` : ""}
            </p>
          )}
        </div>
        <Link
          href={projectSetupHref(project.id, 3)}
          className="text-sm font-medium text-forest-700 hover:underline"
        >
          Scheme references →
        </Link>
      </div>

      {(scheme || project.active_standard) && (
        <div className="rounded-xl border border-stone-200/80 bg-white/80 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
            <ShieldCheck className="h-3.5 w-3.5 text-forest-700" />
            Active planting standard
            {project.active_standard?.name && (
              <span className="font-normal normal-case text-stone-600">
                — {project.active_standard.name}
              </span>
            )}
          </div>
          {ruleLines.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {ruleLines.map((line) => (
                <li
                  key={line}
                  className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-700"
                >
                  {line}
                </li>
              ))}
            </ul>
          )}
          {speciesChips.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                Approved species
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {speciesChips.map((species) => (
                  <span
                    key={species}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-900 ring-1 ring-emerald-100"
                  >
                    <Leaf className="h-3 w-3" />
                    {species}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {workAreaCount > 0 && (
        <p className="text-xs text-stone-500">
          Select a work area below. Trees must be planted inside the project boundary for scheme
          compliance.
        </p>
      )}

      {requiresWorkArea && workAreaCount === 0 && (
        <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Draw at least one work area on the{" "}
            <Link href={`/projects/${project.id}`} className="font-medium underline">
              project map
            </Link>{" "}
            before registering trees.
          </p>
        </div>
      )}

      {requiresWorkArea && workAreaCount > 0 && !workAreaId && (
        <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Select a work area to enable compliance checks and registration.</p>
        </div>
      )}

      {compliancePreview && (
        <div
          className={cn(
            "rounded-lg border px-3 py-2 text-sm",
            compliancePreview.passed
              ? "border-green-200 bg-green-50 text-green-900"
              : "border-amber-200 bg-amber-50 text-amber-900",
          )}
        >
          <div className="flex items-center gap-2">
            {compliancePreview.passed ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            <span>
              {compliancePreview.passed
                ? "Location passes planting standard checks."
                : "Compliance notes before you submit:"}
            </span>
            {compliancePreview.chainage_km != null && (
              <span className="text-xs">Chainage ~{compliancePreview.chainage_km} km</span>
            )}
          </div>
          {!compliancePreview.passed && compliancePreview.issues.length > 0 && (
            <ul className="mt-1 list-disc pl-8 text-xs">
              {compliancePreview.issues.map((issue, idx) => (
                <li key={idx}>{issue.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
