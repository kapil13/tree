"use client";

import { ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";
import { RuleFieldInput } from "@/components/platform/rule-engine/rule-field-input";
import {
  buildEditableRules,
  getNestedValue,
  setNestedValue,
  wizardSiteRuleFields,
  type RuleFieldSection,
} from "@/lib/rule-template-fields";
import { cn } from "@/lib/cn";

const WIZARD_SECTION_ORDER: RuleFieldSection[] = ["spacing", "pit", "gps_media", "layout"];

const WIZARD_SECTION_LABELS: Partial<Record<RuleFieldSection, string>> = {
  spacing: "Spacing",
  pit: "Pit size",
  gps_media: "Photos & evidence",
  layout: "Guard & layout",
};

export type SiteRuleAdjustmentsState = {
  enabled: boolean;
  rules: Record<string, unknown>;
  note: string;
};

export function initialSiteRuleAdjustments(
  baseRules: Record<string, unknown>,
): SiteRuleAdjustmentsState {
  return {
    enabled: false,
    rules: buildEditableRules(baseRules, baseRules),
    note: "",
  };
}

type SiteRuleAdjustmentsPanelProps = {
  baseRules: Record<string, unknown>;
  enabled: boolean;
  rules: Record<string, unknown>;
  note: string;
  onEnabledChange: (enabled: boolean) => void;
  onRulesChange: (rules: Record<string, unknown>) => void;
  onNoteChange: (note: string) => void;
  className?: string;
};

export function SiteRuleAdjustmentsPanel({
  baseRules,
  enabled,
  rules,
  note,
  onEnabledChange,
  onRulesChange,
  onNoteChange,
  className,
}: SiteRuleAdjustmentsPanelProps) {
  const fields = wizardSiteRuleFields(baseRules);
  if (fields.length === 0) return null;

  const sections = WIZARD_SECTION_ORDER.filter((section) =>
    fields.some((field) => field.section === section),
  );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-stone-200 dark:border-stone-700",
        className,
      )}
    >
      <label className="flex cursor-pointer items-start gap-3 bg-stone-50/80 px-4 py-3 dark:bg-stone-800/50">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-stone-300"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-sm font-medium text-stone-900 dark:text-stone-50">
            <SlidersHorizontal className="h-4 w-4 text-forest-700" />
            Our site differs from the standard (optional)
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-stone-500">
            Adjust spacing, pit size, photo count, or guard requirements for this parcel only.
            Most projects use the template defaults above.
          </span>
        </span>
        {enabled ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-stone-400" aria-hidden />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-stone-400" aria-hidden />
        )}
      </label>

      {enabled && (
        <div className="space-y-4 border-t border-stone-200 px-4 py-4 dark:border-stone-700">
          {sections.map((section) => {
            const sectionFields = fields.filter((field) => field.section === section);
            if (sectionFields.length === 0) return null;
            return (
              <section key={section} className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  {WIZARD_SECTION_LABELS[section] ?? section}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {sectionFields.map((field) => (
                    <RuleFieldInput
                      key={field.path}
                      field={field}
                      value={getNestedValue(rules, field.path)}
                      defaultValue={getNestedValue(baseRules, field.path)}
                      onChange={(value) =>
                        onRulesChange(setNestedValue(rules, field.path, value))
                      }
                    />
                  ))}
                </div>
              </section>
            );
          })}

          <div>
            <label className="kpi-label">Why this site differs (optional)</label>
            <input
              className="input mt-1"
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="e.g. Rocky terrain — 4 m spacing approved by DFO"
            />
          </div>
        </div>
      )}
    </div>
  );
}
