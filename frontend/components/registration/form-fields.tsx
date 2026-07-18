"use client";

import type { ProgramField, ProgramFormValues } from "./types";
import { cn } from "@/lib/cn";

type FormFieldsGridProps = {
  fields: ProgramField[];
  values: ProgramFormValues;
  onChange: (values: ProgramFormValues) => void;
};

export function FormFieldsGrid({ fields, values, onChange }: FormFieldsGridProps) {
  function setValue(key: string, value: string | number | boolean) {
    onChange({ ...values, [key]: value });
  }

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {fields.map((field) => (
        <FieldControl
          key={field.key}
          field={field}
          value={values[field.key]}
          onChange={(value) => setValue(field.key, value)}
        />
      ))}
    </div>
  );
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: ProgramField;
  value: string | number | boolean | undefined;
  onChange: (value: string | number | boolean) => void;
}) {
  if (field.type === "boolean") {
    return (
      <label
        className={cn(
          "group flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition md:col-span-2",
          Boolean(value)
            ? "border-forest-300 bg-forest-50/80 dark:border-forest-800 dark:bg-forest-950/40"
            : "border-stone-200 bg-white/70 hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900/50",
        )}
      >
        <span
          className={cn(
            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition",
            Boolean(value)
              ? "border-forest-600 bg-forest-600 text-white"
              : "border-stone-300 bg-white dark:border-stone-600 dark:bg-stone-900",
          )}
        >
          {Boolean(value) ? "✓" : ""}
        </span>
        <span className="space-y-1">
          <span className="block text-sm font-medium text-stone-900 dark:text-stone-100">
            {field.label}
            {field.required ? <span className="text-rose-500"> *</span> : null}
          </span>
          {field.help_text && (
            <span className="block text-xs leading-relaxed text-stone-500">{field.help_text}</span>
          )}
        </span>
        <input
          type="checkbox"
          className="sr-only"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
      </label>
    );
  }

  const wide = field.type === "textarea";

  return (
    <div className={cn("space-y-2", wide && "md:col-span-2")}>
      <label className="block text-sm font-medium text-stone-800 dark:text-stone-100">
        {field.label}
        {field.required ? <span className="text-rose-500"> *</span> : null}
      </label>

      {field.type === "select" ? (
        <div className="relative">
          <select
            className="field-input appearance-none pr-10"
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
          >
            <option value="">Choose an option</option>
            {(field.options || []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">
            ▾
          </span>
        </div>
      ) : field.type === "textarea" ? (
        <textarea
          className="field-input min-h-[120px] resize-y"
          value={String(value ?? "")}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
        />
      ) : (
        <input
          className="field-input"
          type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
          value={String(value ?? "")}
          placeholder={field.placeholder}
          min={field.min}
          max={field.max}
          onChange={(e) =>
            onChange(field.type === "number" ? Number(e.target.value) : e.target.value)
          }
          required={field.required}
        />
      )}

      {field.help_text && (
        <p className="text-xs leading-relaxed text-stone-500">{field.help_text}</p>
      )}
    </div>
  );
}
