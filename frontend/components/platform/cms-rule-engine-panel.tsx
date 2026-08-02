"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CheckCircle2,
  Factory,
  Gauge,
  Leaf,
  MapPin,
  RotateCcw,
  Route,
  Save,
  Search,
  Sprout,
  Trees,
  Users,
} from "lucide-react";
import { cmsAdmin, type RuleTemplateAdmin } from "@/lib/cms-api";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import {
  buildEditableRules,
  COMPLIANCE_MODE_STYLES,
  diffOverrideKeys,
  fieldsForTemplate,
  getNestedValue,
  LAYOUT_PATTERN_OPTIONS,
  RULE_SECTION_META,
  sectionsForTemplate,
  setNestedValue,
  speciesListToText,
  textToSpeciesList,
  type RuleFieldDef,
  type RuleFieldSection,
} from "@/lib/rule-template-fields";

const TEMPLATE_ICONS: Record<string, typeof Leaf> = {
  nhai_highway_v1: Route,
  industrial_greenbelt_v1: Factory,
  township_landscape_v1: Building2,
  nagar_van_urban_forest_v1: Trees,
  sahakar_van_cooperative_v1: Users,
  ngo_watershed_v1: Sprout,
  open_byot_v1: Leaf,
};

function compliancePill(mode: string) {
  return COMPLIANCE_MODE_STYLES[mode] ?? COMPLIANCE_MODE_STYLES.open;
}

export function CmsRuleEnginePanel() {
  const qc = useQueryClient();
  const { data: templates, isLoading } = useQuery({
    queryKey: ["cms-rule-templates"],
    queryFn: () => cmsAdmin.listRuleTemplates(),
  });

  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [rules, setRules] = useState<Record<string, unknown>>({});
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [activeSection, setActiveSection] = useState<RuleFieldSection | "all">("all");

  const filtered = useMemo(() => {
    if (!templates) return [];
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.template_code.toLowerCase().includes(q) ||
        t.segment_label.toLowerCase().includes(q),
    );
  }, [templates, search]);

  const selected = useMemo(
    () => templates?.find((t) => t.template_code === selectedCode) ?? filtered[0] ?? null,
    [templates, selectedCode, filtered],
  );

  useEffect(() => {
    if (!selected) return;
    setEnabled(selected.override.enabled);
    const source =
      selected.override.enabled && Object.keys(selected.override.rules).length > 0
        ? { ...selected.code_defaults, ...selected.override.rules }
        : selected.code_defaults;
    setRules(buildEditableRules(selected.code_defaults, source));
    setActiveSection("all");
    setMessage(null);
  }, [selected]);

  const changedKeys = useMemo(
    () => (selected ? diffOverrideKeys(selected.code_defaults, rules) : []),
    [selected, rules],
  );

  const save = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("No template selected");
      return cmsAdmin.updateRuleTemplate(selected.template_code, { enabled, rules });
    },
    onSuccess: () => {
      setMessage({
        type: "ok",
        text: "Rules published. All projects using this template now enforce the updated thresholds.",
      });
      qc.invalidateQueries({ queryKey: ["cms-rule-templates"] });
    },
    onError: (err) => setMessage({ type: "err", text: errorMessage(err) }),
  });

  function resetToDefaults() {
    if (!selected) return;
    setRules(buildEditableRules(selected.code_defaults, selected.code_defaults));
    setEnabled(true);
    setMessage({ type: "ok", text: "Reset to code defaults — click Publish to save." });
  }

  if (isLoading || !templates?.length) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 dark:border-stone-700 dark:bg-stone-900/30">
        <p className="text-sm text-stone-500">Loading rule engine…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-2xl border border-forest-200/70 bg-gradient-to-br from-forest-600 via-forest-700 to-emerald-900 p-6 text-white shadow-lg dark:border-forest-900/50">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
              <Gauge className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Planting rule engine</h2>
              <p className="mt-1 max-w-2xl text-sm text-forest-100/90">
                Configure compliance thresholds for every planting template. Changes apply live to
                tree registration, spacing checks, species policy, and MRV exports.
              </p>
            </div>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-3 text-sm ring-1 ring-white/20 backdrop-blur">
            <p className="font-medium">{templates.length} templates</p>
            <p className="text-forest-100/80">
              {templates.filter((t) => t.has_custom_rules).length} customized
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(240px,280px)_1fr]">
        <aside className="card flex flex-col gap-3 p-0 overflow-hidden">
          <div className="border-b border-stone-100 p-4 dark:border-stone-800">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                className="input w-full pl-9"
                placeholder="Search templates…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </div>
          <ul className="max-h-[520px] overflow-y-auto p-2">
            {filtered.map((tpl) => {
              const Icon = TEMPLATE_ICONS[tpl.template_code] ?? Leaf;
              const active = selected?.template_code === tpl.template_code;
              return (
                <li key={tpl.template_code}>
                  <button
                    type="button"
                    onClick={() => setSelectedCode(tpl.template_code)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                      active
                        ? "bg-forest-50 ring-1 ring-forest-200 dark:bg-forest-950/40 dark:ring-forest-800"
                        : "hover:bg-stone-50 dark:hover:bg-stone-800/50",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                        active
                          ? "bg-forest-600 text-white"
                          : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-stone-900 dark:text-stone-50">
                          {tpl.name}
                        </span>
                        {tpl.has_custom_rules && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" title="Custom rules" />
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-stone-500">
                        {tpl.segment_label}
                      </span>
                      <span
                        className={cn(
                          "mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1",
                          compliancePill(tpl.compliance_mode),
                        )}
                      >
                        {tpl.compliance_mode}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {selected ? (
          <RuleTemplateEditor
            template={selected}
            enabled={enabled}
            rules={rules}
            changedKeys={changedKeys}
            activeSection={activeSection}
            message={message}
            isSaving={save.isPending}
            onEnabledChange={setEnabled}
            onRulesChange={setRules}
            onSectionChange={setActiveSection}
            onSave={() => {
              setMessage(null);
              save.mutate();
            }}
            onReset={resetToDefaults}
          />
        ) : (
          <div className="card flex min-h-[320px] items-center justify-center text-sm text-stone-500">
            Select a template to edit rules.
          </div>
        )}
      </div>
    </div>
  );
}

function RuleTemplateEditor({
  template,
  enabled,
  rules,
  changedKeys,
  activeSection,
  message,
  isSaving,
  onEnabledChange,
  onRulesChange,
  onSectionChange,
  onSave,
  onReset,
}: {
  template: RuleTemplateAdmin;
  enabled: boolean;
  rules: Record<string, unknown>;
  changedKeys: string[];
  activeSection: RuleFieldSection | "all";
  message: { type: "ok" | "err"; text: string } | null;
  isSaving: boolean;
  onEnabledChange: (v: boolean) => void;
  onRulesChange: (r: Record<string, unknown>) => void;
  onSectionChange: (s: RuleFieldSection | "all") => void;
  onSave: () => void;
  onReset: () => void;
}) {
  const sections = sectionsForTemplate(template.code_defaults);
  const visibleSections = activeSection === "all" ? sections : sections.filter((s) => s === activeSection);

  function updateField(path: string, value: unknown) {
    onRulesChange(setNestedValue(rules, path, value));
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-50">{template.name}</h3>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{template.description}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-stone-100 px-2.5 py-1 font-mono text-stone-700 ring-1 ring-stone-200 dark:bg-stone-800 dark:text-stone-200">
                {template.template_code}
              </span>
              <span className="rounded-full bg-stone-100 px-2.5 py-1 text-stone-700 ring-1 ring-stone-200 dark:bg-stone-800 dark:text-stone-200">
                {template.segment_label}
              </span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 font-semibold uppercase tracking-wide ring-1",
                  compliancePill(template.compliance_mode),
                )}
              >
                {template.compliance_mode}
              </span>
              {changedKeys.length > 0 && (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-900 ring-1 ring-amber-200">
                  {changedKeys.length} unsaved change{changedKeys.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm dark:border-stone-700 dark:bg-stone-800/50">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-stone-300 text-forest-600 focus:ring-forest-500"
              checked={enabled}
              onChange={(e) => onEnabledChange(e.target.checked)}
            />
            <span>
              <span className="font-medium text-stone-900 dark:text-stone-100">CMS override active</span>
              <span className="mt-0.5 block text-xs text-stone-500">
                When off, code defaults apply
              </span>
            </span>
          </label>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-stone-100 pt-4 dark:border-stone-800">
          <SectionTab label="All sections" active={activeSection === "all"} onClick={() => onSectionChange("all")} />
          {sections.map((section) => (
            <SectionTab
              key={section}
              label={RULE_SECTION_META[section].title}
              active={activeSection === section}
              onClick={() => onSectionChange(section)}
            />
          ))}
        </div>
      </div>

      {visibleSections.map((section) => (
        <section key={section} className="card space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-50">
              {RULE_SECTION_META[section].title}
            </h4>
            <p className="text-xs text-stone-500">{RULE_SECTION_META[section].description}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {fieldsForTemplate(template.code_defaults)
              .filter((f) => f.section === section)
              .map((field) => (
                <RuleFieldInput
                  key={field.path}
                  field={field}
                  value={getNestedValue(rules, field.path)}
                  defaultValue={getNestedValue(template.code_defaults, field.path)}
                  onChange={(v) => updateField(field.path, v)}
                />
              ))}
          </div>
        </section>
      ))}

      {message && (
        <p
          className={cn(
            "rounded-xl px-4 py-3 text-sm",
            message.type === "ok"
              ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200"
              : "bg-rose-50 text-rose-900 ring-1 ring-rose-200",
          )}
        >
          {message.text}
        </p>
      )}

      <div className="sticky bottom-2 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200/80 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-stone-700 dark:bg-stone-900/95">
        <p className="flex items-center gap-2 text-xs text-stone-500">
          <MapPin className="h-3.5 w-3.5" />
          Live compliance — projects using this template update immediately
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={onReset}>
            <RotateCcw className="h-4 w-4" />
            Reset defaults
          </button>
          <button type="button" className="btn-primary" disabled={isSaving} onClick={onSave}>
            <Save className="h-4 w-4" />
            {isSaving ? "Publishing…" : "Publish rules"}
          </button>
        </div>
      </div>

      <details className="card group">
        <summary className="cursor-pointer text-sm font-medium text-stone-700 marker:content-none dark:text-stone-300">
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-stone-400" />
            Effective rules preview (JSON)
          </span>
        </summary>
        <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-stone-50 p-4 text-xs text-stone-700 dark:bg-stone-950 dark:text-stone-300">
          {JSON.stringify(template.effective_rules, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function SectionTab({
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
        "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-forest-600 text-white shadow-sm"
          : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300",
      )}
    >
      {label}
    </button>
  );
}

function RuleFieldInput({
  field,
  value,
  defaultValue,
  onChange,
}: {
  field: RuleFieldDef;
  value: unknown;
  defaultValue: unknown;
  onChange: (value: unknown) => void;
}) {
  const changed = JSON.stringify(value ?? null) !== JSON.stringify(defaultValue ?? null);

  if (field.type === "boolean") {
    return (
      <label
        className={cn(
          "flex items-start gap-3 rounded-xl border p-3 text-sm transition-colors",
          changed
            ? "border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20"
            : "border-stone-200 bg-stone-50/50 dark:border-stone-700 dark:bg-stone-800/30",
        )}
      >
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-stone-300"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>
          <span className="font-medium text-stone-800 dark:text-stone-100">{field.label}</span>
          {field.hint && <span className="mt-0.5 block text-xs text-stone-500">{field.hint}</span>}
        </span>
      </label>
    );
  }

  if (field.type === "layout_select") {
    return (
      <FieldShell field={field} changed={changed}>
        <select
          className="input mt-1"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        >
          {LAYOUT_PATTERN_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FieldShell>
    );
  }

  if (field.type === "species_list") {
    return (
      <FieldShell field={field} changed={changed} className="sm:col-span-2 xl:col-span-3">
        <textarea
          className="input mt-1 min-h-[120px] font-mono text-xs"
          value={speciesListToText(value)}
          onChange={(e) => onChange(textToSpeciesList(e.target.value))}
          placeholder="Neem&#10;Peepal&#10;Jamun"
        />
      </FieldShell>
    );
  }

  return (
    <FieldShell field={field} changed={changed}>
      <div className="relative mt-1">
        <input
          className="input w-full pr-12"
          type="number"
          min={field.min}
          max={field.max}
          step={field.step ?? (field.path.includes("pct") ? 1 : 0.1)}
          value={value === null || value === undefined ? "" : String(value)}
          onChange={(e) => {
            const raw = e.target.value;
            onChange(raw === "" ? null : Number(raw));
          }}
        />
        {field.unit && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">
            {field.unit}
          </span>
        )}
      </div>
      {defaultValue != null && changed && (
        <p className="mt-1 text-[10px] text-stone-400">Default: {String(defaultValue)}</p>
      )}
    </FieldShell>
  );
}

function FieldShell({
  field,
  changed,
  className,
  children,
}: {
  field: RuleFieldDef;
  changed: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        changed
          ? "border-amber-200 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20"
          : "border-stone-200/80 bg-white dark:border-stone-700 dark:bg-stone-900/40",
        className,
      )}
    >
      <label className="kpi-label flex items-center gap-2">
        {field.label}
        {changed && (
          <span className="rounded bg-amber-200/80 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-900">
            edited
          </span>
        )}
      </label>
      {field.hint && <p className="mt-0.5 text-[11px] text-stone-500">{field.hint}</p>}
      {children}
    </div>
  );
}
