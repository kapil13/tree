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
  Trash2,
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
import { CreateTemplateDialog } from "./create-template-dialog";
import { RuleFieldInput } from "./rule-field-input";

const TEMPLATE_ICONS: Record<string, typeof Leaf> = {
  nhai_highway_v1: Route,
  industrial_greenbelt_v1: Factory,
  township_landscape_v1: Building2,
  nagar_van_urban_forest_v1: Trees,
  sahakar_van_cooperative_v1: Users,
  ngo_watershed_v1: Sprout,
  campa_ca_v1: Trees,
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
  const [sourceFilter, setSourceFilter] = useState<"all" | "code" | "custom">("all");
  const [enabled, setEnabled] = useState(true);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateSegment, setTemplateSegment] = useState("general");
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
    let list = templates;
    if (sourceFilter === "code") list = list.filter((t) => !t.is_custom);
    if (sourceFilter === "custom") list = list.filter((t) => t.is_custom);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.template_code.toLowerCase().includes(q) ||
        t.segment_label.toLowerCase().includes(q),
    );
  }, [templates, search, sourceFilter]);

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
    setTemplateName(selected.name);
    setTemplateDescription(selected.description);
    setTemplateSegment(selected.segment);
    setEnabled(selected.is_custom ? true : selected.override.enabled);
    setComplianceMode(selected.compliance_mode);
    setEffectiveFrom(selected.override.effective_from?.slice(0, 16) ?? "");
    setPublishNote(selected.override.publish_note ?? "");
    const source = selected.is_custom
      ? selected.effective_rules
      : selected.override.enabled && Object.keys(selected.override.rules).length > 0
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
        enabled: selected.is_custom ? true : enabled,
        rules: payloadRules,
        compliance_mode: complianceMode,
        effective_from: selected.is_custom || !effectiveFrom ? null : new Date(effectiveFrom).toISOString(),
        publish_note: publishNote || null,
        ...(selected.is_custom
          ? {
              name: templateName,
              description: templateDescription,
              segment: templateSegment,
            }
          : {}),
      });
    },
    onSuccess: () => {
      setMessage({
        type: "ok",
        text: selected?.is_custom
          ? "Custom template saved. It is available when creating new projects."
          : "Published successfully. Rules are live for all projects.",
      });
      qc.invalidateQueries({ queryKey: ["cms-rule-templates"] });
      qc.invalidateQueries({ queryKey: ["cms-rule-versions"] });
      qc.invalidateQueries({ queryKey: ["project-templates"] });
    },
    onError: (err) => setMessage({ type: "err", text: errorMessage(err) }),
  });

  const archive = useMutation({
    mutationFn: () => {
      if (!selected?.is_custom) throw new Error("Only custom templates can be archived");
      return cmsAdmin.archiveRuleTemplate(selected.template_code);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms-rule-templates"] });
      setSelectedCode(null);
      setMessage({ type: "ok", text: "Template archived. It will no longer appear in project setup." });
    },
    onError: (err) => setMessage({ type: "err", text: errorMessage(err) }),
  });

  if (isLoading) {
    return <LoadingCard label="Loading templates…" />;
  }

  const isCustom = Boolean(selected?.is_custom);

  const sections = selected ? sectionsForTemplate(selected.code_defaults) : [];
  const visibleSections =
    activeSection === "all" ? sections : sections.filter((s) => s === activeSection);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(250px,280px)_1fr]">
      <aside className="card flex flex-col overflow-hidden p-0">
        <div className="space-y-3 border-b border-stone-100 p-4 dark:border-stone-800">
          <CreateTemplateDialog
            templates={templates ?? []}
            onCreated={(code) => setSelectedCode(code)}
          />
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              className="input w-full pl-9"
              placeholder="Search templates…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className="flex gap-1 rounded-lg bg-stone-100 p-1 text-xs dark:bg-stone-800">
            {(["all", "code", "custom"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSourceFilter(key)}
                className={cn(
                  "flex-1 rounded-md px-2 py-1.5 font-medium capitalize",
                  sourceFilter === key
                    ? "bg-white text-forest-800 shadow-sm dark:bg-stone-900"
                    : "text-stone-600",
                )}
              >
                {key === "code" ? "Built-in" : key}
              </button>
            ))}
          </div>
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
              <div className="min-w-0 flex-1 space-y-3">
                {isCustom ? (
                  <>
                    <div>
                      <label className="kpi-label">Template name</label>
                      <input
                        className="input mt-1"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="kpi-label">Description</label>
                      <textarea
                        className="input mt-1 min-h-[72px]"
                        value={templateDescription}
                        onChange={(e) => setTemplateDescription(e.target.value)}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold">{selected.name}</h3>
                    <p className="text-sm text-stone-600 dark:text-stone-300">{selected.description}</p>
                  </>
                )}
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge>{selected.template_code}</Badge>
                  {isCustom ? (
                    <Badge tone="custom">Custom</Badge>
                  ) : (
                    <Badge>{selected.segment_label}</Badge>
                  )}
                  {changedKeys.length > 0 && (
                    <Badge tone="warn">{changedKeys.length} unsaved</Badge>
                  )}
                </div>
              </div>
              {!isCustom && (
                <label className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800/50">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                  />
                  CMS override on
                </label>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {isCustom && (
                <div>
                  <label className="kpi-label">Segment</label>
                  <select
                    className="input mt-1"
                    value={templateSegment}
                    onChange={(e) => setTemplateSegment(e.target.value)}
                  >
                    <option value="general">General plantation</option>
                    <option value="nhai_highway">NHAI / Highway</option>
                    <option value="industrial_greenbelt">Industrial / Mine</option>
                    <option value="township_landscape">Township / Society</option>
                    <option value="nagar_van_urban">Nagar Van / Urban forest</option>
                    <option value="sahakar_van_coop">Sahakar Van / Cooperative</option>
                    <option value="ngo_watershed">NGO / Watershed</option>
                  </select>
                </div>
              )}
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
              {!isCustom && (
                <div>
                  <label className="kpi-label">Effective from (optional)</label>
                  <input
                    type="datetime-local"
                    className="input mt-1"
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                  />
                </div>
              )}
              <div className={isCustom ? "" : "sm:col-span-1"}>
                <label className="kpi-label">{isCustom ? "Change note" : "Publish note"}</label>
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
            {isCustom && (
              <button
                type="button"
                className="btn-secondary text-rose-700"
                disabled={archive.isPending}
                onClick={() => {
                  if (window.confirm(`Archive "${selected.name}"? Existing projects keep their snapshot.`)) {
                    archive.mutate();
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
                Archive
              </button>
            )}
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
              disabled={save.isPending || (isCustom && templateName.trim().length < 3)}
              onClick={() => {
                setMessage(null);
                save.mutate();
              }}
            >
              <Save className="h-4 w-4" />
              {save.isPending ? "Saving…" : isCustom ? "Save template" : "Publish rules"}
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
            {tpl.is_custom && <span className="h-2 w-2 rounded-full bg-violet-500" />}
            {tpl.has_custom_rules && !tpl.is_custom && (
              <span className="h-2 w-2 rounded-full bg-amber-500" />
            )}
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

function Badge({ children, tone }: { children: ReactNode; tone?: "warn" | "custom" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 font-mono text-[10px] ring-1",
        tone === "warn"
          ? "bg-amber-50 text-amber-900 ring-amber-200"
          : tone === "custom"
            ? "bg-violet-50 text-violet-900 ring-violet-200"
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
