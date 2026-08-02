"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Factory,
  Leaf,
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
  RULE_SECTION_META,
  sectionsForTemplate,
  setNestedValue,
  type RuleFieldSection,
} from "@/lib/rule-template-fields";
import { RuleFieldInput } from "./rule-field-input";

const TEMPLATE_ICONS: Record<string, typeof Leaf> = {
  nhai_highway_v1: Route,
  industrial_greenbelt_v1: Factory,
  township_landscape_v1: Building2,
  nagar_van_urban_forest_v1: Trees,
  sahakar_van_cooperative_v1: Users,
  ngo_watershed_v1: Sprout,
  open_byot_v1: Leaf,
};

export function TemplatesTab({
  jumpTemplateCode,
  onJumpConsumed,
}: {
  jumpTemplateCode: string | null;
  onJumpConsumed: () => void;
}) {
  const qc = useQueryClient();
  const { data: templates, isLoading } = useQuery({
    queryKey: ["cms-rule-templates"],
    queryFn: () => cmsAdmin.listRuleTemplates(),
  });

  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [complianceMode, setComplianceMode] = useState<string>("strict");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [publishNote, setPublishNote] = useState("");
  const [rules, setRules] = useState<Record<string, unknown>>({});
  const [activeSection, setActiveSection] = useState<RuleFieldSection | "all">("all");
  const [showJson, setShowJson] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

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

  const selected = useMemo(() => {
    if (jumpTemplateCode) return templates?.find((t) => t.template_code === jumpTemplateCode) ?? null;
    return templates?.find((t) => t.template_code === selectedCode) ?? filtered[0] ?? null;
  }, [templates, selectedCode, filtered, jumpTemplateCode]);

  useEffect(() => {
    if (jumpTemplateCode) {
      setSelectedCode(jumpTemplateCode);
      onJumpConsumed();
    }
  }, [jumpTemplateCode, onJumpConsumed]);

  useEffect(() => {
    if (!selected) return;
    setEnabled(selected.override.enabled);
    setComplianceMode(selected.compliance_mode);
    setEffectiveFrom(selected.override.effective_from?.slice(0, 16) ?? "");
    setPublishNote(selected.override.publish_note ?? "");
    const source =
      selected.override.enabled && Object.keys(selected.override.rules).length > 0
        ? { ...selected.code_defaults, ...selected.override.rules }
        : selected.code_defaults;
    const built = buildEditableRules(selected.code_defaults, source);
    setRules(built);
    setJsonText(JSON.stringify(built, null, 2));
    setActiveSection("all");
    setMessage(null);
  }, [selected]);

  const changedKeys = useMemo(
    () => (selected ? diffOverrideKeys(selected.code_defaults, rules) : []),
    [selected, rules],
  );

  const save = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("No template");
      const payloadRules = showJson ? (JSON.parse(jsonText) as Record<string, unknown>) : rules;
      return cmsAdmin.updateRuleTemplate(selected.template_code, {
        enabled,
        rules: payloadRules,
        compliance_mode: complianceMode,
        effective_from: effectiveFrom ? new Date(effectiveFrom).toISOString() : null,
        publish_note: publishNote || null,
      });
    },
    onSuccess: () => {
      setMessage({ type: "ok", text: "Published successfully. Rules are live for all projects." });
      qc.invalidateQueries({ queryKey: ["cms-rule-templates"] });
      qc.invalidateQueries({ queryKey: ["cms-rule-versions"] });
    },
    onError: (err) => setMessage({ type: "err", text: errorMessage(err) }),
  });

  if (isLoading || !templates?.length) {
    return <LoadingCard label="Loading templates…" />;
  }

  const sections = selected ? sectionsForTemplate(selected.code_defaults) : [];
  const visibleSections =
    activeSection === "all" ? sections : sections.filter((s) => s === activeSection);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(250px,280px)_1fr]">
      <aside className="card flex flex-col overflow-hidden p-0">
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
        <ul className="max-h-[540px] overflow-y-auto p-2">
          {filtered.map((tpl) => (
            <TemplateListItem
              key={tpl.template_code}
              tpl={tpl}
              active={selected?.template_code === tpl.template_code}
              onSelect={() => setSelectedCode(tpl.template_code)}
            />
          ))}
        </ul>
      </aside>

      {!selected ? (
        <LoadingCard label="Select a template" />
      ) : (
        <div className="space-y-4">
          <div className="card space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">{selected.name}</h3>
                <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
                  {selected.description}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <Badge>{selected.template_code}</Badge>
                  <Badge>{selected.segment_label}</Badge>
                  {changedKeys.length > 0 && (
                    <Badge tone="warn">{changedKeys.length} unsaved</Badge>
                  )}
                </div>
              </div>
              <label className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800/50">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                CMS override on
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="kpi-label">Compliance mode</label>
                <select
                  className="input mt-1"
                  value={complianceMode}
                  onChange={(e) => setComplianceMode(e.target.value)}
                >
                  <option value="strict">Strict — block violations</option>
                  <option value="guided">Guided — warn only</option>
                  <option value="open">Open — no boundary checks</option>
                </select>
              </div>
              <div>
                <label className="kpi-label">Effective from (optional)</label>
                <input
                  type="datetime-local"
                  className="input mt-1"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                />
              </div>
              <div className="sm:col-span-1">
                <label className="kpi-label">Publish note</label>
                <input
                  className="input mt-1"
                  placeholder="e.g. Updated native % for Q2 audit"
                  value={publishNote}
                  onChange={(e) => setPublishNote(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <SectionPill label="All" active={activeSection === "all"} onClick={() => setActiveSection("all")} />
              {sections.map((s) => (
                <SectionPill
                  key={s}
                  label={RULE_SECTION_META[s].title}
                  active={activeSection === s}
                  onClick={() => setActiveSection(s)}
                />
              ))}
              <button
                type="button"
                className={cn("btn-ghost text-xs", showJson && "bg-stone-200 dark:bg-stone-700")}
                onClick={() => setShowJson((v) => !v)}
              >
                {showJson ? "Form view" : "JSON view"}
              </button>
            </div>
          </div>

          {showJson ? (
            <div className="card">
              <label className="kpi-label">Rules JSON</label>
              <textarea
                className="input mt-2 min-h-[320px] font-mono text-xs"
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
              />
            </div>
          ) : (
            visibleSections.map((section) => (
              <section key={section} className="card space-y-3">
                <div>
                  <h4 className="text-sm font-semibold">{RULE_SECTION_META[section].title}</h4>
                  <p className="text-xs text-stone-500">{RULE_SECTION_META[section].description}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {fieldsForTemplate(selected.code_defaults)
                    .filter((f) => f.section === section)
                    .map((field) => (
                      <RuleFieldInput
                        key={field.path}
                        field={field}
                        value={getNestedValue(rules, field.path)}
                        defaultValue={getNestedValue(selected.code_defaults, field.path)}
                        onChange={(v) => setRules((r) => setNestedValue(r, field.path, v))}
                      />
                    ))}
                </div>
              </section>
            ))
          )}

          {message && (
            <p
              className={cn(
                "rounded-xl px-4 py-3 text-sm",
                message.type === "ok" ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900",
              )}
            >
              {message.text}
            </p>
          )}

          <div className="sticky bottom-2 z-10 flex flex-wrap justify-end gap-2 rounded-2xl border bg-white/95 p-4 shadow-lg backdrop-blur dark:bg-stone-900/95">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                if (!selected) return;
                const built = buildEditableRules(selected.code_defaults, selected.code_defaults);
                setRules(built);
                setJsonText(JSON.stringify(built, null, 2));
                setComplianceMode(selected.code_compliance_mode || selected.compliance_mode);
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
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
              {save.isPending ? "Publishing…" : "Publish rules"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateListItem({
  tpl,
  active,
  onSelect,
}: {
  tpl: RuleTemplateAdmin;
  active: boolean;
  onSelect: () => void;
}) {
  const Icon = TEMPLATE_ICONS[tpl.template_code] ?? Leaf;
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors",
          active ? "bg-forest-50 ring-1 ring-forest-200 dark:bg-forest-950/40" : "hover:bg-stone-50",
        )}
      >
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            active ? "bg-forest-600 text-white" : "bg-stone-100 text-stone-600",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{tpl.name}</span>
            {tpl.has_custom_rules && <span className="h-2 w-2 rounded-full bg-amber-500" />}
          </span>
          <span className="mt-0.5 block truncate text-xs text-stone-500">{tpl.segment_label}</span>
          <span
            className={cn(
              "mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1",
              COMPLIANCE_MODE_STYLES[tpl.compliance_mode] ?? COMPLIANCE_MODE_STYLES.open,
            )}
          >
            {tpl.compliance_mode}
          </span>
        </span>
      </button>
    </li>
  );
}

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
        "rounded-full px-3 py-1 text-xs font-medium",
        active ? "bg-forest-600 text-white" : "bg-stone-100 text-stone-600",
      )}
    >
      {label}
    </button>
  );
}

function Badge({ children, tone }: { children: ReactNode; tone?: "warn" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 font-mono text-[10px] ring-1",
        tone === "warn"
          ? "bg-amber-50 text-amber-900 ring-amber-200"
          : "bg-stone-100 text-stone-700 ring-stone-200",
      )}
    >
      {children}
    </span>
  );
}

function LoadingCard({ label }: { label: string }) {
  return (
    <div className="card flex min-h-[320px] items-center justify-center text-sm text-stone-500">
      {label}
    </div>
  );
}
