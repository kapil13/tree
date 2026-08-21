"use client";

import { Check, ShieldCheck } from "lucide-react";
import type { StandardTemplate } from "@/lib/api";
import { plantingRulesSummary } from "@/lib/tree-registration-prefill";
import { cn } from "@/lib/cn";

type PlantingStandardPreviewProps = {
  template?: StandardTemplate | null;
  confirmed?: boolean;
  onConfirmChange?: (confirmed: boolean) => void;
  className?: string;
};

export function PlantingStandardPreview({
  template,
  confirmed = false,
  onConfirmChange,
  className,
}: PlantingStandardPreviewProps) {
  if (!template) return null;

  const rules = (template.rules ?? {}) as Record<string, unknown>;
  const summaryLines = plantingRulesSummary(rules);

  return (
    <div
      className={cn(
        "rounded-xl border border-forest-100 bg-gradient-to-br from-forest-50/70 to-white p-4 dark:border-forest-900/40 dark:from-forest-950/30 dark:to-stone-900",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-forest-600 text-white">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-forest-700">
            Planting standard
          </p>
          <p className="mt-1 font-medium text-stone-900 dark:text-stone-50">{template.name}</p>
          {template.description && (
            <p className="mt-1 text-xs text-stone-500">{template.description}</p>
          )}
        </div>
      </div>

      {summaryLines.length > 0 && (
        <ul className="mt-4 space-y-1.5 text-sm text-stone-700">
          {summaryLines.map((line) => (
            <li key={line} className="flex items-start gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-forest-600" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs text-stone-500">
        Pit size, spacing, and guard rules inherit to every tree you register in this project.
        You can adjust site-specific overrides later in Programme settings.
      </p>

      {onConfirmChange && (
        <label className="mt-4 flex cursor-pointer items-start gap-2 rounded-lg border border-stone-200 bg-white/80 p-3 text-sm dark:border-stone-700 dark:bg-stone-900/50">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={confirmed}
            onChange={(e) => onConfirmChange(e.target.checked)}
          />
          <span>
            I confirm this planting standard matches our site plan and audit requirements.
          </span>
        </label>
      )}
    </div>
  );
}
