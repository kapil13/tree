import type { ProgramFormSchema, ProgramFormValues } from "@/components/registration/types";

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

export function isLocationSection(sectionId: string) {
  return sectionId === "location";
}

export function countFilledRequired(
  fields: ProgramFormSchema["sections"][number]["fields"],
  values: ProgramFormValues,
) {
  const required = fields.filter((f) => f.required);
  if (!required.length) return { filled: 0, total: 0, complete: true };
  const filled = required.filter((f) => {
    const v = values[f.key];
    if (typeof v === "boolean") return true;
    return v !== "" && v !== undefined && v !== null;
  }).length;
  return { filled, total: required.length, complete: filled === required.length };
}
