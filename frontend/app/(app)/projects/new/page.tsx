"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import {
  ProjectWizardSteps,
  SchemePickerStep,
} from "@/components/projects/scheme-picker";
import {
  centralSchemes,
  errorMessage,
  plantingProjects,
  type CentralScheme,
  type ComplianceMode,
  type ProjectSegment,
} from "@/lib/api";
import {
  FLEX_PROJECT_OPTIONS,
  type CentralSchemeGroup,
  type FlexProjectCode,
} from "@/lib/schemes";
import { cn } from "@/lib/cn";

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

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
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

  const { data: templates = [] } = useQuery({
    queryKey: ["project-templates", segment],
    queryFn: () => plantingProjects.templates(segment),
  });

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.code === templateCode) ?? templates[0],
    [templates, templateCode],
  );

  useEffect(() => {
    if (templates.length) {
      setTemplateCode((current) => current || templates[0].code);
    }
  }, [templates]);

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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
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
        metadata: {
          survey_interval_days: surveyIntervalDays,
          ...(selectedScheme?.legacy_plantation_category
            ? { plantation_category: selectedScheme.legacy_plantation_category }
            : {}),
        },
      });
      router.push(`/projects/${project.id}?draw=1#work-areas`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const selectionLabel =
    selectedScheme?.label ?? selectedFlex?.label ?? "Select a central scheme";

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
            {step === 1
              ? "Link your site to a central government scheme so compliance checklists, govt reference IDs, and audit exports are configured automatically."
              : "Name your project and set targets. Next you will draw work areas on the map."}
          </p>
        </div>

        <ProjectWizardSteps step={step} />
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
      ) : (
        <form
          onSubmit={submit}
          className="space-y-6 rounded-2xl border border-stone-200/90 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-8"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-forest-100 bg-gradient-to-r from-forest-50/80 to-white px-4 py-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-forest-700">
                Linked scheme
              </p>
              <p className="mt-1 font-medium text-stone-900">{selectionLabel}</p>
              {selectedScheme && (
                <p className="text-xs text-stone-500">{selectedScheme.ministry}</p>
              )}
            </div>
            <button
              type="button"
              className="text-sm font-medium text-forest-700 underline-offset-2 hover:underline"
              onClick={() => setStep(1)}
            >
              Change scheme
            </button>
          </div>

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
            <div>
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
              {selectedTemplate && (
                <p className="mt-1 text-xs text-stone-500">{selectedTemplate.description}</p>
              )}
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

          <div className="overflow-hidden rounded-xl border border-stone-200 dark:border-stone-700">
            <button
              type="button"
              className="flex w-full items-center justify-between bg-stone-50/80 px-4 py-3 text-left text-sm font-medium text-stone-700 dark:bg-stone-800/50"
              onClick={() => setShowAdvanced((open) => !open)}
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
                        onClick={() => {
                          setSegment(s.code);
                          setTemplateCode("");
                        }}
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
                      onChange={(e) => setComplianceMode(e.target.value as ComplianceMode)}
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
                      onChange={(e) => setProgramCode(e.target.value)}
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

          {error && (
            <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-stone-100 pt-5 sm:flex-row sm:justify-between dark:border-stone-800">
            <button type="button" className="btn-secondary" onClick={() => setStep(1)}>
              Back to schemes
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? "Creating…" : "Create project & draw areas"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
