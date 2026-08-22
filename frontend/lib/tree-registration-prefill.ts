import type { PlantingProject } from "@/lib/api";
import {
  treeRegistrationDefaultsFromProject,
} from "@/lib/tree-registration-defaults";

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

/** Parse highway chainage label back to decimal km (e.g. "142+380" → 142.38). */
export function parseChainageLabel(label: string): number | null {
  const text = label.trim();
  if (!text) return null;
  if (text.includes("+")) {
    const [wholePart, meterPart] = text.split("+", 2);
    const whole = Number(wholePart);
    const meters = Number(meterPart);
    if (Number.isNaN(whole) || Number.isNaN(meters)) return null;
    return Math.round((whole + meters / 1000) * 1000) / 1000;
  }
  const km = Number(text);
  return Number.isNaN(km) ? null : km;
}

export function formatChainageDisplay(chainageKm: number): string {
  return `KM ${formatChainageLabel(chainageKm)}`;
}

export type SuggestedNextPrefill = {
  chainage_label: string;
  chainage_display: string;
  latitude: number | null;
  longitude: number | null;
};

/** Apply registration-context suggested_next GPS + chainage onto form values. */
export function applySuggestedNextPrefill(
  base: PrefillValues,
  suggested: SuggestedNextPrefill,
): PrefillValues {
  const next: PrefillValues = { ...base };
  next.chainage_km = suggested.chainage_label;
  if (suggested.latitude != null) next.latitude = String(suggested.latitude);
  if (suggested.longitude != null) next.longitude = String(suggested.longitude);
  next.accuracy_m = "";
  next.altitude_m = "";
  return next;
}

/** Estimate the next chainage label after the current form value + spacing. */
export function nextChainageLabelAfter(
  currentLabel: string | number | boolean | undefined,
  spacingM: number | null | undefined,
): string | null {
  if (spacingM == null || spacingM <= 0) return null;
  const label = typeof currentLabel === "string" ? currentLabel : String(currentLabel ?? "");
  const km = parseChainageLabel(label);
  if (km == null) return null;
  return formatChainageLabel(km + spacingM / 1000);
}

/** Merge scheme references and project context into tree registration form values. */
export function applyProjectTreePrefill(
  base: PrefillValues,
  project: PlantingProject,
  options?: { surveyorName?: string | null },
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

  const treeDefaults = treeRegistrationDefaultsFromProject(project);
  setIfEmpty("permit_reference", treeDefaults.permit_reference);
  setIfEmpty("site_zone", treeDefaults.site_zone);
  setIfEmpty("implementing_agency", treeDefaults.implementing_agency);
  setIfEmpty("maintenance_responsible", treeDefaults.maintenance_responsible);
  setIfEmpty("legal_basis", treeDefaults.legal_basis);
  setIfEmpty("land_category", treeDefaults.land_category);

  const village = refs.village_name ?? refs.ulb_name;
  setIfEmpty("site_zone", String(village ?? ""));
  setIfEmpty("panchayat_village", String(refs.village_name ?? ""));
  setIfEmpty("community_name", String(refs.cooperative_society_name ?? ""));
  setIfEmpty(
    "implementing_agency",
    String(refs.amul_union_name ?? refs.ulb_name ?? refs.cooperative_society_name ?? ""),
  );
  setIfEmpty("permit_reference", String(refs.nccf_project_ref ?? refs.nagar_van_project_id ?? ""));

  if (project.scheme_code === "campa_ca") {
    setIfEmpty("legal_basis", "compensatory_afforestation");
    setIfEmpty("land_category", "forest");
    setIfEmpty(
      "permit_reference",
      String(refs.pca_number ?? refs.forest_diversion_id ?? ""),
    );
    setIfEmpty("site_zone", String(refs.ca_land_parcel_id ?? refs.state_name ?? ""));
    setIfEmpty("implementing_agency", String(refs.state_campa_account ?? refs.state_name ?? ""));
  }
  if (project.scheme_code === "nagar_van") {
    setIfEmpty("legal_basis", "urban_greening");
    setIfEmpty("land_category", "urban");
  }
  if (project.scheme_code === "sahakar_van") {
    setIfEmpty("legal_basis", "other");
    setIfEmpty("land_category", "govt_land");
    setIfEmpty("consent_reference", String(refs.nccf_project_ref ?? ""));
  }
  if (project.scheme_code === "nhai_highway") {
    setIfEmpty("legal_basis", "highway_plantation");
    setIfEmpty("land_category", "highway_row");
  }

  const category = project.metadata?.plantation_category as string | undefined;
  if (category === "highway") {
    setIfEmpty("legal_basis", "highway_plantation");
    setIfEmpty("land_category", "highway_row");
  } else if (category === "forest_ca") {
    setIfEmpty("legal_basis", "compensatory_afforestation");
    setIfEmpty("land_category", "forest");
  } else if (category === "municipal") {
    setIfEmpty("legal_basis", "urban_greening");
    setIfEmpty("land_category", "urban");
  } else if (category === "other_government") {
    setIfEmpty("legal_basis", "other");
    setIfEmpty("land_category", "govt_land");
  } else if (project.segment === "nhai_highway") {
    setIfEmpty("legal_basis", "highway_plantation");
    setIfEmpty("land_category", "highway_row");
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

  setIfEmpty("survival_status", "live");
  if (options?.surveyorName) {
    setIfEmpty("surveyor_name", options.surveyorName);
  }
  const maintenance =
    next.implementing_agency ??
    refs.state_campa_account ??
    refs.state_name ??
    refs.amul_union_name;
  if (maintenance != null && maintenance !== "") {
    setIfEmpty("maintenance_responsible", String(maintenance));
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
