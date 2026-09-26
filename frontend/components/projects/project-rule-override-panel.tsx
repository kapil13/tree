"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Gauge, Info, Save } from "lucide-react";
import { RuleFieldInput } from "@/components/platform/rule-engine/rule-field-input";
import { plantingProjects, type PlantingProject } from "@/lib/api";
import { errorMessage } from "@/lib/api";
import {
  buildEditableRules,
  COMPLIANCE_MODE_STYLES,
  fieldsForTemplate,
  getNestedValue,
  RULE_SECTION_META,
  sectionsForTemplate,
  setNestedValue,
  type RuleFieldSection,
} from "@/lib/rule-template-fields";
import { cn } from "@/lib/cn";

const MODE_HINTS: Record<PlantingProject["compliance_mode"], string> = {
  strict: "Blocks non-compliant tree registrations.",
  guided: "Warns but allows saving with acknowledgement.",
  open: "Advisory only — logs issues without blocking.",
};

function SectionPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors",
        active
          ? "bg-forest-600 text-white ring-forest-600"
          : "bg-stone-50 text-stone-600 ring-stone-200 hover:bg-stone-100",
      )}
    >
      {label}
    </button>
  );
}

export function ProjectRuleOverridePanel({ project }: { project: PlantingProject }) {
  const qc = useQueryClient();
  const [enabled, setEnabled] = useState(false);
  const [complianceMode, setComplianceMode] = useState(project.compliance_mode);
  const [publishNote, setPublishNote] = useState("");
  const [rules, setRules] = useState<Record<string, unknown>>({});
  const [baseRules, setBaseRules] = useState<Record<string, unknown>>({});
  const [templateCode, setTemplateCode] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<RuleFieldSection | "all">("all");
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    plantingProjects
      .getRuleOverride(project.id)
      .then((data) => {
        if (cancelled) return;
        const base = data.base_rules as Record<string, unknown>;
        setTemplateCode(data.template_code);
        setBaseRules(base);
        setEnabled(Boolean(data.override?.enabled));
        setComplianceMode(
          ((data.override?.compliance_mode as PlantingProject["compliance_mode"]) ||
            data.effective_compliance_mode ||
            project.compliance_mode) as PlantingProject["compliance_mode"],
        );
        setPublishNote((data.override?.publish_note as string) || "");
        const source =
          data.override?.enabled && Object.keys(data.override.rules ?? {}).length
            ? (data.override.rules as Record<string, unknown>)
            : base;
        setRules(buildEditableRules(base, source));
        setLoaded(true);
      })
      .catch((err) => {
        if (!cancelled) {
          setMessage({ type: "err", text: errorMessage(err) });
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [project.id, project.compliance_mode]);

  const sections = useMemo(() => sectionsForTemplate(baseRules), [baseRules]);
  const visibleSections = useMemo(
    () => (activeSection === "all" ? sections : sections.filter((s) => s === activeSection)),
    [activeSection, sections],
  );

  const save = useMutation({
    mutationFn: () =>
      plantingProjects.updateRuleOverride(project.id, {
        enabled,
        rules,
        compliance_mode: complianceMode,
        publish_note: publishNote || null,
      }),
    onSuccess: () => {
      setMessage({
        type: "ok",
        text: "Project rules saved. Field teams will see updated limits immediately.",
      });
      qc.invalidateQueries({ queryKey: ["planting-project", project.id] });
    },
    onError: (err) => setMessage({ type: "err", text: errorMessage(err) }),
  });

  if (!loaded) {
    return (
      <div className="card animate-pulse space-y-3 p-6">
        <div className="h-4 w-40 rounded bg-stone-200" />
        <div className="h-20 rounded bg-stone-100" />
      </div>
    );
  }

  const modeStyle = COMPLIANCE_MODE_STYLES[complianceMode];

  return (
    <div className="card space-y-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-100 text-forest-700">
          <Gauge className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-medium">Project rule override</h2>
          <p className="mt-1 text-xs leading-relaxed text-stone-600">
            Adjust compliance for this project only. Changes apply on top of the CMS template
            {templateCode ? ` (${templateCode})` : ""}.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-stone-200 bg-stone-50/80 px-3 py-2 text-[11px] text-stone-600 dark:border-stone-700 dark:bg-stone-900/50">
        <Info className="h-3.5 w-3.5 shrink-0 text-stone-400" />
        <span>
          <strong className="font-medium text-stone-700">Stack:</strong> Code defaults → CMS template →{" "}
          <span className="font-medium text-forest-700">this project</span>
        </span>
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-stone-200 px-4 py-3 text-sm transition-colors hover:bg-stone-50 dark:border-stone-700">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-stone-300"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        <span>
          <span className="font-medium">Enable project-specific rules</span>
          <span className="mt-0.5 block text-xs text-stone-500">
            When off, the CMS template rules apply unchanged.
          </span>
        </span>
      </label>

      <fieldset
        disabled={!enabled}
        className={cn("space-y-5 transition-opacity", !enabled && "pointer-events-none opacity-50")}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="kpi-label">Compliance mode</label>
            <select
              className="input mt-1"
              value={complianceMode}
              onChange={(e) =>
                setComplianceMode(e.target.value as PlantingProject["compliance_mode"])
              }
            >
              <option value="strict">Strict — block violations</option>
              <option value="guided">Guided — warn &amp; allow override</option>
              <option value="open">Open — advisory only</option>
            </select>
            <p className="mt-1.5 flex items-center gap-2 text-xs text-stone-500">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                  modeStyle,
                )}
              >
                {complianceMode}
              </span>
              {MODE_HINTS[complianceMode]}
            </p>
          </div>
        </div>

        {sections.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <SectionPill
              label="All"
              active={activeSection === "all"}
              onClick={() => setActiveSection("all")}
            />
            {sections.map((section) => (
              <SectionPill
                key={section}
                label={RULE_SECTION_META[section].title}
                active={activeSection === section}
                onClick={() => setActiveSection(section)}
              />
            ))}
          </div>
        )}

        {visibleSections.map((section) => (
          <section
            key={section}
            className="space-y-3 rounded-xl border border-stone-200/80 bg-stone-50/40 p-4"
          >
            <div>
              <h3 className="text-sm font-semibold text-stone-900">
                {RULE_SECTION_META[section].title}
              </h3>
              <p className="text-xs text-stone-500">{RULE_SECTION_META[section].description}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {fieldsForTemplate(baseRules)
                .filter((field) => field.section === section)
                .map((field) => (
                  <RuleFieldInput
                    key={field.path}
                    field={field}
                    value={getNestedValue(rules, field.path)}
                    defaultValue={getNestedValue(baseRules, field.path)}
                    onChange={(value) => setRules((current) => setNestedValue(current, field.path, value))}
                  />
                ))}
            </div>
          </section>
        ))}

        <div>
          <label className="kpi-label">Change note (optional)</label>
          <input
            className="input mt-1"
            value={publishNote}
            onChange={(e) => setPublishNote(e.target.value)}
            placeholder="e.g. Pilot site — relaxed spacing for rocky terrain"
          />
        </div>
      </fieldset>

      {message && (
        <p
          className={cn(
            "rounded-xl px-4 py-3 text-sm",
            message.type === "ok"
              ? "bg-emerald-50 text-emerald-900"
              : "bg-red-50 text-red-800",
          )}
        >
          {message.text}
        </p>
      )}

      <button
        type="button"
        className="btn-primary"
        disabled={save.isPending}
        onClick={() => {
          setMessage(null);
          save.mutate();
        }}
      >
        <Save className="h-4 w-4" />
        {save.isPending ? "Saving…" : "Save project rules"}
      </button>
    </div>
  );
}
