"use client";

import { useMemo } from "react";

export type ProgramFieldType = "text" | "textarea" | "number" | "date" | "select" | "boolean";

export type ProgramField = {
  key: string;
  label: string;
  type: ProgramFieldType;
  required?: boolean;
  placeholder?: string;
  help_text?: string;
  core?: boolean;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
};

export type ProgramSection = {
  id: string;
  title: string;
  description?: string;
  fields: ProgramField[];
};

export type ProgramFormSchema = {
  code: string;
  name: string;
  description: string;
  audience: string;
  min_photos: number;
  is_default: boolean;
  sections: ProgramSection[];
};

export type ProgramFormValues = Record<string, string | number | boolean>;

export function buildInitialValues(program?: ProgramFormSchema | null): ProgramFormValues {
  const values: ProgramFormValues = {};
  if (!program) return values;
  for (const section of program.sections) {
    for (const field of section.fields) {
      if (field.type === "boolean") values[field.key] = false;
      else values[field.key] = "";
    }
  }
  return values;
}

export function splitPayload(
  program: ProgramFormSchema,
  values: ProgramFormValues,
  photoKeys: string[],
) {
  const core: Record<string, unknown> = {};
  const metadata: Record<string, unknown> = {};

  for (const section of program.sections) {
    for (const field of section.fields) {
      const raw = values[field.key];
      if (raw === "" || raw === undefined || raw === null) continue;
      if (field.core) core[field.key] = raw;
      else metadata[field.key] = raw;
    }
  }

  return {
    program_code: program.code,
    species_text: (core.species_text as string) || undefined,
    planted_at: (core.planted_at as string) || undefined,
    latitude: Number(core.latitude),
    longitude: Number(core.longitude),
    altitude_m: core.altitude_m !== undefined ? Number(core.altitude_m) : undefined,
    accuracy_m: core.accuracy_m !== undefined ? Number(core.accuracy_m) : undefined,
    photo_keys: photoKeys,
    metadata,
  };
}

type TreeRegistrationFormProps = {
  program: ProgramFormSchema;
  values: ProgramFormValues;
  onChange: (values: ProgramFormValues) => void;
  photoKeys: string[];
  onPhotoKeysChange: (keys: string[]) => void;
  onUseLocation?: () => void;
  locationLabel?: string;
  busy?: boolean;
  onUploadPhoto?: (file: File) => Promise<string>;
};

export function TreeRegistrationForm({
  program,
  values,
  onChange,
  photoKeys,
  onPhotoKeysChange,
  onUseLocation,
  locationLabel,
  busy,
  onUploadPhoto,
}: TreeRegistrationFormProps) {
  const nonLocationSections = useMemo(
    () =>
      program.sections.filter(
        (section) => !section.fields.every((field) => field.key === "latitude" || field.key === "longitude" || field.key === "accuracy_m" || field.key === "altitude_m"),
      ),
    [program.sections],
  );

  const locationSection = program.sections.find((section) =>
    section.fields.some((field) => field.key === "latitude"),
  );

  function setValue(key: string, value: string | number | boolean) {
    onChange({ ...values, [key]: value });
  }

  async function handlePhotoChange(fileList: FileList | null) {
    if (!fileList || !onUploadPhoto) return;
    const keys = [...photoKeys];
    for (const file of Array.from(fileList)) {
      const key = await onUploadPhoto(file);
      keys.push(key);
    }
    onPhotoKeysChange(keys);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-900">
        <div className="font-medium">{program.name}</div>
        <div className="text-emerald-800">{program.description}</div>
        <div className="mt-1 text-xs text-emerald-700">
          Audience: {program.audience} · Minimum photos: {program.min_photos}
        </div>
      </div>

      {nonLocationSections.map((section) => (
        <section key={section.id} className="space-y-4">
          <div>
            <h2 className="text-lg font-medium">{section.title}</h2>
            {section.description && (
              <p className="text-sm text-stone-500">{section.description}</p>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {section.fields.map((field) => (
              <FieldInput
                key={field.key}
                field={field}
                value={values[field.key]}
                onChange={(value) => setValue(field.key, value)}
              />
            ))}
          </div>
        </section>
      ))}

      {locationSection && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-medium">{locationSection.title}</h2>
            {locationSection.description && (
              <p className="text-sm text-stone-500">{locationSection.description}</p>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {locationSection.fields.map((field) => (
              <FieldInput
                key={field.key}
                field={field}
                value={values[field.key]}
                onChange={(value) => setValue(field.key, value)}
              />
            ))}
          </div>
          {onUseLocation && (
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={onUseLocation} className="btn-secondary" disabled={busy}>
                Use my location
              </button>
              {locationLabel && <span className="text-sm text-stone-600">{locationLabel}</span>}
            </div>
          )}
        </section>
      )}

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-medium">Photos</h2>
          <p className="text-sm text-stone-500">
            Upload at least {program.min_photos} geo-tagged photo
            {program.min_photos === 1 ? "" : "s"}.
          </p>
        </div>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          disabled={busy || !onUploadPhoto}
          onChange={(e) => {
            void handlePhotoChange(e.target.files);
            e.target.value = "";
          }}
        />
        {photoKeys.length > 0 && (
          <p className="text-sm text-stone-600">{photoKeys.length} photo(s) ready to attach.</p>
        )}
      </section>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: ProgramField;
  value: string | number | boolean | undefined;
  onChange: (value: string | number | boolean) => void;
}) {
  const className = field.type === "textarea" ? "input min-h-24 md:col-span-2" : "input";

  if (field.type === "boolean") {
    return (
      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>
          {field.label}
          {field.required ? " *" : ""}
        </span>
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <div>
        <label className="label">
          {field.label}
          {field.required ? " *" : ""}
        </label>
        <select
          className="input"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
        >
          <option value="">Select…</option>
          {(field.options || []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {field.help_text && <p className="mt-1 text-xs text-stone-500">{field.help_text}</p>}
      </div>
    );
  }

  return (
    <div className={field.type === "textarea" ? "md:col-span-2" : undefined}>
      <label className="label">
        {field.label}
        {field.required ? " *" : ""}
      </label>
      {field.type === "textarea" ? (
        <textarea
          className={className}
          value={String(value ?? "")}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
        />
      ) : (
        <input
          className={className}
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
      {field.help_text && <p className="mt-1 text-xs text-stone-500">{field.help_text}</p>}
    </div>
  );
}
