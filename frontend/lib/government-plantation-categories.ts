import type { ComplianceMode, ProjectSegment } from "@/lib/api";

/** Government scheme types shown before detailed form fields. */
export type GovernmentPlantationCategory =
  | "highway"
  | "forest_ca"
  | "municipal"
  | "other_government";

export const GOVERNMENT_PROGRAM_CODE = "government_nhai";

export type GovernmentCategoryOption = {
  code: GovernmentPlantationCategory;
  label: string;
  hint: string;
  legalBasis: string;
  landCategory: string;
  segment: ProjectSegment;
};

export const GOVERNMENT_PLANTATION_CATEGORIES: GovernmentCategoryOption[] = [
  {
    code: "highway",
    label: "Highway / NHAI plantation",
    hint: "NHAI packages, PWD medians, chainage-based audits",
    legalBasis: "highway_plantation",
    landCategory: "highway_row",
    segment: "nhai_highway",
  },
  {
    code: "forest_ca",
    label: "Forest / compensatory afforestation",
    hint: "Forest department, CAMPA, CA blocks",
    legalBasis: "forest_restoration",
    landCategory: "forest",
    segment: "general",
  },
  {
    code: "municipal",
    label: "Municipal / urban greening",
    hint: "ULB parks, smart city, avenue planting",
    legalBasis: "urban_greening",
    landCategory: "urban",
    segment: "township_landscape",
  },
  {
    code: "other_government",
    label: "Other government scheme",
    hint: "Irrigation, railways, defence, departmental land",
    legalBasis: "other",
    landCategory: "govt_land",
    segment: "general",
  },
];

export type ProjectSchemeType = GovernmentPlantationCategory | "industrial" | "ngo" | "general";

export type ProjectSchemeOption = {
  code: ProjectSchemeType;
  label: string;
  hint: string;
  segment: ProjectSegment;
  programCode: string;
  complianceMode: ComplianceMode;
  group: "government" | "other";
  plantationCategory?: GovernmentPlantationCategory;
};

export const PROJECT_SCHEME_OPTIONS: ProjectSchemeOption[] = [
  ...GOVERNMENT_PLANTATION_CATEGORIES.map((category) => ({
    code: category.code as ProjectSchemeType,
    label: category.label,
    hint: category.hint,
    segment: category.segment,
    programCode: GOVERNMENT_PROGRAM_CODE,
    complianceMode: "strict" as ComplianceMode,
    group: "government" as const,
    plantationCategory: category.code,
  })),
  {
    code: "industrial",
    label: "Industrial / mine green belt",
    hint: "Factory, cement, mining compensatory belts",
    segment: "industrial_greenbelt",
    programCode: "corporate_esg",
    complianceMode: "strict",
    group: "other",
  },
  {
    code: "ngo",
    label: "NGO / watershed",
    hint: "Community plots, farmer groups, watershed work",
    segment: "ngo_watershed",
    programCode: "ngo_community",
    complianceMode: "guided",
    group: "other",
  },
  {
    code: "general",
    label: "General plantation",
    hint: "Flexible boundaries without a fixed scheme template",
    segment: "general",
    programCode: GOVERNMENT_PROGRAM_CODE,
    complianceMode: "strict",
    group: "other",
  },
];

export function governmentCategoryByCode(
  code: GovernmentPlantationCategory | null | undefined,
): GovernmentCategoryOption | undefined {
  if (!code) return undefined;
  return GOVERNMENT_PLANTATION_CATEGORIES.find((item) => item.code === code);
}

export function projectSchemeByCode(
  code: ProjectSchemeType | null | undefined,
): ProjectSchemeOption | undefined {
  if (!code) return undefined;
  return PROJECT_SCHEME_OPTIONS.find((item) => item.code === code);
}

export function inferGovernmentCategory(values: Record<string, string | number | boolean>): GovernmentPlantationCategory | null {
  const legalBasis = String(values.legal_basis ?? "");
  const landCategory = String(values.land_category ?? "");

  for (const category of GOVERNMENT_PLANTATION_CATEGORIES) {
    if (category.legalBasis === legalBasis && category.landCategory === landCategory) {
      return category.code;
    }
  }

  if (legalBasis === "compensatory_afforestation" && landCategory === "forest") {
    return "forest_ca";
  }

  return null;
}

export function applyGovernmentCategoryToValues(
  values: Record<string, string | number | boolean>,
  category: GovernmentPlantationCategory,
): Record<string, string | number | boolean> {
  const option = governmentCategoryByCode(category);
  if (!option) return values;
  return {
    ...values,
    legal_basis: option.legalBasis,
    land_category: option.landCategory,
    plantation_category: category,
  };
}

export function shouldShowHighwaySection(
  category: GovernmentPlantationCategory | null | undefined,
): boolean {
  return category === "highway";
}
