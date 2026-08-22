"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, Leaf, Loader2 } from "lucide-react";
import {
  ProjectWizardSteps,
  SchemePickerStep,
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
  type CentralScheme,
  type ComplianceMode,
  type PlantingProject,
  type ProjectSegment,
} from "@/lib/api";
import {
  FLEX_PROJECT_OPTIONS,
  type CentralSchemeGroup,
  type FlexProjectCode,
} from "@/lib/schemes";
import { cn } from "@/lib/cn";
import { wizardRulesDifferFromBase } from "@/lib/rule-template-fields";
import {
  deriveTreeRegistrationDefaults,
  treeDefaultsToMetadata,
  validateTreeRegistrationDefaults,
  type TreeRegistrationDefaults,
} from "@/lib/tree-registration-defaults";

const SEGMENTS: { code: ProjectSegment; label: string; hint: string }[] = [
  {
    code: "nhai_highway",
    label: "NHAI / Highway",
    hint: "Linear corridor + chainage, strict spacing",
  },
  {
    code: "industrial_greenbelt",
    label: "Mine / Cement / Factory",
    hint: "Polygon green belt, density & native species",
  },
  {
    code: "township_landscape",
    label: "Township / Large society",
    hint: "Avenue and landscape blocks",
  },
  {
    code: "nagar_van_urban",
    label: "Nagar Van / Urban forest",
    hint: "ULB city-forest blocks, 10,000+ tree targets",
  },
  {
    code: "sahakar_van_coop",
    label: "Sahakar Van / Cooperative forest",
    hint: "NCCF–Amul Miyawaki + conventional arid-land planting",
  },
  {
    code: "ngo_watershed",
    label: "NGO / Watershed",
    hint: "Community plots, guided compliance",
  },
  {
    code: "general",
    label: "General plantation",
    hint: "Flexible boundaries",
  },
];

type Selection =
  | { kind: "scheme"; scheme: CentralScheme }
  | { kind: "flex"; code: FlexProjectCode };

function stepSubtitle(step: ProjectWizardStep, hasSchemeRefsStep: boolean): string {
  if (step === 1) {
    return "Link your site to a central government scheme so compliance checklists, govt reference IDs, and audit exports are configured automatically.";
  }
  if (step === 2) {
    return "Name your project, confirm the planting standard, and optionally adjust site-specific rules. Scheme references come next.";
  }
  if (step === 3 && hasSchemeRefsStep) {
    return "Enter government reference IDs now so tree registration inherits legal context automatically — no surprises later.";
  }
  return "Search your site, use GPS, and draw at least one polygon or corridor. Trees must fall inside a work area.";
}

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState<ProjectWizardStep>(1);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [schemeSearch, setSchemeSearch] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [segment, setSegment] = useState<ProjectSegment>("nhai_highway");
  const [complianceMode, setComplianceMode] = useState<ComplianceMode>("strict");
  const [programCode, setProgramCode] = useState("government_nhai");
  const [targetTrees, setTargetTrees] = useState("");
  const [surveyIntervalDays, setSurveyIntervalDays] = useState<15 | 30>(30);
  const [templateCode, setTemplateCode] = useState("");
  const [standardConfirmed, setStandardConfirmed] = useState(false);
  const [siteAdjustments, setSiteAdjustments] = useState(() =>
    initialSiteRuleAdjustments({}),
  );
  const [schemeRefs, setSchemeRefs] = useState<Record<string, string>>({});
  const [refErrors, setRefErrors] = useState<Record<string, string>>({});
  const [treeDefaults, setTreeDefaults] = useState<TreeRegistrationDefaults>(() =>
    deriveTreeRegistrationDefaults({}),
  );
  const [treeDefaultErrors, setTreeDefaultErrors] = useState<Record<string, string>>({});
  const [createdProject, setCreatedProject] = useState<PlantingProject | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: schemes = [], isLoading: schemesLoading } = useQuery({
    queryKey: ["central-schemes"],
    queryFn: () => centralSchemes.list(),
  });

  const selectedScheme = selection?.kind === "scheme" ? selection.scheme : null;
  const selectedFlex =
    selection?.kind === "flex"
      ? FLEX_PROJECT_OPTIONS.find((item) => item.code === selection.code)
      : null;
  const hasSchemeRefsStep = Boolean(selectedScheme);

  const schemeRefFields = useMemo(() => {
    const section = selectedScheme?.metadata_sections?.[0] as
      | { fields?: SchemeRefField[] }
      | undefined;
    return section?.fields ?? [];
  }, [selectedScheme]);

  const { data: templates = [] } = useQuery({
    queryKey: ["project-templates", segment],
    queryFn: () => plantingProjects.templates(segment),
  });

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.code === templateCode) ?? templates[0],
    [templates, templateCode],
  );

  const projectId = createdProject?.id;

  const { data: workAreas = [] } = useQuery({
    queryKey: ["project-work-areas", projectId],
    queryFn: () => plantingProjects.workAreas(projectId!),
    enabled: !!projectId && step === 4,
  });

  useEffect(() => {
    if (!templates.length) return;
    const schemeDefault = selectedScheme?.default_template_code;
    if (schemeDefault && templates.some((t) => t.code === schemeDefault)) {
      setTemplateCode(schemeDefault);
      return;
    }
    setTemplateCode((current) => current || templates[0].code);
  }, [templates, selectedScheme?.default_template_code]);

  useEffect(() => {
    if (!selectedScheme) {
      setSchemeRefs({});
      return;
    }
    const initial: Record<string, string> = {};
    for (const field of schemeRefFields) {
      initial[field.key] = "";
    }
    setSchemeRefs(initial);
    setRefErrors({});
  }, [selectedScheme?.code, schemeRefFields]);

  useEffect(() => {
    if (!selectedScheme && programCode !== "government_nhai") return;
    setTreeDefaults(
      deriveTreeRegistrationDefaults({
        schemeCode: selectedScheme?.code,
        schemeRefs,
        projectCode: code.trim(),
        projectName: name.trim(),
      }),
    );
  }, [selectedScheme?.code, schemeRefs, code, name, programCode]);

  useEffect(() => {
    if (templates.length > 0 && selectedTemplate) {
      setStandardConfirmed(false);
      setSiteAdjustments(initialSiteRuleAdjustments(selectedTemplate.rules ?? {}));
    }
  }, [selectedTemplate?.code, templates.length, selectedTemplate]);

  const schemesByGroup = useMemo(() => {
    const groups: Record<CentralSchemeGroup, CentralScheme[]> = {
      central: [],
      cooperative: [],
      convergence: [],
      corporate: [],
    };
    for (const scheme of schemes) {
      groups[scheme.group].push(scheme);
    }
    return groups;
  }, [schemes]);

  function applyScheme(scheme: CentralScheme) {
    setSelection({ kind: "scheme", scheme });
    setSegment(scheme.default_segment);
    setProgramCode(scheme.program_codes[0] ?? "government_nhai");
    setComplianceMode(scheme.default_compliance_mode);
    setTemplateCode(scheme.default_template_code ?? "");
    setShowAdvanced(false);
  }

  function applyFlex(code: FlexProjectCode) {
    const flex = FLEX_PROJECT_OPTIONS.find((item) => item.code === code);
    if (!flex) return;
    setSelection({ kind: "flex", code });
    setSegment(flex.segment);
    setProgramCode(flex.programCode);
    setComplianceMode(flex.complianceMode);
    setTemplateCode("");
    setShowAdvanced(false);
  }

  function validateDetailsStep(): boolean {
    if (!code.trim() || !name.trim()) {
      setError("Project code and name are required.");
      return false;
    }
    if (templates.length > 0 && !standardConfirmed) {
      setError("Confirm the planting standard before continuing.");
      return false;
    }
    if (
      siteAdjustments.enabled &&
      selectedTemplate &&
      !wizardRulesDifferFromBase(selectedTemplate.rules ?? {}, siteAdjustments.rules)
    ) {
      setError("Change at least one site rule, or turn off site adjustments.");
      return false;
    }
    setError(null);
    return true;
  }

  async function createProject() {
    setBusy(true);
    setError(null);
    try {
      const metadata: Record<string, unknown> = {
        survey_interval_days: surveyIntervalDays,
        setup_started_at: new Date().toISOString(),
        ...(selectedScheme?.legacy_plantation_category
          ? { plantation_category: selectedScheme.legacy_plantation_category }
          : {}),
      };
      if (hasSchemeRefsStep && Object.keys(schemeRefs).length > 0) {
        metadata.scheme_refs = Object.fromEntries(
          Object.entries(schemeRefs).map(([k, v]) => [k, v.trim() === "" ? null : v.trim()]),
        );
      }
      if (programCode === "government_nhai" || selectedScheme) {
        metadata.tree_registration_defaults = treeDefaultsToMetadata(treeDefaults);
      }

      const project = await plantingProjects.create({
        code: code.trim(),
        name: name.trim(),
        description: description.trim(),
        segment,
        compliance_mode: complianceMode,
        program_code: programCode || undefined,
        scheme_code: selectedScheme?.code,
        standard_template_code: selectedTemplate?.code,
        target_tree_count: targetTrees ? Number(targetTrees) : undefined,
        metadata,
      });

      if (
        siteAdjustments.enabled &&
        selectedTemplate &&
        wizardRulesDifferFromBase(selectedTemplate.rules ?? {}, siteAdjustments.rules)
      ) {
        await plantingProjects.updateRuleOverride(project.id, {
          enabled: true,
          rules: siteAdjustments.rules,
          compliance_mode: complianceMode,
          publish_note:
            siteAdjustments.note.trim() ||
            "Site-specific rule adjustments during project setup",
        });
      }

      setCreatedProject(project);
      setStep(4);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDetailsContinue(e: React.FormEvent) {
    e.preventDefault();
    if (!validateDetailsStep()) return;
    if (hasSchemeRefsStep) {
      setStep(3);
      return;
    }
    if (programCode === "government_nhai") {
      const defaultErrors = validateTreeRegistrationDefaults(treeDefaults);
      if (Object.keys(defaultErrors).length > 0) {
        setTreeDefaultErrors(defaultErrors);
        setError("Complete tree registration defaults before continuing.");
        return;
      }
    }
    await createProject();
  }

  async function handleSchemeRefsContinue(e: React.FormEvent) {
    e.preventDefault();
    const errors = validateSchemeRefs(schemeRefFields, schemeRefs);
    const defaultErrors = validateTreeRegistrationDefaults(treeDefaults);
    if (Object.keys(errors).length > 0 || Object.keys(defaultErrors).length > 0) {
      setRefErrors(errors);
      setTreeDefaultErrors(defaultErrors);
      setError("Fill all required scheme references and tree registration defaults.");
      return;
    }
    setRefErrors({});
    setError(null);
    await createProject();
  }

  const selectionLabel =
    selectedScheme?.label ?? selectedFlex?.label ?? "Select a central scheme";

  const requiresWorkArea =
    createdProject?.compliance_mode === "strict" ||
    createdProject?.compliance_mode === "guided";
  const canFinishSetup = !requiresWorkArea || workAreas.length > 0;

  const registerHref = createdProject
    ? `/trees/new?project=${createdProject.id}${
        workAreas[0] ? `&work_area=${workAreas[0].id}` : ""
      }`
    : "#";

  return (
    <div className="registration-shell w-full space-y-8 pb-8">
      <header className="space-y-5">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-forest-700 hover:text-forest-900"
        >
          <ArrowLeft className="h-4 w-4" />
          All projects
        </Link>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl dark:text-stone-50">
            New planting project
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-stone-600">
            {stepSubtitle(step, hasSchemeRefsStep)}
          </p>
        </div>

        <ProjectWizardSteps step={step} hasSchemeRefsStep={hasSchemeRefsStep} />
      </header>

      {step === 1 ? (
        <SchemePickerStep
          schemes={schemes}
          schemesByGroup={schemesByGroup}
          schemesLoading={schemesLoading}
          selectedScheme={selectedScheme}
          search={schemeSearch}
          onSearchChange={setSchemeSearch}
          onSelectScheme={applyScheme}
          flexOptions={FLEX_PROJECT_OPTIONS}
          selectedFlexCode={selection?.kind === "flex" ? selection.code : null}
          onSelectFlex={(c) => applyFlex(c as FlexProjectCode)}
          onContinue={() => setStep(2)}
        />
      ) : step === 2 ? (
        <form
          onSubmit={handleDetailsContinue}
          className="space-y-6 rounded-2xl border border-stone-200/90 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-8"
        >
          <LinkedSchemeBanner
            label={selectionLabel}
            ministry={selectedScheme?.ministry}
            onChangeScheme={() => setStep(1)}
          />

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="label">Project code</label>
              <input
                className="field-input mt-1"
                required
                placeholder={
                  selectedScheme?.code === "nhai_highway"
                    ? "NH44-PKG3"
                    : selectedScheme?.code === "nagar_van"
                      ? "ULB-PARKS-2026"
                      : selectedScheme?.code === "sahakar_van"
                        ? "SV-NCCF-2026"
                        : "SCHEME-CODE"
                }
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <p className="mt-1 text-xs text-stone-400">Unique ID for reports and APO import matching</p>
            </div>
            <div>
              <label className="label">Project name</label>
              <input
                className="field-input mt-1"
                required
                placeholder="e.g. NH-44 Package 3 greening"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">Description (optional)</label>
            <textarea
              className="field-input mt-1 min-h-[88px]"
              placeholder="District, package, or block details for your team"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {templates.length > 0 && (
            <div className="space-y-3">
              <label className="label">Planting standard template</label>
              <select
                className="input mt-1"
                value={selectedTemplate?.code ?? ""}
                onChange={(e) => setTemplateCode(e.target.value)}
              >
                {templates.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.name}
                  </option>
                ))}
              </select>
              <PlantingStandardPreview
                template={selectedTemplate}
                confirmed={standardConfirmed}
                onConfirmChange={setStandardConfirmed}
              />
              <SiteRuleAdjustmentsPanel
                baseRules={selectedTemplate.rules ?? {}}
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
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="label">Target trees (optional)</label>
              <input
                className="field-input mt-1"
                type="number"
                min={1}
                placeholder="10000"
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
          </div>

          <AdvancedSegmentPanel
            showAdvanced={showAdvanced}
            onToggle={() => setShowAdvanced((open) => !open)}
            segment={segment}
            complianceMode={complianceMode}
            programCode={programCode}
            onSegmentChange={(s) => {
              setSegment(s);
              setTemplateCode("");
            }}
            onComplianceChange={setComplianceMode}
            onProgramChange={setProgramCode}
          />

          {error && (
            <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>
          )}

          <WizardNav
            backLabel="Back to schemes"
            onBack={() => setStep(1)}
            primaryLabel={
              busy
                ? "Creating…"
                : hasSchemeRefsStep
                  ? "Continue to scheme references"
                  : "Create project & draw areas"
            }
            primaryDisabled={busy}
            primaryType="submit"
          />
        </form>
      ) : step === 3 && hasSchemeRefsStep ? (
        <form
          onSubmit={handleSchemeRefsContinue}
          className="space-y-6 rounded-2xl border border-stone-200/90 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-8"
        >
          <LinkedSchemeBanner
            label={selectionLabel}
            ministry={selectedScheme?.ministry}
            onChangeScheme={() => setStep(1)}
          />

          <div>
            <h2 className="text-sm font-medium text-stone-900">Government reference IDs</h2>
            <p className="mt-1 text-sm text-stone-500">
              {selectedScheme?.label} · {selectedScheme?.ministry}. These flow into tree registration
              and audit exports — you can edit them later in the project setup wizard.
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

          {error && (
            <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>
          )}

          <WizardNav
            backLabel="Back to project details"
            onBack={() => setStep(2)}
            primaryLabel={busy ? "Creating project…" : "Create project & draw areas"}
            primaryDisabled={busy}
            primaryType="submit"
          />
        </form>
      ) : step === 4 && createdProject ? (
        <div className="space-y-6 rounded-2xl border border-stone-200/90 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-forest-700">
                Step 4 · Draw work areas
              </p>
              <h2 className="mt-1 text-lg font-semibold text-stone-900">{createdProject.name}</h2>
              <p className="text-sm text-stone-500">{createdProject.code}</p>
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
              Use search or GPS to find your site, click the map to place points, then save a named
              polygon or corridor.{" "}
              {requiresWorkArea
                ? "At least one work area is required before you can register trees."
                : "Work areas help organize trees but are optional in open mode."}
            </p>
          </div>

          <div id="work-areas">
            <ProjectWorkAreaMap
              projectId={createdProject.id}
              workAreas={workAreas}
              autoDraw={workAreas.length === 0}
              defaultGeometryType={
                createdProject.segment === "nhai_highway" ? "corridor" : "polygon"
              }
              height="50vh"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-stone-100 pt-5 sm:flex-row sm:justify-between dark:border-stone-800">
            <button
              type="button"
              className="btn-secondary"
              disabled={busy}
              onClick={() => router.push(`/projects/${createdProject.id}`)}
            >
              Skip for now — go to project
            </button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href={`/projects/${createdProject.id}`}
                className="btn-secondary justify-center"
              >
                View project overview
              </Link>
              <button
                type="button"
                className="btn-primary"
                disabled={!canFinishSetup || busy}
                onClick={() => router.push(canFinishSetup ? registerHref : `#work-areas`)}
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

function LinkedSchemeBanner({
  label,
  ministry,
  onChangeScheme,
}: {
  label: string;
  ministry?: string;
  onChangeScheme: () => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-forest-100 bg-gradient-to-r from-forest-50/80 to-white px-4 py-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-forest-700">
          Linked scheme
        </p>
        <p className="mt-1 font-medium text-stone-900">{label}</p>
        {ministry && <p className="text-xs text-stone-500">{ministry}</p>}
      </div>
      <button
        type="button"
        className="text-sm font-medium text-forest-700 underline-offset-2 hover:underline"
        onClick={onChangeScheme}
      >
        Change scheme
      </button>
    </div>
  );
}

function AdvancedSegmentPanel({
  showAdvanced,
  onToggle,
  segment,
  complianceMode,
  programCode,
  onSegmentChange,
  onComplianceChange,
  onProgramChange,
}: {
  showAdvanced: boolean;
  onToggle: () => void;
  segment: ProjectSegment;
  complianceMode: ComplianceMode;
  programCode: string;
  onSegmentChange: (segment: ProjectSegment) => void;
  onComplianceChange: (mode: ComplianceMode) => void;
  onProgramChange: (code: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 dark:border-stone-700">
      <button
        type="button"
        className="flex w-full items-center justify-between bg-stone-50/80 px-4 py-3 text-left text-sm font-medium text-stone-700 dark:bg-stone-800/50"
        onClick={onToggle}
      >
        Advanced: segment, program &amp; compliance
        {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {showAdvanced && (
        <div className="space-y-4 border-t border-stone-200 px-4 py-4 dark:border-stone-700">
          <div>
            <label className="label">Segment</label>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {SEGMENTS.map((s) => (
                <button
                  key={s.code}
                  type="button"
                  className={cn(
                    "rounded-xl border p-3 text-left text-sm transition",
                    segment === s.code
                      ? "border-forest-500 bg-forest-50 ring-2 ring-forest-500/15"
                      : "border-stone-200 hover:border-stone-300",
                  )}
                  onClick={() => onSegmentChange(s.code)}
                >
                  <div className="font-medium">{s.label}</div>
                  <div className="text-xs text-stone-500">{s.hint}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Compliance mode</label>
              <select
                className="input mt-1"
                value={complianceMode}
                onChange={(e) => onComplianceChange(e.target.value as ComplianceMode)}
              >
                <option value="strict">Strict (block violations)</option>
                <option value="guided">Guided (warn)</option>
                <option value="open">Open (no boundary)</option>
              </select>
            </div>
            <div>
              <label className="label">Program</label>
              <select
                className="input mt-1"
                value={programCode}
                onChange={(e) => onProgramChange(e.target.value)}
              >
                <option value="government_nhai">Government / Public sector</option>
                <option value="corporate_esg">Corporate ESG</option>
                <option value="ngo_community">NGO / Community</option>
                <option value="byot">BYOT</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WizardNav({
  backLabel,
  onBack,
  primaryLabel,
  primaryDisabled,
  primaryType,
}: {
  backLabel: string;
  onBack: () => void;
  primaryLabel: string;
  primaryDisabled?: boolean;
  primaryType: "submit" | "button";
}) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-stone-100 pt-5 sm:flex-row sm:justify-between dark:border-stone-800">
      <button type="button" className="btn-secondary" onClick={onBack}>
        {backLabel}
      </button>
      <button type={primaryType} className="btn-primary" disabled={primaryDisabled}>
        {primaryDisabled && primaryLabel.includes("…") ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {primaryLabel}
          </>
        ) : (
          primaryLabel
        )}
      </button>
    </div>
  );
}
