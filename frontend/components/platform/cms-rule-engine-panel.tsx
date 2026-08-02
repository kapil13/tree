"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Gauge, Leaf, RotateCcw, Save } from "lucide-react";
import { cmsAdmin, type RuleTemplateAdmin } from "@/lib/cms-api";
import { errorMessage } from "@/lib/api";

type NagarVanRules = {
  spacing_min: string;
  spacing_warn: string;
  pit_length: string;
  pit_width: string;
  pit_depth: string;
  max_gps_accuracy_m: string;
  min_photos: string;
  species_native_pct_min: string;
  density_min: string;
  density_max: string;
  min_trees_project: string;
  guard_type_required: boolean;
  require_pit_photo: boolean;
};

function rulesToForm(rules: Record<string, unknown>): NagarVanRules {
  const spacing = (rules.spacing_m ?? {}) as { min?: number; warn_below?: number };
  const pit = (rules.pit_size_cm ?? {}) as { length?: number; width?: number; depth?: number };
  const density = (rules.planting_density_per_ha ?? {}) as { min?: number; max?: number };
  return {
    spacing_min: spacing.min != null ? String(spacing.min) : "",
    spacing_warn: spacing.warn_below != null ? String(spacing.warn_below) : "",
    pit_length: pit.length != null ? String(pit.length) : "",
    pit_width: pit.width != null ? String(pit.width) : "",
    pit_depth: pit.depth != null ? String(pit.depth) : "",
    max_gps_accuracy_m: rules.max_gps_accuracy_m != null ? String(rules.max_gps_accuracy_m) : "",
    min_photos: rules.min_photos != null ? String(rules.min_photos) : "",
    species_native_pct_min:
      rules.species_native_pct_min != null ? String(rules.species_native_pct_min) : "",
    density_min: density.min != null ? String(density.min) : "",
    density_max: density.max != null ? String(density.max) : "",
    min_trees_project: rules.min_trees_project != null ? String(rules.min_trees_project) : "",
    guard_type_required: Boolean(rules.guard_type_required),
    require_pit_photo: Boolean(rules.require_pit_photo),
  };
}

function formToRules(form: NagarVanRules): Record<string, unknown> {
  return {
    spacing_m: {
      min: Number(form.spacing_min),
      warn_below: Number(form.spacing_warn),
    },
    pit_size_cm: {
      length: Number(form.pit_length),
      width: Number(form.pit_width),
      depth: Number(form.pit_depth),
    },
    max_gps_accuracy_m: Number(form.max_gps_accuracy_m),
    min_photos: Number(form.min_photos),
    species_native_pct_min: Number(form.species_native_pct_min),
    planting_density_per_ha: {
      min: Number(form.density_min),
      max: Number(form.density_max),
    },
    min_trees_project: Number(form.min_trees_project),
    guard_type_required: form.guard_type_required,
    require_pit_photo: form.require_pit_photo,
    layout_pattern: "cluster",
  };
}

export function CmsRuleEnginePanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["cms-rule-templates"],
    queryFn: () => cmsAdmin.listRuleTemplates(),
  });

  const template = data?.[0] ?? null;
  const [enabled, setEnabled] = useState(true);
  const [form, setForm] = useState<NagarVanRules | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!template) return;
    setEnabled(template.override.enabled);
    const source =
      template.override.enabled && Object.keys(template.override.rules).length > 0
        ? template.override.rules
        : template.code_defaults;
    setForm(rulesToForm(source));
  }, [template]);

  const save = useMutation({
    mutationFn: () => {
      if (!template || !form) throw new Error("No template loaded");
      return cmsAdmin.updateRuleTemplate(template.template_code, {
        enabled,
        rules: formToRules(form),
      });
    },
    onSuccess: () => {
      setMessage("Rule template saved. Compliance checks use these values immediately.");
      qc.invalidateQueries({ queryKey: ["cms-rule-templates"] });
    },
    onError: (err) => setMessage(errorMessage(err)),
  });

  function resetToDefaults() {
    if (!template) return;
    setForm(rulesToForm(template.code_defaults));
    setEnabled(true);
    setMessage("Form reset to code defaults — click Save to publish.");
  }

  if (isLoading || !template || !form) {
    return <p className="text-sm text-stone-500">Loading rule engine…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-forest-200/80 bg-gradient-to-br from-forest-50/60 to-white p-5 dark:border-forest-900/40 dark:from-forest-950/30 dark:to-stone-900">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-forest-600 text-white">
            <Gauge className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">
              Planting rule engine
            </h2>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
              Edit compliance rules for <strong>{template.name}</strong>. Changes apply live to all
              projects using this template — tree registration, spacing checks, and native-species
              targets read from here instead of hard-coded defaults.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white px-2.5 py-1 font-medium text-stone-700 ring-1 ring-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:ring-stone-700">
                {template.template_code}
              </span>
              <span className="rounded-full bg-white px-2.5 py-1 font-medium capitalize text-stone-700 ring-1 ring-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:ring-stone-700">
                {template.compliance_mode} mode
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-forest-100 px-2.5 py-1 font-medium text-forest-800 ring-1 ring-forest-200">
                <Leaf className="h-3 w-3" />
                Nagar Van pilot
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="card space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-medium">Rule overrides</h3>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="rounded border-stone-300"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            Use CMS rules (when off, code defaults apply)
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Min spacing (m)"
            value={form.spacing_min}
            onChange={(v) => setForm({ ...form, spacing_min: v })}
          />
          <Field
            label="Spacing warn below (m)"
            value={form.spacing_warn}
            onChange={(v) => setForm({ ...form, spacing_warn: v })}
          />
          <Field
            label="Max GPS accuracy (m)"
            value={form.max_gps_accuracy_m}
            onChange={(v) => setForm({ ...form, max_gps_accuracy_m: v })}
          />
          <Field
            label="Pit length (cm)"
            value={form.pit_length}
            onChange={(v) => setForm({ ...form, pit_length: v })}
          />
          <Field
            label="Pit width (cm)"
            value={form.pit_width}
            onChange={(v) => setForm({ ...form, pit_width: v })}
          />
          <Field
            label="Pit depth (cm)"
            value={form.pit_depth}
            onChange={(v) => setForm({ ...form, pit_depth: v })}
          />
          <Field
            label="Min photos"
            value={form.min_photos}
            onChange={(v) => setForm({ ...form, min_photos: v })}
          />
          <Field
            label="Native species min (%)"
            value={form.species_native_pct_min}
            onChange={(v) => setForm({ ...form, species_native_pct_min: v })}
          />
          <Field
            label="Density min (trees/ha)"
            value={form.density_min}
            onChange={(v) => setForm({ ...form, density_min: v })}
          />
          <Field
            label="Density max (trees/ha)"
            value={form.density_max}
            onChange={(v) => setForm({ ...form, density_max: v })}
          />
          <Field
            label="Min trees per project"
            value={form.min_trees_project}
            onChange={(v) => setForm({ ...form, min_trees_project: v })}
          />
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.guard_type_required}
              onChange={(e) => setForm({ ...form, guard_type_required: e.target.checked })}
            />
            Tree guard required
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.require_pit_photo}
              onChange={(e) => setForm({ ...form, require_pit_photo: e.target.checked })}
            />
            Pit photo required
          </label>
        </div>

        {message && (
          <p
            className={`rounded-lg px-4 py-3 text-sm ${
              message.includes("saved") || message.includes("Saved")
                ? "bg-emerald-50 text-emerald-800"
                : "bg-rose-50 text-rose-800"
            }`}
          >
            {message}
          </p>
        )}

        <div className="flex flex-wrap gap-3 border-t border-stone-100 pt-4 dark:border-stone-800">
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
            {save.isPending ? "Saving…" : "Save rules"}
          </button>
          <button type="button" className="btn-secondary" onClick={resetToDefaults}>
            <RotateCcw className="h-4 w-4" />
            Reset to code defaults
          </button>
        </div>
      </div>

      <div className="card space-y-2 text-xs text-stone-600 dark:text-stone-400">
        <p className="font-medium text-stone-800 dark:text-stone-200">Effective rules preview</p>
        <pre className="max-h-48 overflow-auto rounded-lg bg-stone-50 p-3 dark:bg-stone-950">
          {JSON.stringify(template.effective_rules, null, 2)}
        </pre>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="kpi-label">{label}</label>
      <input className="input mt-1" type="number" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
