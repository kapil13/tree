export type PlantingAudience =
  | "mining"
  | "corporate_esg"
  | "government"
  | "international"
  | "general";

export type AudiencePreset = {
  code: PlantingAudience;
  label: string;
  description: string;
  recommended_program_code: string;
  recommended_scheme_codes: string[];
  recommended_template_code: string | null;
  recommended_segment: string;
  checklist_codes: string[];
  dashboard_highlights: string[];
};

export const PLANTING_AUDIENCE_LABEL: Record<PlantingAudience, string> = {
  mining: "Mining & industrial reclamation",
  corporate_esg: "Corporate ESG",
  government: "Government & public sector",
  international: "International carbon & standards",
  general: "General plantation",
};

export function resolvePlantingAudience(
  audience: string | null | undefined,
): PlantingAudience {
  if (
    audience === "mining" ||
    audience === "corporate_esg" ||
    audience === "government" ||
    audience === "international"
  ) {
    return audience;
  }
  return "general";
}

export function audienceQuickLinks(audience: PlantingAudience): { label: string; href: string }[] {
  switch (audience) {
    case "mining":
      return [
        { label: "New greenbelt project", href: "/projects/new" },
        { label: "Satellite watch", href: "/satellite" },
        { label: "Compliance exports", href: "/reports" },
      ];
    case "corporate_esg":
      return [
        { label: "BRSR exports", href: "/reports?tab=brsr" },
        { label: "Portfolio compliance", href: "/reports?tab=portfolio" },
        { label: "New CSR project", href: "/projects/new" },
      ];
    case "government":
      return [
        { label: "New scheme project", href: "/projects/new" },
        { label: "Plantation reports", href: "/reports/plantation/project-wise" },
        { label: "Field operations", href: "/field-ops" },
      ];
    case "international":
      return [
        { label: "Carbon & credits", href: "/reports?tab=credits" },
        { label: "Compliance frameworks", href: "/reports?tab=compliance" },
        { label: "New carbon project", href: "/projects/new" },
      ];
    default:
      return [
        { label: "Register trees", href: "/trees/new" },
        { label: "Projects", href: "/projects" },
        { label: "Reports", href: "/reports" },
      ];
  }
}
