"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { cmsAdmin, type RuleTemplateAdmin } from "@/lib/cms-api";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { COMPLIANCE_MODE_STYLES } from "@/lib/rule-template-fields";

const SEGMENTS = [
  { code: "general", label: "General plantation" },
  { code: "nhai_highway", label: "NHAI / Highway" },
  { code: "industrial_greenbelt", label: "Industrial / Mine green belt" },
  { code: "township_landscape", label: "Township / Society landscape" },
  { code: "nagar_van_urban", label: "Nagar Van / Urban forest" },
  { code: "sahakar_van_coop", label: "Sahakar Van / Cooperative" },
  { code: "ngo_watershed", label: "NGO / Watershed" },
];

export function CreateTemplateDialog({
  templates,
  onCreated,
}: {
  templates: RuleTemplateAdmin[];
  onCreated: (code: string) => void;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [segment, setSegment] = useState("general");
  const [complianceMode, setComplianceMode] = useState<"open" | "guided" | "strict">("guided");
  const [cloneFrom, setCloneFrom] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      cmsAdmin.createRuleTemplate({
        name: name.trim(),
        description: description.trim(),
        segment,
        compliance_mode: complianceMode,
        clone_from: cloneFrom || null,
      }),
    onSuccess: (tpl) => {
      qc.invalidateQueries({ queryKey: ["cms-rule-templates"] });
      setOpen(false);
      setName("");
      setDescription("");
      setSegment("general");
      setComplianceMode("guided");
      setCloneFrom("");
      setError(null);
      onCreated(tpl.template_code);
    },
    onError: (err) => setError(errorMessage(err)),
  });

  if (!open) {
    return (
      <button
        type="button"
        className="btn-primary w-full justify-center text-sm"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" />
        Create template
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm">
      <div
        className="card max-h-[90vh] w-full max-w-lg overflow-y-auto shadow-2xl"
        role="dialog"
        aria-labelledby="create-template-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id="create-template-title" className="text-lg font-semibold">
              Create planting template
            </h3>
            <p className="mt-1 text-sm text-stone-600">
              Define a new rule set for your organization. You can refine spacing, species, and
              compliance after creation.
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-1 text-stone-500 hover:bg-stone-100"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="kpi-label">Template name</label>
            <input
              className="input mt-1"
              placeholder="e.g. Acme CSR Greenbelt"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="kpi-label">Description</label>
            <textarea
              className="input mt-1 min-h-[72px]"
              placeholder="Who is this for and what does it enforce?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="kpi-label">Segment</label>
              <select className="input mt-1" value={segment} onChange={(e) => setSegment(e.target.value)}>
                {SEGMENTS.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="kpi-label">Compliance mode</label>
              <select
                className="input mt-1"
                value={complianceMode}
                onChange={(e) =>
                  setComplianceMode(e.target.value as "open" | "guided" | "strict")
                }
              >
                <option value="strict">Strict</option>
                <option value="guided">Guided</option>
                <option value="open">Open</option>
              </select>
              <span
                className={cn(
                  "mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                  COMPLIANCE_MODE_STYLES[complianceMode],
                )}
              >
                {complianceMode}
              </span>
            </div>
          </div>

          <div>
            <label className="kpi-label">Clone rules from (optional)</label>
            <select className="input mt-1" value={cloneFrom} onChange={(e) => setCloneFrom(e.target.value)}>
              <option value="">Start from Open BYOT defaults</option>
              {templates.map((t) => (
                <option key={t.template_code} value={t.template_code}>
                  {t.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-stone-500">
              Copies spacing, pit, species, and density rules as a starting point.
            </p>
          </div>

          {error && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-900">{error}</p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={name.trim().length < 3 || create.isPending}
            onClick={() => {
              setError(null);
              create.mutate();
            }}
          >
            {create.isPending ? "Creating…" : "Create template"}
          </button>
        </div>
      </div>
    </div>
  );
}
