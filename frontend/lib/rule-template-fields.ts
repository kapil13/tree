/** Field metadata and helpers for CMS planting rule engine UI. */

export type RuleFieldSection =
  | "spacing"
  | "pit"
  | "gps_media"
  | "species"
  | "density"
  | "layout"
  | "targets"
  | "cooperative";

export type RuleFieldType =
  | "number"
  | "boolean"
  | "species_list"
  | "layout_select"
  | "string_list"
  | "geometry_select";

export type RuleFieldDef = {
  path: string;
  label: string;
  section: RuleFieldSection;
  type: RuleFieldType;
  unit?: string;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
};

export const RULE_SECTION_META: Record<
  RuleFieldSection,
  { title: string; description: string }
> = {
  spacing: {
    title: "Spacing",
    description: "Minimum distance between trees and early-warning thresholds.",
  },
  pit: {
    title: "Pit standards",
    description: "Excavation dimensions enforced during registration.",
  },
  gps_media: {
    title: "GPS & evidence",
    description: "Location accuracy and photo requirements.",
  },
  species: {
    title: "Species policy",
    description: "Native share targets and approved species lists.",
  },
  density: {
    title: "Planting density",
    description: "Trees per hectare limits for the work area.",
  },
  layout: {
    title: "Layout & corridor",
    description: "Planting pattern and highway chainage options.",
  },
  targets: {
    title: "Project targets",
    description: "Scale KPIs and site-size thresholds.",
  },
  cooperative: {
    title: "Cooperative requirements",
    description: "Sahakar Van site preparation and community rules.",
  },
};

export const RULE_FIELD_CATALOG: RuleFieldDef[] = [
  { path: "spacing_m.min", label: "Min spacing", section: "spacing", type: "number", unit: "m", min: 0.1, step: 0.1 },
  {
    path: "spacing_m.warn_below",
    label: "Spacing warn below",
    section: "spacing",
    type: "number",
    unit: "m",
    min: 0.1,
    step: 0.1,
  },
  {
    path: "spacing_conventional_m.min",
    label: "Conventional min spacing",
    section: "spacing",
    type: "number",
    unit: "m",
    min: 0.1,
    step: 0.1,
  },
  {
    path: "spacing_conventional_m.warn_below",
    label: "Conventional warn below",
    section: "spacing",
    type: "number",
    unit: "m",
    min: 0.1,
    step: 0.1,
  },
  { path: "pit_size_cm.length", label: "Pit length", section: "pit", type: "number", unit: "cm", min: 1 },
  { path: "pit_size_cm.width", label: "Pit width", section: "pit", type: "number", unit: "cm", min: 1 },
  { path: "pit_size_cm.depth", label: "Pit depth", section: "pit", type: "number", unit: "cm", min: 1 },
  {
    path: "pit_size_conventional_cm.length",
    label: "Conventional pit length",
    section: "pit",
    type: "number",
    unit: "cm",
    min: 1,
  },
  {
    path: "pit_size_conventional_cm.width",
    label: "Conventional pit width",
    section: "pit",
    type: "number",
    unit: "cm",
    min: 1,
  },
  {
    path: "pit_size_conventional_cm.depth",
    label: "Conventional pit depth",
    section: "pit",
    type: "number",
    unit: "cm",
    min: 1,
  },
  {
    path: "max_gps_accuracy_m",
    label: "Max GPS accuracy",
    section: "gps_media",
    type: "number",
    unit: "m",
    min: 1,
  },
  { path: "min_photos", label: "Minimum photos", section: "gps_media", type: "number", min: 0, step: 1 },
  { path: "require_pit_photo", label: "Pit photo required", section: "gps_media", type: "boolean" },
  {
    path: "species_native_pct_min",
    label: "Native species minimum",
    section: "species",
    type: "number",
    unit: "%",
    min: 0,
    max: 100,
  },
  {
    path: "allowed_species",
    label: "Approved species list",
    section: "species",
    type: "species_list",
    hint: "One species per line. Leave empty to allow any species.",
  },
  {
    path: "planting_density_per_ha.min",
    label: "Density minimum",
    section: "density",
    type: "number",
    unit: "trees/ha",
    min: 1,
  },
  {
    path: "planting_density_per_ha.max",
    label: "Density maximum",
    section: "density",
    type: "number",
    unit: "trees/ha",
    min: 1,
  },
  {
    path: "planting_density_conventional_per_ha.min",
    label: "Conventional density min",
    section: "density",
    type: "number",
    unit: "trees/ha",
    min: 1,
  },
  {
    path: "planting_density_conventional_per_ha.max",
    label: "Conventional density max",
    section: "density",
    type: "number",
    unit: "trees/ha",
    min: 1,
  },
  {
    path: "layout_pattern",
    label: "Layout pattern",
    section: "layout",
    type: "layout_select",
  },
  { path: "guard_type_required", label: "Tree guard required", section: "layout", type: "boolean" },
  { path: "chainage_enabled", label: "Chainage tracking", section: "layout", type: "boolean" },
  {
    path: "min_trees_project",
    label: "Min trees per project",
    section: "targets",
    type: "number",
    min: 1,
    step: 1,
  },
  {
    path: "site_area_acres_min",
    label: "Minimum site area",
    section: "targets",
    type: "number",
    unit: "acres",
    min: 0.1,
    step: 0.1,
  },
  {
    path: "community_participation_min_pct",
    label: "Community participation min",
    section: "targets",
    type: "number",
    unit: "%",
    min: 0,
    max: 100,
  },
  {
    path: "rainwater_harvest_required",
    label: "Rainwater harvesting required",
    section: "cooperative",
    type: "boolean",
  },
  {
    path: "soil_treatment_required",
    label: "Soil treatment required",
    section: "cooperative",
    type: "boolean",
  },
  {
    path: "organic_manure_required",
    label: "Organic manure required",
    section: "cooperative",
    type: "boolean",
  },
  { path: "cooperative_led", label: "Cooperative-led site", section: "cooperative", type: "boolean" },
  { path: "arid_land_optimized", label: "Arid land optimized", section: "cooperative", type: "boolean" },
  {
    path: "block_types",
    label: "Allowed block types",
    section: "targets",
    type: "string_list",
    hint: "Tap to toggle work-area block categories.",
  },
  {
    path: "plantation_methods",
    label: "Plantation methods",
    section: "targets",
    type: "string_list",
  },
  {
    path: "layout_patterns_allowed",
    label: "Allowed layout patterns",
    section: "layout",
    type: "string_list",
  },
  {
    path: "work_area_geometry",
    label: "Work area geometry",
    section: "layout",
    type: "geometry_select",
  },
  {
    path: "native_species_examples",
    label: "Native species examples (hints)",
    section: "species",
    type: "species_list",
    hint: "Shown as guidance — not enforced at registration.",
  },
  {
    path: "site_area_acres_reference",
    label: "Reference site area",
    section: "targets",
    type: "number",
    unit: "acres",
  },
];

export const LAYOUT_PATTERN_OPTIONS = [
  { value: "single_row", label: "Single row (highway)" },
  { value: "grid", label: "Grid" },
  { value: "cluster", label: "Cluster" },
  { value: "avenue", label: "Avenue" },
  { value: "miyawaki_cluster", label: "Miyawaki cluster" },
  { value: "free", label: "Free placement" },
];

export const COMPLIANCE_MODE_STYLES: Record<string, string> = {
  strict: "bg-rose-50 text-rose-800 ring-rose-200",
  guided: "bg-amber-50 text-amber-900 ring-amber-200",
  open: "bg-stone-100 text-stone-700 ring-stone-200",
};

function topLevelKey(path: string): string {
  return path.split(".")[0] ?? path;
}

export function fieldAppliesToTemplate(field: RuleFieldDef, codeDefaults: Record<string, unknown>): boolean {
  return topLevelKey(field.path) in codeDefaults;
}

export function fieldsForTemplate(codeDefaults: Record<string, unknown>): RuleFieldDef[] {
  return RULE_FIELD_CATALOG.filter((field) => fieldAppliesToTemplate(field, codeDefaults));
}

/** High-impact rule paths shown during project setup wizard (step 2). */
export const WIZARD_SITE_RULE_PATHS = [
  "spacing_m.min",
  "pit_size_cm.length",
  "pit_size_cm.width",
  "pit_size_cm.depth",
  "min_photos",
  "require_pit_photo",
  "guard_type_required",
] as const;

export function wizardSiteRuleFields(baseRules: Record<string, unknown>): RuleFieldDef[] {
  const allowed = new Set<string>(WIZARD_SITE_RULE_PATHS);
  return fieldsForTemplate(baseRules).filter((field) => allowed.has(field.path));
}

export function wizardRulesDifferFromBase(
  baseRules: Record<string, unknown>,
  editedRules: Record<string, unknown>,
): boolean {
  return wizardSiteRuleFields(baseRules).some((field) => {
    const baseVal = JSON.stringify(getNestedValue(baseRules, field.path) ?? null);
    const editVal = JSON.stringify(getNestedValue(editedRules, field.path) ?? null);
    return baseVal !== editVal;
  });
}

export function sectionsForTemplate(codeDefaults: Record<string, unknown>): RuleFieldSection[] {
  const fields = fieldsForTemplate(codeDefaults);
  const order: RuleFieldSection[] = [
    "spacing",
    "pit",
    "gps_media",
    "species",
    "density",
    "layout",
    "targets",
    "cooperative",
  ];
  return order.filter((section) => fields.some((f) => f.section === section));
}

export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

export function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const parts = path.split(".");
  const next = structuredClone(obj);
  let cur: Record<string, unknown> = next;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i]!;
    const child = cur[part];
    if (child == null || typeof child !== "object") {
      cur[part] = {};
    }
    cur = cur[part] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]!] = value;
  return next;
}

export function buildEditableRules(
  codeDefaults: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of fieldsForTemplate(codeDefaults)) {
    const key = topLevelKey(field.path);
    const value = getNestedValue(source, key);
    if (value !== undefined) {
      out[key] = structuredClone(value);
    }
  }
  return out;
}

export function diffOverrideKeys(
  codeDefaults: Record<string, unknown>,
  edited: Record<string, unknown>,
): string[] {
  const changed: string[] = [];
  for (const field of fieldsForTemplate(codeDefaults)) {
    const key = topLevelKey(field.path);
    const baseVal = JSON.stringify(codeDefaults[key] ?? null);
    const editVal = JSON.stringify(edited[key] ?? null);
    if (baseVal !== editVal) changed.push(key);
  }
  return changed;
}

export function speciesListToText(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value.map(String).join("\n");
}

export function textToSpeciesList(text: string): string[] | null {
  const items = text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length ? items : null;
}
