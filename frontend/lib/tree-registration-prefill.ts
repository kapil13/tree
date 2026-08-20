import type { PlantingProject } from "@/lib/api";

type PrefillValues = Record<string, string | number | boolean>;

export type InheritedStandardPrefill = {
  pit_size_label?: string | null;
  spacing_m_min?: number | null;
  guard_type_required?: boolean;
};

/** Format decimal chainage km as highway label (e.g. 142.38 → "142+380"). */
export function formatChainageLabel(chainageKm: number): string {
  const whole = Math.floor(chainageKm);
  let meters = Math.round((chainageKm - whole) * 1000);
  let km = whole;
  if (meters >= 1000) {
    km += 1;
    meters = 0;
  }
  return `${km}+${String(meters).padStart(3, "0")}`;
}

export function formatChainageDisplay(chainageKm: number): string {
  return `KM ${formatChainageLabel(chainageKm)}`;
}

/** Merge scheme references and project context into tree registration form values. */
export function applyProjectTreePrefill(
  base: PrefillValues,
  project: PlantingProject,
): PrefillValues {
  const refs = (project.metadata?.scheme_refs as Record<string, unknown> | undefined) ?? {};
  const next: PrefillValues = { ...base };

  const setIfEmpty = (key: string, value: string | number | boolean | undefined | null) => {
    if (value == null || value === "") return;
    const current = next[key];
    if (current === "" || current === undefined || current === null) {
      next[key] = value;
    }
  };

  setIfEmpty("project_code", project.code);

  const village = refs.village_name ?? refs.ulb_name;
  setIfEmpty("site_zone", String(village ?? ""));
  setIfEmpty("panchayat_village", String(refs.village_name ?? ""));
  setIfEmpty("community_name", String(refs.cooperative_society_name ?? ""));
  setIfEmpty(
    "implementing_agency",
    String(refs.amul_union_name ?? refs.ulb_name ?? refs.cooperative_society_name ?? ""),
  );
  setIfEmpty("permit_reference", String(refs.nccf_project_ref ?? refs.nagar_van_project_id ?? ""));

  if (project.scheme_code === "nagar_van") {
    setIfEmpty("legal_basis", "urban_greening");
    setIfEmpty("land_category", "urban");
  }
  if (project.scheme_code === "sahakar_van") {
    setIfEmpty("legal_basis", "other");
    setIfEmpty("land_category", "govt_land");
    setIfEmpty("consent_reference", String(refs.nccf_project_ref ?? ""));
  }

  const rules = (project.active_standard?.rules ?? {}) as Record<string, unknown>;
  const nativeMin = rules.species_native_pct_min as number | undefined;
  if (nativeMin != null && nativeMin >= 80) {
    next.species_native = true;
  }

  const pitSize = rules.pit_size_cm as
    | { length?: number; width?: number; depth?: number }
    | undefined;
  if (pitSize?.length != null && pitSize.width != null && pitSize.depth != null) {
    setIfEmpty(
      "pit_size_cm",
      `${pitSize.length}×${pitSize.width}×${pitSize.depth}`,
    );
  }

  const spacing = rules.spacing_m as { min?: number } | undefined;
  if (spacing?.min != null) {
    setIfEmpty("spacing_m", spacing.min);
  }

  if (rules.guard_type_required && !next.guard_type) {
    next.guard_type = "bamboo";
  }

  return next;
}

export function inheritedStandardSummary(
  rules: Record<string, unknown> | undefined,
): InheritedStandardPrefill {
  if (!rules) return {};
  const pitSize = rules.pit_size_cm as
    | { length?: number; width?: number; depth?: number }
    | undefined;
  const spacing = rules.spacing_m as { min?: number } | undefined;
  const pitLabel =
    pitSize?.length != null && pitSize.width != null && pitSize.depth != null
      ? `${pitSize.length}×${pitSize.width}×${pitSize.depth}`
      : null;
  return {
    pit_size_label: pitLabel,
    spacing_m_min: spacing?.min ?? null,
    guard_type_required: Boolean(rules.guard_type_required),
  };
}

export function plantingRulesSummary(rules: Record<string, unknown> | undefined): string[] {
  if (!rules) return [];
  const lines: string[] = [];
  const spacing = rules.spacing_m as { min?: number } | undefined;
  if (spacing?.min != null) lines.push(`Min spacing ${spacing.min} m`);
  const nativeMin = rules.species_native_pct_min as number | undefined;
  if (nativeMin != null) lines.push(`Native species ≥${nativeMin}%`);
  const minPhotos = rules.min_photos as number | undefined;
  if (minPhotos != null) lines.push(`At least ${minPhotos} photos`);
  if (rules.guard_type_required) lines.push("Tree guard required");
  if (rules.chainage_enabled) lines.push("Chainage required");
  const allowed = rules.allowed_species as string[] | undefined;
  if (allowed?.length) lines.push(`${allowed.length} approved species`);
  const minTrees = rules.min_trees_project as number | undefined;
  if (minTrees != null) lines.push(`Site target ${minTrees.toLocaleString()} trees`);
  return lines;
}

export function uniqueSpeciesChips(allowed: string[] | undefined): string[] {
  if (!allowed?.length) return [];
  const seen = new Set<string>();
  const chips: string[] = [];
  for (const name of allowed) {
    const key = name.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    chips.push(name);
  }
  return chips.slice(0, 12);
}
