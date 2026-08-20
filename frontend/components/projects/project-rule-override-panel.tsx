"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Gauge, Info, Save } from "lucide-react";
import { plantingProjects, type PlantingProject } from "@/lib/api";
import { errorMessage } from "@/lib/api";
import { buildEditableRules, COMPLIANCE_MODE_STYLES } from "@/lib/rule-template-fields";
import { cn } from "@/lib/cn";

const MODE_HINTS: Record<PlantingProject["compliance_mode"], string> = {
  strict: "Blocks non-compliant tree registrations.",
  guided: "Warns but allows saving with acknowledgement.",
  open: "Advisory only — logs issues without blocking.",
};

export function ProjectRuleOverridePanel({ project }: { project: PlantingProject }) {
  const qc = useQueryClient();
  const [enabled, setEnabled] = useState(false);
  const [complianceMode, setComplianceMode] = useState(project.compliance_mode);
  const [publishNote, setPublishNote] = useState("");
  const [rules, setRules] = useState<Record<string, unknown>>({});
  const [templateCode, setTemplateCode] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    plantingProjects
      .getRuleOverride(project.id)
      .then((data) => {
        if (cancelled) return;
        setTemplateCode(data.template_code);
        setEnabled(Boolean(data.override?.enabled));
        setComplianceMode(
          ((data.override?.compliance_mode as PlantingProject["compliance_mode"]) ||
            data.effective_compliance_mode ||
            project.compliance_mode) as PlantingProject["compliance_mode"],
        );
        setPublishNote((data.override?.publish_note as string) || "");
        setRules(
          buildEditableRules(
            data.base_rules as Record<string, unknown>,
            (data.override?.rules as Record<string, unknown>) || data.base_rules,
          ),
        );
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

  const save = useMutation({
    mutationFn: () =>
      plantingProjects.updateRuleOverride(project.id, {
        enabled,
        rules,
        compliance_mode: complianceMode,
        publish_note: publishNote || null,
      }),
    onSuccess: () => {
      setMessage({ type: "ok", text: "Project rules saved. Field teams will see updated limits immediately." });
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
        className={cn("space-y-4 transition-opacity", !enabled && "pointer-events-none opacity-50")}
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
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", modeStyle)}>
                {complianceMode}
              </span>
              {MODE_HINTS[complianceMode]}
            </p>
          </div>
          <div>
            <label className="kpi-label">Native species min (%)</label>
            <input
              className="input mt-1"
              type="number"
              min={0}
              max={100}
              value={String(rules.species_native_pct_min ?? "")}
              onChange={(e) =>
                setRules((r) => ({
                  ...r,
                  species_native_pct_min: e.target.value ? Number(e.target.value) : null,
                }))
              }
            />
          </div>
          <div>
            <label className="kpi-label">Min spacing (m)</label>
            <input
              className="input mt-1"
              type="number"
              min={0}
              step={0.5}
              value={String((rules.spacing_m as { min?: number })?.min ?? "")}
              onChange={(e) =>
                setRules((r) => ({
                  ...r,
                  spacing_m: {
                    ...((r.spacing_m as object) || {}),
                    min: e.target.value ? Number(e.target.value) : null,
                  },
                }))
              }
            />
          </div>
          <div>
            <label className="kpi-label">Min photos per tree</label>
            <input
              className="input mt-1"
              type="number"
              min={0}
              max={10}
              value={String(rules.min_photos ?? "")}
              onChange={(e) =>
                setRules((r) => ({
                  ...r,
                  min_photos: e.target.value ? Number(e.target.value) : null,
                }))
              }
            />
          </div>
        </div>

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
