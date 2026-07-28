"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react";
import { errorMessage, plantingProjects, type ComplianceMode, type ProjectSegment } from "@/lib/api";
import {
  PROJECT_SCHEME_OPTIONS,
  projectSchemeByCode,
  type ProjectSchemeType,
} from "@/lib/government-plantation-categories";
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

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [schemeType, setSchemeType] = useState<ProjectSchemeType | null>(null);
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

  const selectedScheme = useMemo(() => projectSchemeByCode(schemeType), [schemeType]);

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

  function applyScheme(type: ProjectSchemeType) {
    const scheme = projectSchemeByCode(type);
    if (!scheme) return;
    setSchemeType(type);
    setSegment(scheme.segment);
    setProgramCode(scheme.programCode);
    setComplianceMode(scheme.complianceMode);
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
        standard_template_code: selectedTemplate?.code,
        target_tree_count: targetTrees ? Number(targetTrees) : undefined,
        metadata: {
          survey_interval_days: surveyIntervalDays,
          ...(selectedScheme?.plantationCategory
            ? { plantation_category: selectedScheme.plantationCategory }
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

  const governmentSchemes = PROJECT_SCHEME_OPTIONS.filter((item) => item.group === "government");
  const otherSchemes = PROJECT_SCHEME_OPTIONS.filter((item) => item.group === "other");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/projects" className="text-sm text-forest-700 hover:underline">
          ← All projects
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">New planting project</h1>
        <p className="mt-1 text-sm text-stone-600">
          {step === 1
            ? "Start by choosing the plantation scheme that matches your work."
            : "Add project details, then draw work areas on the map."}
        </p>
      </div>

      {step === 1 ? (
        <div className="card space-y-6">
          <div>
            <p className="kpi-label">Government &amp; public sector</p>
            <div className="mt-3 grid gap-2">
              {governmentSchemes.map((scheme) => (
                <button
                  key={scheme.code}
                  type="button"
                  className={cn(
                    "rounded-lg border p-3 text-left text-sm transition",
                    schemeType === scheme.code
                      ? "border-blue-500 bg-blue-50"
                      : "border-stone-200 hover:border-stone-300",
                  )}
                  onClick={() => applyScheme(scheme.code)}
                >
                  <div className="font-medium">{scheme.label}</div>
                  <div className="text-xs text-stone-500">{scheme.hint}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="kpi-label">Industry, NGO &amp; flexible schemes</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {otherSchemes.map((scheme) => (
                <button
                  key={scheme.code}
                  type="button"
                  className={cn(
                    "rounded-lg border p-3 text-left text-sm transition",
                    schemeType === scheme.code
                      ? "border-forest-500 bg-forest-50"
                      : "border-stone-200 hover:border-stone-300",
                  )}
                  onClick={() => applyScheme(scheme.code)}
                >
                  <div className="font-medium">{scheme.label}</div>
                  <div className="text-xs text-stone-500">{scheme.hint}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end border-t border-stone-200 pt-4">
            <button
              type="button"
              className="btn-primary"
              disabled={!schemeType}
              onClick={() => setStep(2)}
            >
              Continue to project details
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="card space-y-5">
          {selectedScheme && (
            <div className="rounded-lg border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-blue-950">
              <span className="font-medium">Scheme type:</span> {selectedScheme.label}
              <button
                type="button"
                className="ml-3 text-blue-800 underline"
                onClick={() => setStep(1)}
              >
                Change
              </button>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="kpi-label">Project code</label>
              <input
                className="input mt-1"
                required
                placeholder={
                  selectedScheme?.plantationCategory === "highway"
                    ? "NH44-PKG3"
                    : selectedScheme?.plantationCategory === "municipal"
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
                placeholder={
                  selectedScheme?.plantationCategory === "highway"
                    ? "NH-44 Package 3 plantation"
                    : selectedScheme?.plantationCategory === "municipal"
                      ? "Municipal avenue greening"
                      : "Planting project name"
                }
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
                          if (s.code === "nhai_highway") {
                            setProgramCode("government_nhai");
                            setComplianceMode("strict");
                          } else if (s.code === "industrial_greenbelt") {
                            setProgramCode("corporate_esg");
                            setComplianceMode("strict");
                          } else if (s.code === "ngo_watershed") {
                            setProgramCode("ngo_community");
                            setComplianceMode("guided");
                          }
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
