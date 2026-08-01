"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react";
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
  SCHEME_GROUP_LABEL,
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
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const selectionLabel =
    selectedScheme?.label ?? selectedFlex?.label ?? "Select a central scheme";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/projects" className="text-sm text-forest-700 hover:underline">
          ← All projects
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">New planting project</h1>
        <p className="mt-1 text-sm text-stone-600">
          {step === 1
            ? "Choose the central government scheme or programme this project runs under."
            : "Add project details, then draw work areas on the map."}
        </p>
      </div>

      {step === 1 ? (
        <div className="card space-y-6">
          {schemesLoading ? (
            <p className="text-sm text-stone-500">Loading central schemes…</p>
          ) : (
            (["central", "convergence", "corporate"] as CentralSchemeGroup[]).map((group) =>
              schemesByGroup[group].length > 0 ? (
                <div key={group}>
                  <p className="kpi-label">{SCHEME_GROUP_LABEL[group]}</p>
                  <div className="mt-3 grid gap-2">
                    {schemesByGroup[group].map((scheme) => (
                      <button
                        key={scheme.code}
                        type="button"
                        className={cn(
                          "rounded-lg border p-3 text-left text-sm transition",
                          selectedScheme?.code === scheme.code
                            ? "border-forest-500 bg-forest-50"
                            : "border-stone-200 hover:border-stone-300",
                        )}
                        onClick={() => applyScheme(scheme)}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{scheme.label}</span>
                          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-600">
                            {scheme.ministry}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-stone-500">{scheme.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null,
            )
          )}

          <div>
            <p className="kpi-label">Corporate CSR (no central scheme tag)</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {FLEX_PROJECT_OPTIONS.map((flex) => (
                <button
                  key={flex.code}
                  type="button"
                  className={cn(
                    "rounded-lg border p-3 text-left text-sm transition",
                    selection?.kind === "flex" && selection.code === flex.code
                      ? "border-forest-500 bg-forest-50"
                      : "border-stone-200 hover:border-stone-300",
                  )}
                  onClick={() => applyFlex(flex.code)}
                >
                  <div className="font-medium">{flex.label}</div>
                  <div className="text-xs text-stone-500">{flex.hint}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end border-t border-stone-200 pt-4">
            <button
              type="button"
              className="btn-primary"
              disabled={!selection}
              onClick={() => setStep(2)}
            >
              Continue to project details
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="card space-y-5">
          <div className="rounded-lg border border-forest-100 bg-forest-50/70 px-4 py-3 text-sm text-forest-950">
            <span className="font-medium">Scheme:</span> {selectionLabel}
            {selectedScheme && (
              <span className="ml-2 text-forest-800">({selectedScheme.ministry})</span>
            )}
            <button
              type="button"
              className="ml-3 text-forest-800 underline"
              onClick={() => setStep(1)}
            >
              Change
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="kpi-label">Project code</label>
              <input
                className="input mt-1"
                required
                placeholder={
                  selectedScheme?.code === "nhai_highway"
                    ? "NH44-PKG3"
                    : selectedScheme?.code === "nagar_van"
                      ? "ULB-PARKS-2026"
                      : "SCHEME-CODE"
                }
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <div>
              <label className="kpi-label">Project name</label>
              <input
                className="input mt-1"
                required
                placeholder="Planting project name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="kpi-label">Description</label>
            <textarea
              className="input mt-1 min-h-[80px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {templates.length > 0 && (
            <div>
              <label className="kpi-label">Planting standard template</label>
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

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="kpi-label">Target trees (optional)</label>
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
                value={surveyIntervalDays}
                onChange={(e) => setSurveyIntervalDays(Number(e.target.value) as 15 | 30)}
              >
                <option value={15}>Every 15 days</option>
                <option value={30}>Every 30 days</option>
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-stone-200">
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-stone-700"
              onClick={() => setShowAdvanced((open) => !open)}
            >
              Advanced: segment, program &amp; compliance
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showAdvanced && (
              <div className="space-y-4 border-t border-stone-200 px-4 py-4">
                <div>
                  <label className="kpi-label">Segment</label>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {SEGMENTS.map((s) => (
                      <button
                        key={s.code}
                        type="button"
                        className={`rounded-lg border p-3 text-left text-sm ${
                          segment === s.code
                            ? "border-forest-500 bg-forest-50"
                            : "border-stone-200 hover:border-stone-300"
                        }`}
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

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="kpi-label">Compliance mode</label>
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
                    <label className="kpi-label">Program</label>
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

          {error && <p className="text-sm text-rose-700">{error}</p>}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <button type="button" className="btn-secondary" onClick={() => setStep(1)}>
              Back
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
