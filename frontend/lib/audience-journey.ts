import type { User } from "@/lib/api";
import type { AudiencePreset, PlantingAudience } from "@/lib/audience";
import { resolvePlantingAudience } from "@/lib/audience";

export type DashboardHighlight =
  | "brsr"
  | "portfolio"
  | "exports"
  | "greenbelt"
  | "closure"
  | "satellite"
  | "schemes"
  | "survival"
  | "geo_tag"
  | "mgnrega"
  | "community"
  | "credits"
  | "evidence"
  | "compliance"
  | "trees"
  | "map"
  | "reports";

export type DefaultProjectSelection = {
  program_code?: string;
  scheme_code?: string | null;
  template_code?: string | null;
  segment?: string;
};

export type SchemeRecommendation = {
  code: string;
  label: string;
  group: string;
  default_segment: string;
  default_template_code: string | null;
  checklist_codes: string[];
  state_codes: string[];
  primary: boolean;
};

export type JourneyStep = {
  id: string;
  title: string;
  description: string;
  href: string;
};

export type AudienceContext = {
  audience: PlantingAudience;
  preset: AudiencePreset | null;
  enrolled_program_codes: string[];
  default_project: DefaultProjectSelection;
  dashboard_highlights: DashboardHighlight[];
  scheme_recommendations?: SchemeRecommendation[];
  state_schemes?: SchemeRecommendation[];
  fra_required?: boolean;
  fra_guidance?: string | null;
  journey_steps?: JourneyStep[];
};

export function defaultProjectSelection(
  preset: AudiencePreset | null,
  enrolledProgramCodes: string[] = [],
): DefaultProjectSelection {
  if (!preset) return {};

  let programCode = preset.recommended_program_code;
  if (
    enrolledProgramCodes.length > 0 &&
    !enrolledProgramCodes.includes(programCode) &&
    enrolledProgramCodes.some((code) => code !== "byot")
  ) {
    programCode =
      enrolledProgramCodes.find((code) => code !== "byot") ?? enrolledProgramCodes[0];
  }

  return {
    program_code: programCode,
    scheme_code: preset.recommended_scheme_codes[0] ?? null,
    template_code: preset.recommended_template_code,
    segment: preset.recommended_segment,
  };
}

export function dashboardWidgetsForHighlights(
  highlights: string[] | undefined,
): DashboardHighlight[] {
  const allowed = new Set<DashboardHighlight>([
    "brsr",
    "portfolio",
    "exports",
    "greenbelt",
    "closure",
    "satellite",
    "schemes",
    "survival",
    "geo_tag",
    "mgnrega",
    "community",
    "credits",
    "evidence",
    "compliance",
    "trees",
    "map",
    "reports",
  ]);
  const out: DashboardHighlight[] = [];
  for (const key of highlights ?? []) {
    if (allowed.has(key as DashboardHighlight)) {
      out.push(key as DashboardHighlight);
    }
  }
  return out.length ? out : ["trees", "map", "reports"];
}

export function audienceContextFromPreset(
  user: User | null | undefined,
  preset: AudiencePreset | null,
): AudienceContext {
  const audience = resolvePlantingAudience(user?.audience);
  const enrolled = user?.enrolled_program_codes ?? [];
  return {
    audience,
    preset,
    enrolled_program_codes: enrolled,
    default_project: defaultProjectSelection(preset, enrolled),
    dashboard_highlights: dashboardWidgetsForHighlights(preset?.dashboard_highlights),
  };
}

export function shouldShowDashboardWidget(
  highlights: DashboardHighlight[],
  keys: DashboardHighlight | DashboardHighlight[],
): boolean {
  const wanted = Array.isArray(keys) ? keys : [keys];
  return wanted.some((key) => highlights.includes(key));
}

export function audienceOnboardingStepHref(audience: PlantingAudience): string | null {
  switch (audience) {
    case "government":
      return "/projects/new";
    case "corporate_esg":
    case "mining":
      return "/reports?tab=brsr";
    case "ngo_community":
      return "/projects/new";
    case "international":
      return "/reports?tab=compliance";
    default:
      return null;
  }
}

export function audienceOnboardingStepLabel(audience: PlantingAudience): string | null {
  switch (audience) {
    case "government":
      return "Create your first scheme project";
    case "corporate_esg":
      return "Start BRSR Principle 6 evidence";
    case "mining":
      return "Record closure baseline on a greenbelt project";
    case "ngo_community":
      return "Configure MGNREGA convergence project";
    case "international":
      return "Open compliance framework exports";
    default:
      return null;
  }
}
