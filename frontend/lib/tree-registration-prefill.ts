import type { PlantingProject } from "@/lib/api";

type PrefillValues = Record<string, string | number | boolean>;

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

  const nativeMin = (project.active_standard?.rules as { species_native_pct_min?: number } | undefined)
    ?.species_native_pct_min;
  if (nativeMin != null && nativeMin >= 80) {
    next.species_native = true;
  }

  return next;
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
