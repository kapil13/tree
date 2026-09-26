import { describe, expect, it } from "vitest";
import type { AudiencePreset } from "@/lib/audience";
import {
  audienceContextFromPreset,
  audienceOnboardingStepHref,
  dashboardWidgetsForHighlights,
  defaultProjectSelection,
  shouldShowDashboardWidget,
} from "@/lib/audience-journey";

const corporatePreset: AudiencePreset = {
  code: "corporate_esg",
  label: "Corporate ESG",
  description: "CSR",
  recommended_program_code: "corporate_esg",
  recommended_scheme_codes: ["green_credit_india", "estate_monitoring"],
  recommended_template_code: "industrial_greenbelt_v1",
  recommended_segment: "industrial_greenbelt",
  checklist_codes: ["esg_general"],
  dashboard_highlights: ["brsr", "portfolio", "exports"],
};

describe("audience-journey Phase C", () => {
  it("selects default project from preset", () => {
    expect(defaultProjectSelection(corporatePreset, ["corporate_esg"])).toEqual({
      program_code: "corporate_esg",
      scheme_code: "green_credit_india",
      template_code: "industrial_greenbelt_v1",
      segment: "industrial_greenbelt",
    });
  });

  it("maps dashboard highlights to widgets", () => {
    const widgets = dashboardWidgetsForHighlights(["brsr", "unknown", "exports"]);
    expect(widgets).toEqual(["brsr", "exports"]);
  });

  it("builds audience context from preset", () => {
    const context = audienceContextFromPreset(
      {
        id: "u1",
        email: "x@example.com",
        full_name: "Test",
        role: "corporate",
        organization_id: "o1",
        audience: "corporate_esg",
        enrolled_program_codes: ["corporate_esg"],
      },
      corporatePreset,
    );
    expect(context.dashboard_highlights).toContain("brsr");
    expect(context.default_project.scheme_code).toBe("green_credit_india");
  });

  it("exposes audience onboarding step links", () => {
    expect(audienceOnboardingStepHref("mining")).toBe("/reports?tab=brsr");
    expect(audienceOnboardingStepHref("ngo_community")).toBe("/projects/new");
  });

  it("gates dashboard widgets by highlight keys", () => {
    expect(shouldShowDashboardWidget(["brsr", "portfolio"], "brsr")).toBe(true);
    expect(shouldShowDashboardWidget(["survival"], "brsr")).toBe(false);
  });
});
