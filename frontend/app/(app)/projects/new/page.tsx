"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { errorMessage, plantingProjects, type ComplianceMode, type ProjectSegment } from "@/lib/api";

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
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [segment, setSegment] = useState<ProjectSegment>("nhai_highway");
  const [complianceMode, setComplianceMode] = useState<ComplianceMode>("strict");
  const [programCode, setProgramCode] = useState("government_nhai");
  const [targetTrees, setTargetTrees] = useState("");
  const [templateCode, setTemplateCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          permit_reference: "",
        },
      });
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/projects" className="text-sm text-forest-700 hover:underline">
          ← All projects
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">New planting project</h1>
        <p className="mt-1 text-sm text-stone-600">
          Choose a segment template. You will draw work areas on the map next.
        </p>
      </div>

      <form onSubmit={submit} className="card space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="kpi-label">Project code</label>
            <input
              className="input mt-1"
              required
              placeholder="NH44-PKG3"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div>
            <label className="kpi-label">Project name</label>
            <input
              className="input mt-1"
              required
              placeholder="NH-44 Package 3 plantation"
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
              <option value="government_nhai">Government / NHAI</option>
              <option value="corporate_esg">Corporate ESG</option>
              <option value="ngo_community">NGO / Community</option>
              <option value="byot">BYOT</option>
            </select>
          </div>
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
        </div>

        {error && <p className="text-sm text-rose-700">{error}</p>}

        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Creating…" : "Create project & draw areas"}
        </button>
      </form>
    </div>
  );
}
