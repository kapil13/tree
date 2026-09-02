export const FIELD_OPS_SECTION_IDS = ["attention"] as const;

export type FieldOpsSection = (typeof FIELD_OPS_SECTION_IDS)[number];

export function parseFieldOpsSection(value: string | null): FieldOpsSection | null {
  if (!value) return null;
  return FIELD_OPS_SECTION_IDS.includes(value as FieldOpsSection)
    ? (value as FieldOpsSection)
    : null;
}

export function fieldOpsHref(opts?: { section?: FieldOpsSection }): string {
  if (opts?.section === "attention") return "/field-ops?section=attention";
  return "/field-ops";
}
