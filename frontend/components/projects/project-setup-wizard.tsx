"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Leaf, Loader2 } from "lucide-react";
import {
  ProjectWizardSteps,
  type ProjectWizardStep,
} from "@/components/projects/scheme-picker";
import { PlantingStandardPreview } from "@/components/projects/planting-standard-preview";
import { ProjectWorkAreaMap } from "@/components/projects/project-work-area-map";
import {
  initialSiteRuleAdjustments,
  SiteRuleAdjustmentsPanel,
} from "@/components/projects/site-rule-adjustments-panel";
import { TreeRegistrationDefaultsForm } from "@/components/projects/tree-registration-defaults-form";
import {
  SchemeRefsFields,
  validateSchemeRefs,
  type SchemeRefField,
} from "@/components/projects/scheme-refs-fields";
import {
  centralSchemes,
  errorMessage,
  plantingProjects,
  type PlantingProject,
  type StandardTemplate,
} from "@/lib/api";
import { schemeByCode, isMonitoringScheme } from "@/lib/schemes";
import { wizardRulesDifferFromBase } from "@/lib/rule-template-fields";
import {
  deriveTreeRegistrationDefaults,
  treeDefaultsToMetadata,
  treeRegistrationDefaultsFromProject,
  validateTreeRegistrationDefaults,
  type TreeRegistrationDefaults,
} from "@/lib/tree-registration-defaults";
import { evaluateProjectSetup } from "@/lib/project-setup-readiness";
import { projectOverviewHref } from "@/lib/project-focused-ui";

function resumeStepSubtitle(step: ProjectWizardStep, hasSchemeRefsStep: boolean): string {
  if (step === 1) {
    return "Your linked central scheme drives compliance checklists, government reference IDs, and audit exports.";
  }
  if (step === 2) {
    return "Review project details, confirm the planting standard, and adjust site-specific rules if needed.";
  }
  if (step === 3 && hasSchemeRefsStep) {
    return "Enter or update government reference IDs and tree registration defaults for audit-ready tree registration.";
  }
  return "Search your site, use GPS, and draw at least one polygon or corridor. Trees must fall inside a work area.";
}

function defaultResumeStep(
  project: PlantingProject,
  scheme: ReturnType<typeof schemeByCode>,
  workAreaCount: number,
): ProjectWizardStep {
  const status = evaluateProjectSetup({
    project,
    workAreas: Array.from({ length: workAreaCount }, (_, i) => ({
      id: `wa-${i}`,
      name: "area",
    })) as never,
    scheme: (scheme ?? null) as never,
  });
  const incomplete = status.steps.find((s) => s.required && !s.complete);
  if (incomplete?.id === "scheme_refs" || incomplete?.id === "tree_defaults") return 3;
  if (incomplete?.id === "work_areas") return 4;
  if (incomplete?.id === "planting_standard") return 2;
  return 1;
}

export function ProjectSetupWizard({ projectId }: { projectId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const requestedStep = Number(searchParams.get("step"));

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["planting-project", projectId],
    queryFn: () => plantingProjects.get(projectId),
  });

  const { data: schemes = [] } = useQuery({
    queryKey: ["central-schemes"],
    queryFn: () => centralSchemes.list(),
  });

  const { data: workAreas = [] } = useQuery({
    queryKey: ["project-work-areas", projectId],
    queryFn: () => plantingProjects.workAreas(projectId),
    enabled: Boolean(projectId),
  });

  const { data: ruleOverride } = useQuery({
    queryKey: ["project-rule-override", projectId],
    queryFn: () => plantingProjects.getRuleOverride(projectId),
    enabled: Boolean(projectId),
  });

  const scheme = schemeByCode(schemes, project?.scheme_code);
  const monitoringMode = isMonitoringScheme(project?.scheme_code);
  const hasSchemeRefsStep = Boolean(project?.scheme_code && scheme);

  const schemeRefFields = useMemo(() => {
    const section = scheme?.metadata_sections?.[0] as
      | { fields?: SchemeRefField[] }
      | undefined;
    return section?.fields ?? [];
  }, [scheme]);

  const [step, setStep] = useState<ProjectWizardStep>(1);
  const [stepInitialized, setStepInitialized] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetTrees, setTargetTrees] = useState("");
  const [surveyIntervalDays, setSurveyIntervalDays] = useState<15 | 30>(30);
  const [schemeRefs, setSchemeRefs] = useState<Record<string, string>>({});
  const [refErrors, setRefErrors] = useState<Record<string, string>>({});
  const [treeDefaults, setTreeDefaults] = useState<TreeRegistrationDefaults>(() =>
    deriveTreeRegistrationDefaults({}),
  );
  const [treeDefaultErrors, setTreeDefaultErrors] = useState<Record<string, string>>({});
  const [siteAdjustments, setSiteAdjustments] = useState(() =>
    initialSiteRuleAdjustments({}),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!project) return;
    setName(project.name);
    setDescription(project.description ?? "");
    setTargetTrees(project.target_tree_count != null ? String(project.target_tree_count) : "");
    setSurveyIntervalDays(
      Number((project.metadata?.survey_interval_days as number | undefined) ?? 30) === 15 ? 15 : 30,
    );

    const refs = (project.metadata?.scheme_refs as Record<string, string> | undefined) ?? {};
    const initialRefs: Record<string, string> = {};
    for (const field of schemeRefFields) {
      initialRefs[field.key] = refs[field.key] != null ? String(refs[field.key]) : "";
    }
    setSchemeRefs(initialRefs);
    setTreeDefaults(treeRegistrationDefaultsFromProject(project));
  }, [project, schemeRefFields]);

  useEffect(() => {
    if (!ruleOverride || !project) return;
    const baseRules = ruleOverride.base_rules ?? project.active_standard?.rules ?? {};
    const overrideRules = ruleOverride.override?.enabled
      ? ruleOverride.override.rules
      : baseRules;
    setSiteAdjustments({
      enabled: Boolean(ruleOverride.override?.enabled),
      rules: { ...baseRules, ...overrideRules },
      note: ruleOverride.override?.publish_note ?? "",
    });
  }, [ruleOverride, project]);

  useEffect(() => {
    if (!project || stepInitialized) return;
    const validStep =
      requestedStep >= 1 && requestedStep <= 4 ? (requestedStep as ProjectWizardStep) : null;
    setStep(validStep ?? defaultResumeStep(project, scheme, workAreas.length));
    setStepInitialized(true);
  }, [project, scheme, workAreas.length, requestedStep, stepInitialized]);

  useEffect(() => {
    if (!project) return;
    setTreeDefaults(
      deriveTreeRegistrationDefaults({
        schemeCode: project.scheme_code ?? undefined,
        schemeRefs,
        projectCode: project.code,
        projectName: name.trim() || project.name,
        existing: treeRegistrationDefaultsFromProject(project),
      }),
    );
  }, [project, schemeRefs, name]);

  async function saveDetailsStep(): Promise<boolean> {
    if (!project) return false;
    if (
      siteAdjustments.enabled &&
      project.active_standard?.rules &&
      !wizardRulesDifferFromBase(project.active_standard.rules, siteAdjustments.rules)
    ) {
      setError("Change at least one site rule, or turn off site adjustments.");
      return false;
    }
    setBusy(true);
    setError(null);
    try {
      await plantingProjects.update(project.id, {
        name: name.trim() || project.name,
        description: description.trim(),
        target_tree_count: targetTrees ? Number(targetTrees) : undefined,
        metadata: {
          ...project.metadata,
          survey_interval_days: surveyIntervalDays,
        },
      });

      if (
        siteAdjustments.enabled &&
        project.active_standard?.rules &&
        wizardRulesDifferFromBase(project.active_standard.rules, siteAdjustments.rules)
      ) {
        await plantingProjects.updateRuleOverride(project.id, {
          enabled: true,
          rules: siteAdjustments.rules,
          compliance_mode: project.compliance_mode,
          publish_note:
            siteAdjustments.note.trim() || "Site-specific rule adjustments during project setup",
        });
      }

      await qc.invalidateQueries({ queryKey: ["planting-project", project.id] });
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveSchemeRefsStep(): Promise<boolean> {
    if (!project) return false;
    const errors = validateSchemeRefs(schemeRefFields, schemeRefs);
    const defaultErrors = monitoringMode ? {} : validateTreeRegistrationDefaults(treeDefaults);
    if (Object.keys(errors).length > 0 || Object.keys(defaultErrors).length > 0) {
      setRefErrors(errors);
      setTreeDefaultErrors(defaultErrors);
      setError(
        monitoringMode
          ? "Fill all required estate details."
          : "Fill all required scheme references and tree registration defaults.",
      );
      return false;
    }
    setBusy(true);
    setError(null);
    try {
      await plantingProjects.updateSchemeMetadata(project.id, {
        scheme_refs: Object.fromEntries(
          Object.entries(schemeRefs).map(([k, v]) => [k, v.trim() === "" ? null : v.trim()]),
        ),
      });
      if (!monitoringMode) {
        await plantingProjects.update(project.id, {
          metadata: {
            ...project.metadata,
            tree_registration_defaults: treeDefaultsToMetadata(treeDefaults),
          },
        });
      }
      await qc.invalidateQueries({ queryKey: ["planting-project", project.id] });
      setRefErrors({});
      setTreeDefaultErrors({});
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (projectLoading || !project) {
    return <p className="text-sm text-stone-500">Loading project setup…</p>;
  }

  const requiresWorkArea =
    project.compliance_mode === "strict" || project.compliance_mode === "guided";
  const canFinishSetup = !requiresWorkArea || workAreas.length > 0;
  const registerHref = `/trees/new?project=${project.id}${
    workAreas[0] ? `&work_area=${workAreas[0].id}` : ""
  }`;

  const activeStandardTemplate: StandardTemplate | null = project.active_standard
    ? {
        code: project.active_standard.name,
        name: project.active_standard.name,
        description: "",
        segment: project.segment,
        compliance_mode: project.compliance_mode,
        recommended_program_codes: [],
        rules: project.active_standard.rules ?? {},
      }
    : null;

  return (
    <div className="registration-shell w-full space-y-8 pb-8">
      <header className="space-y-5">
        <Link
          href={projectOverviewHref(projectId)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-forest-700 hover:text-forest-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {project.name}
        </Link>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
            Project setup
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-stone-600">
            {resumeStepSubtitle(step, hasSchemeRefsStep)}
          </p>
        </div>

        <ProjectWizardSteps step={step} hasSchemeRefsStep={hasSchemeRefsStep} />
      </header>

      {step === 1 ? (
        <div className="space-y-6 rounded-2xl border border-stone-200/90 bg-white p-6 shadow-sm sm:p-8">
          <div className="rounded-xl border border-forest-100 bg-gradient-to-r from-forest-50/80 to-white px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-forest-700">
              Linked scheme
            </p>
            {scheme ? (
              <>
                <p className="mt-1 text-lg font-medium text-stone-900">{scheme.label}</p>
                <p className="text-sm text-stone-500">{scheme.ministry}</p>
              </>
            ) : (
              <>
                <p className="mt-1 text-lg font-medium text-stone-900">Flexible project</p>
                <p className="text-sm text-stone-500">
                  {project.program_code?.replace(/_/g, " ") ?? "No central scheme"} ·{" "}
                  {project.compliance_mode} mode
                </p>
              </>
            )}
            <p className="mt-3 text-xs text-stone-500">
              Scheme selection is fixed at project creation. Continue to configure references,
              defaults, and work areas.
            </p>
          </div>

          <SetupNav
            onContinue={() => setStep(2)}
            continueLabel="Continue to project details"
          />
        </div>
      ) : step === 2 ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await saveDetailsStep();
            if (!ok) return;
            if (hasSchemeRefsStep) {
              setStep(3);
              return;
            }
            if (project.program_code === "government_nhai") {
              const defaultErrors = validateTreeRegistrationDefaults(treeDefaults);
              if (Object.keys(defaultErrors).length > 0) {
                setTreeDefaultErrors(defaultErrors);
                setError("Complete tree registration defaults before continuing.");
                return;
              }
              setBusy(true);
              try {
                await plantingProjects.update(project.id, {
                  metadata: {
                    ...project.metadata,
                    tree_registration_defaults: treeDefaultsToMetadata(treeDefaults),
                  },
                });
                await qc.invalidateQueries({ queryKey: ["planting-project", project.id] });
              } catch (err) {
                setError(errorMessage(err));
                setBusy(false);
                return;
              }
              setBusy(false);
            }
            setStep(4);
          }}
          className="space-y-6 rounded-2xl border border-stone-200/90 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="label">Project code</label>
              <input className="field-input mt-1 bg-stone-50" value={project.code} readOnly />
            </div>
            <div>
              <label className="label">Project name</label>
              <input
                className="field-input mt-1"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">Description (optional)</label>
            <textarea
              className="field-input mt-1 min-h-[88px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {activeStandardTemplate ? (
            <div className="space-y-3">
              <PlantingStandardPreview template={activeStandardTemplate} />
              <SiteRuleAdjustmentsPanel
                baseRules={project.active_standard?.rules ?? {}}
                enabled={siteAdjustments.enabled}
                rules={siteAdjustments.rules}
                note={siteAdjustments.note}
                onEnabledChange={(enabled) =>
                  setSiteAdjustments((current) => ({ ...current, enabled }))
                }
                onRulesChange={(rules) =>
                  setSiteAdjustments((current) => ({ ...current, rules }))
                }
                onNoteChange={(note) =>
                  setSiteAdjustments((current) => ({ ...current, note }))
                }
              />
            </div>
          ) : (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
              No planting standard is attached. Contact your administrator — tree registration
              requires an active standard.
            </p>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            {!monitoringMode && (
              <>
                <div>
                  <label className="label">Target trees (optional)</label>
                  <input
                    className="field-input mt-1"
                    type="number"
                    min={1}
                    value={targetTrees}
                    onChange={(e) => setTargetTrees(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Survival survey interval</label>
                  <select
                    className="input mt-1"
                    value={surveyIntervalDays}
                    onChange={(e) => setSurveyIntervalDays(Number(e.target.value) as 15 | 30)}
                  >
                    <option value={15}>Every 15 days</option>
                    <option value={30}>Every 30 days</option>
                  </select>
                </div>
              </>
            )}
            {monitoringMode && (
              <div className="sm:col-span-2 rounded-lg border border-sky-100 bg-sky-50/60 px-4 py-3 text-sm text-sky-950">
                Satellite NDVI scans run monthly on work-area polygons. Tree registration and
                survival surveys are optional for plot-based ground truth.
              </div>
            )}
          </div>

          {!hasSchemeRefsStep && project.program_code === "government_nhai" && (
            <TreeRegistrationDefaultsForm
              values={treeDefaults}
              errors={treeDefaultErrors}
              onChange={(key, value) => {
                setTreeDefaults((prev) => ({ ...prev, [key]: value }));
                setTreeDefaultErrors((prev) => {
                  const next = { ...prev };
                  delete next[key];
                  return next;
                });
              }}
            />
          )}

          {error && (
            <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>
          )}

          <SetupNav
            backLabel="Back to scheme"
            onBack={() => setStep(1)}
            continueLabel={
              busy
                ? "Saving…"
                : hasSchemeRefsStep
                  ? "Continue to scheme references"
                  : "Continue to work areas"
            }
            continueDisabled={busy}
            continueType="submit"
          />
        </form>
      ) : step === 3 && hasSchemeRefsStep ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await saveSchemeRefsStep();
            if (ok) setStep(4);
          }}
          className="space-y-6 rounded-2xl border border-stone-200/90 bg-white p-6 shadow-sm sm:p-8"
        >
          <div>
            <h2 className="text-sm font-medium text-stone-900">
              {monitoringMode ? "Estate details" : "Government reference IDs"}
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              {scheme?.label} · {scheme?.ministry}.{" "}
              {monitoringMode
                ? "Basic estate identity for satellite monitoring exports — no tree census required."
                : "These flow into tree registration and audit exports — edit here anytime during setup."}
            </p>
          </div>

          <SchemeRefsFields
            fields={schemeRefFields}
            values={schemeRefs}
            errors={refErrors}
            onChange={(key, value) => {
              setSchemeRefs((prev) => ({ ...prev, [key]: value }));
              setRefErrors((prev) => {
                const next = { ...prev };
                delete next[key];
                return next;
              });
            }}
          />

          {!monitoringMode && (
            <TreeRegistrationDefaultsForm
              values={treeDefaults}
              errors={treeDefaultErrors}
              onChange={(key, value) => {
                setTreeDefaults((prev) => ({ ...prev, [key]: value }));
                setTreeDefaultErrors((prev) => {
                  const next = { ...prev };
                  delete next[key];
                  return next;
                });
              }}
            />
          )}

          {error && (
            <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>
          )}

          <SetupNav
            backLabel="Back to project details"
            onBack={() => setStep(2)}
            continueLabel={busy ? "Saving…" : "Continue to work areas"}
            continueDisabled={busy}
            continueType="submit"
          />
        </form>
      ) : step === 4 ? (
        <div className="space-y-6 rounded-2xl border border-stone-200/90 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-forest-700">
                Step 4 · Draw work areas
              </p>
              <h2 className="mt-1 text-lg font-semibold text-stone-900">{project.name}</h2>
              <p className="text-sm text-stone-500">{project.code}</p>
            </div>
            {canFinishSetup && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Setup complete
              </span>
            )}
          </div>

          <div className="rounded-xl border border-sky-100 bg-sky-50/80 px-4 py-3 text-sm text-sky-950">
            <p className="font-medium">Draw where planting happens</p>
            <p className="mt-1 text-sky-900/80">
              {requiresWorkArea
                ? "At least one work area is required before you can register trees."
                : "Work areas help organize trees but are optional in open mode."}
            </p>
          </div>

          <div id="work-areas">
            <ProjectWorkAreaMap
              projectId={project.id}
              workAreas={workAreas}
              autoDraw={workAreas.length === 0}
              defaultGeometryType={project.segment === "nhai_highway" ? "corridor" : "polygon"}
              height="50vh"
            />
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-stone-100 pt-5 sm:flex-row sm:justify-between">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setStep(hasSchemeRefsStep ? 3 : 2)}
            >
              Back
            </button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href={projectOverviewHref(projectId)} className="btn-secondary justify-center">
                View project overview
              </Link>
              <button
                type="button"
                className="btn-primary"
                disabled={!canFinishSetup}
                onClick={() => router.push(canFinishSetup ? registerHref : "#work-areas")}
              >
                <Leaf className="h-4 w-4" />
                {canFinishSetup ? "Register first tree" : "Draw a work area first"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SetupNav({
  backLabel,
  onBack,
  onContinue,
  continueLabel,
  continueDisabled,
  continueType = "button",
}: {
  backLabel?: string;
  onBack?: () => void;
  onContinue?: () => void;
  continueLabel: string;
  continueDisabled?: boolean;
  continueType?: "submit" | "button";
}) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-stone-100 pt-5 sm:flex-row sm:justify-between">
      {backLabel && onBack ? (
        <button type="button" className="btn-secondary" onClick={onBack}>
          {backLabel}
        </button>
      ) : (
        <span />
      )}
      <button
        type={continueType}
        className="btn-primary"
        disabled={continueDisabled}
        onClick={continueType === "button" ? onContinue : undefined}
      >
        {continueDisabled && continueLabel.includes("…") ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {continueLabel}
          </>
        ) : (
          continueLabel
        )}
      </button>
    </div>
  );
}
