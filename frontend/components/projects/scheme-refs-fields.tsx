"use client";

import { cn } from "@/lib/cn";

export type SchemeRefField = {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  help_text?: string;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
};

type SchemeRefsFieldsProps = {
  fields: SchemeRefField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  errors?: Record<string, string>;
  className?: string;
};

export function SchemeRefsFields({
  fields,
  values,
  onChange,
  errors,
  className,
}: SchemeRefsFieldsProps) {
  if (fields.length === 0) {
    return (
      <p className="text-sm text-stone-500">No reference fields are configured for this scheme.</p>
    );
  }

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      {fields.map((field) => (
        <div
          key={field.key}
          className={field.type === "number" ? "" : "sm:col-span-1"}
        >
          <label className="kpi-label">
            {field.label}
            {field.required ? " *" : ""}
          </label>
          {field.type === "select" && field.options ? (
            <select
              className="input mt-1"
              value={values[field.key] ?? ""}
              onChange={(e) => onChange(field.key, e.target.value)}
            >
              <option value="">Select…</option>
              {field.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="input mt-1"
              type={field.type === "number" ? "number" : "text"}
              placeholder={field.placeholder}
              min={field.min}
              max={field.max}
              value={values[field.key] ?? ""}
              onChange={(e) => onChange(field.key, e.target.value)}
            />
          )}
          {field.help_text && (
            <p className="mt-1 text-xs text-stone-500">{field.help_text}</p>
          )}
          {errors?.[field.key] && (
            <p className="mt-1 text-xs text-rose-600">{errors[field.key]}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export function validateSchemeRefs(
  fields: SchemeRefField[],
  values: Record<string, string>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    if (!field.required) continue;
    const value = (values[field.key] ?? "").trim();
    if (!value) {
      errors[field.key] = "Required for audit and fund convergence";
    }
  }
  return errors;
}
