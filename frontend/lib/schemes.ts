import type { ComplianceMode, ProjectSegment } from "@/lib/api";

export type CentralSchemeGroup = "central" | "convergence" | "corporate" | "cooperative";

export type CentralScheme = {
  code: string;
  label: string;
  description: string;
  ministry: string;
  group: CentralSchemeGroup;
  program_codes: string[];
  default_segment: ProjectSegment;
  default_compliance_mode: ComplianceMode;
  default_template_code: string | null;
  checklist_codes: string[];
  framework_profiles: string[];
  convergence_allowed: string[];
  legacy_plantation_category: string | null;
  kpi_targets: {
    survival_pct_min?: number | null;
    geo_tagged_pct_min?: number | null;
    min_trees?: number | null;
  };
  metadata_sections: Record<string, unknown>[];
};

export const SCHEME_GROUP_LABEL: Record<CentralSchemeGroup, string> = {
  central: "Central government schemes",
  convergence: "Convergence programmes",
  corporate: "Corporate & green credit",
  cooperative: "Cooperative programmes",
};

export function schemeByCode(
  schemes: CentralScheme[] | undefined,
  code: string | null | undefined,
): CentralScheme | undefined {
  if (!code || !schemes) return undefined;
  return schemes.find((scheme) => scheme.code === code);
}

export function schemesForProgram(
  schemes: CentralScheme[],
  programCode: string,
): CentralScheme[] {
  return schemes.filter((scheme) => scheme.program_codes.includes(programCode));
}

/** Local-only project types without a central scheme tag (corporate CSR sites). */
export const FLEX_PROJECT_OPTIONS = [
  {
    code: "corporate_esg_flex",
    label: "Corporate ESG / CSR plantation",
    hint: "Mine belts, factory green buffers, CSR sites without Green Credit registration",
    segment: "industrial_greenbelt" as ProjectSegment,
    programCode: "corporate_esg",
    complianceMode: "strict" as ComplianceMode,
    group: "other" as const,
  },
] as const;

export type FlexProjectCode = (typeof FLEX_PROJECT_OPTIONS)[number]["code"];
