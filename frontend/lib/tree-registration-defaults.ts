import type { PlantingProject } from "@/lib/api";

export type TreeRegistrationDefaults = {
  permit_reference: string;
  site_zone: string;
  implementing_agency: string;
  maintenance_responsible: string;
  legal_basis?: string;
  land_category?: string;
};

export const TREE_REGISTRATION_DEFAULT_KEYS = [
  "permit_reference",
  "site_zone",
  "implementing_agency",
  "maintenance_responsible",
] as const;

type DeriveInput = {
  schemeCode?: string | null;
  schemeRefs?: Record<string, string>;
  projectCode?: string;
  projectName?: string;
  segment?: string | null;
  plantationCategory?: string | null;
  existing?: Partial<TreeRegistrationDefaults>;
};

const PLANTATION_CATEGORY_LEGAL: Record<string, { legal_basis: string; land_category: string }> = {
  highway: { legal_basis: "highway_plantation", land_category: "highway_row" },
  forest_ca: { legal_basis: "compensatory_afforestation", land_category: "forest" },
  municipal: { legal_basis: "urban_greening", land_category: "urban" },
  other_government: { legal_basis: "other", land_category: "govt_land" },
};

const SEGMENT_LEGAL: Record<string, { legal_basis: string; land_category: string }> = {
  nhai_highway: { legal_basis: "highway_plantation", land_category: "highway_row" },
  nagar_van_urban: { legal_basis: "urban_greening", land_category: "urban" },
  sahakar_van_coop: { legal_basis: "other", land_category: "govt_land" },
  township_landscape: { legal_basis: "urban_greening", land_category: "urban" },
  industrial_greenbelt: { legal_basis: "other", land_category: "govt_land" },
  ngo_watershed: { legal_basis: "other", land_category: "govt_land" },
  general: { legal_basis: "other", land_category: "govt_land" },
};

function applyLegalLandFallbacks(
  defaults: TreeRegistrationDefaults,
  input: DeriveInput,
): TreeRegistrationDefaults {
  const next = { ...defaults };
  const category = input.plantationCategory;
  if (category && PLANTATION_CATEGORY_LEGAL[category]) {
    const pair = PLANTATION_CATEGORY_LEGAL[category];
    next.legal_basis = next.legal_basis ?? pair.legal_basis;
    next.land_category = next.land_category ?? pair.land_category;
  }
  const segment = input.segment;
  if (segment && SEGMENT_LEGAL[segment]) {
    const pair = SEGMENT_LEGAL[segment];
    next.legal_basis = next.legal_basis ?? pair.legal_basis;
    next.land_category = next.land_category ?? pair.land_category;
    if (segment === "nhai_highway") {
      next.implementing_agency = next.implementing_agency || "NHAI / contractor";
    }
  }
  return next;
}

/** Derive tree registration defaults from scheme refs (used in wizard step 3). */
export function deriveTreeRegistrationDefaults(input: DeriveInput): TreeRegistrationDefaults {
  const refs = input.schemeRefs ?? {};
  const existing = input.existing ?? {};

  const defaults: TreeRegistrationDefaults = {
    permit_reference: existing.permit_reference ?? "",
    site_zone: existing.site_zone ?? "",
    implementing_agency: existing.implementing_agency ?? "",
    maintenance_responsible: existing.maintenance_responsible ?? "",
    legal_basis: existing.legal_basis,
    land_category: existing.land_category,
  };

  const scheme = input.schemeCode;

  if (scheme === "campa_ca") {
    defaults.legal_basis = defaults.legal_basis ?? "compensatory_afforestation";
    defaults.land_category = defaults.land_category ?? "forest";
    defaults.permit_reference =
      defaults.permit_reference || refs.pca_number || refs.forest_diversion_id || "";
    defaults.site_zone =
      defaults.site_zone || refs.ca_land_parcel_id || refs.state_name || "";
    defaults.implementing_agency =
      defaults.implementing_agency || refs.state_campa_account || refs.state_name || "";
  } else if (scheme === "nagar_van") {
    defaults.legal_basis = defaults.legal_basis ?? "urban_greening";
    defaults.land_category = defaults.land_category ?? "urban";
    defaults.permit_reference =
      defaults.permit_reference || refs.nagar_van_project_id || "";
    defaults.site_zone = defaults.site_zone || refs.urban_forest_name || refs.ulb_name || "";
    defaults.implementing_agency = defaults.implementing_agency || refs.ulb_name || "";
  } else if (scheme === "nhai_highway") {
    defaults.legal_basis = defaults.legal_basis ?? "highway_plantation";
    defaults.land_category = defaults.land_category ?? "highway_row";
    defaults.permit_reference =
      defaults.permit_reference || refs.nhai_package_code || "";
    defaults.site_zone =
      defaults.site_zone ||
      (refs.highway_number ? `NH ${refs.highway_number}` : "") ||
      refs.nhai_package_code ||
      "";
    defaults.implementing_agency = defaults.implementing_agency || "NHAI / contractor";
  } else if (scheme === "sahakar_van") {
    defaults.legal_basis = defaults.legal_basis ?? "other";
    defaults.land_category = defaults.land_category ?? "govt_land";
    defaults.permit_reference =
      defaults.permit_reference || refs.nccf_project_ref || refs.sahakar_van_project_id || "";
    defaults.site_zone =
      defaults.site_zone || refs.village_name || refs.district || "";
    defaults.implementing_agency =
      defaults.implementing_agency || refs.amul_union_name || refs.cooperative_society_name || "";
  } else {
    defaults.permit_reference =
      defaults.permit_reference ||
      refs.pca_number ||
      refs.forest_diversion_id ||
      refs.nhai_package_code ||
      refs.nagar_van_project_id ||
      "";
    defaults.site_zone =
      defaults.site_zone ||
      refs.ca_land_parcel_id ||
      refs.village_name ||
      refs.ulb_name ||
      refs.state_name ||
      "";
    defaults.implementing_agency =
      defaults.implementing_agency ||
      refs.state_campa_account ||
      refs.amul_union_name ||
      refs.ulb_name ||
      refs.state_name ||
      "";
  }

  defaults.maintenance_responsible =
    defaults.maintenance_responsible ||
    defaults.implementing_agency ||
    refs.state_campa_account ||
    refs.state_name ||
    input.projectName ||
    "";

  if (!defaults.permit_reference && input.projectCode) {
    defaults.permit_reference = input.projectCode;
  }
  if (!defaults.site_zone && input.projectName) {
    defaults.site_zone = input.projectName;
  }

  return applyLegalLandFallbacks(defaults, input);
}

export function treeRegistrationDefaultsFromProject(
  project: PlantingProject,
): TreeRegistrationDefaults {
  const stored = project.metadata?.tree_registration_defaults as
    | Partial<TreeRegistrationDefaults>
    | undefined;
  const refs = (project.metadata?.scheme_refs as Record<string, string> | undefined) ?? {};
  return deriveTreeRegistrationDefaults({
    schemeCode: project.scheme_code,
    schemeRefs: refs,
    projectCode: project.code,
    projectName: project.name,
    segment: project.segment,
    plantationCategory:
      (project.metadata?.plantation_category as string | undefined) ?? null,
    existing: stored,
  });
}

export function validateTreeRegistrationDefaults(
  defaults: TreeRegistrationDefaults,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const key of TREE_REGISTRATION_DEFAULT_KEYS) {
    if (!defaults[key]?.trim()) {
      errors[key] = "Required for every tree registered in this project";
    }
  }
  return errors;
}

export function treeDefaultsToMetadata(
  defaults: TreeRegistrationDefaults,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of TREE_REGISTRATION_DEFAULT_KEYS) {
    const value = defaults[key]?.trim();
    if (value) out[key] = value;
  }
  if (defaults.legal_basis) out.legal_basis = defaults.legal_basis;
  if (defaults.land_category) out.land_category = defaults.land_category;
  return out;
}

/** Merge project defaults into tree create payload metadata (client-side safety net). */
export function enrichTreePayloadMetadata(
  metadata: Record<string, unknown> | undefined,
  project: PlantingProject,
  options?: { surveyorName?: string | null },
): Record<string, unknown> {
  const merged = { ...(metadata ?? {}) };
  const defaults = treeRegistrationDefaultsFromProject(project);

  for (const [key, value] of Object.entries(defaults)) {
    if (value == null || String(value).trim() === "") continue;
    const current = merged[key];
    if (current == null || current === "") {
      merged[key] = value;
    }
  }

  merged.project_code = merged.project_code ?? project.code;

  if (defaults.legal_basis && !merged.legal_basis) merged.legal_basis = defaults.legal_basis;
  if (defaults.land_category && !merged.land_category) merged.land_category = defaults.land_category;

  if (!merged.survival_status) merged.survival_status = "live";
  if (options?.surveyorName && !merged.surveyor_name) {
    merged.surveyor_name = options.surveyorName;
  }
  if (!merged.maintenance_responsible && defaults.maintenance_responsible) {
    merged.maintenance_responsible = defaults.maintenance_responsible;
  }

  return merged;
}
