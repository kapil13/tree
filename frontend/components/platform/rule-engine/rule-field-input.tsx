"use client";

import type { ReactNode } from "react";
import {
  LAYOUT_PATTERN_OPTIONS,
  speciesListToText,
  textToSpeciesList,
  type RuleFieldDef,
} from "@/lib/rule-template-fields";
import { cn } from "@/lib/cn";

const BLOCK_TYPE_OPTIONS = [
  "ward_park",
  "degraded_land",
  "miyawaki_patch",
  "avenue_buffer",
  "conventional_block",
  "rainwater_harvest",
  "nursery_bed",
  "community_zone",
];

const PLANTATION_METHOD_OPTIONS = ["miyawaki", "conventional", "mixed"];

const LAYOUT_PATTERN_MULTI = [
  "miyawaki_cluster",
  "conventional_row",
  "mixed",
  "single_row",
  "grid",
  "cluster",
  "avenue",
];

export function RuleFieldInput({
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
      <FieldShell field={field} changed={changed}>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
          Enabled
        </label>
      </FieldShell>
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
          className="input mt-1 min-h-[100px] font-mono text-xs"
          value={speciesListToText(value)}
          onChange={(e) => onChange(textToSpeciesList(e.target.value))}
        />
      </FieldShell>
    );
  }

  if (field.type === "string_list") {
    const options =
      field.path === "block_types"
        ? BLOCK_TYPE_OPTIONS
        : field.path === "plantation_methods"
          ? PLANTATION_METHOD_OPTIONS
          : field.path === "layout_patterns_allowed"
            ? LAYOUT_PATTERN_MULTI
            : [];
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <FieldShell field={field} changed={changed} className="sm:col-span-2">
        <div className="mt-2 flex flex-wrap gap-2">
          {options.map((opt) => {
            const on = selected.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  const next = on ? selected.filter((s) => s !== opt) : [...selected, opt];
                  onChange(next.length ? next : null);
                }}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-colors",
                  on
                    ? "bg-forest-600 text-white ring-forest-600"
                    : "bg-stone-50 text-stone-600 ring-stone-200",
                )}
              >
                {opt.replace(/_/g, " ")}
              </button>
            );
          })}
        </div>
      </FieldShell>
    );
  }

  if (field.type === "geometry_select") {
    return (
      <FieldShell field={field} changed={changed}>
        <select
          className="input mt-1"
          value={String(value ?? "polygon")}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="polygon">Polygon</option>
          <option value="corridor">Corridor</option>
        </select>
      </FieldShell>
    );
  }

  return (
    <FieldShell field={field} changed={changed}>
      <div className="relative mt-1">
        <input
          className="input w-full pr-12"
          type="number"
          value={value === null || value === undefined ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
        {field.unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">
            {field.unit}
          </span>
        )}
      </div>
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
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        changed ? "border-amber-200 bg-amber-50/50" : "border-stone-200/80 bg-white",
        className,
      )}
    >
      <p className="text-xs font-semibold text-stone-800">
        {field.label}
        {changed && (
          <span className="ml-2 rounded bg-amber-200 px-1.5 py-0.5 text-[9px] uppercase text-amber-900">
            edited
          </span>
        )}
      </p>
      {field.hint && <p className="text-[11px] text-stone-500">{field.hint}</p>}
      {children}
    </div>
  );
}
