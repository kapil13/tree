export const FIELD_OPS_SECTION_IDS = ["attention", "audit"] as const;

export type FieldOpsSection = (typeof FIELD_OPS_SECTION_IDS)[number];

export function parseFieldOpsSection(value: string | null): FieldOpsSection | null {
  if (!value) return null;
  return FIELD_OPS_SECTION_IDS.includes(value as FieldOpsSection)
    ? (value as FieldOpsSection)
    : null;
}

export function fieldOpsHref(opts?: {
  section?: FieldOpsSection;
  projectId?: string | null;
}): string {
  const params = new URLSearchParams();
  if (opts?.section === "attention") params.set("section", "attention");
  if (opts?.section === "audit") params.set("section", "audit");
  if (opts?.projectId) params.set("project", opts.projectId);
  const query = params.toString();
  return query ? `/field-ops?${query}` : "/field-ops";
}
