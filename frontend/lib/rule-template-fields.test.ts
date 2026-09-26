import { describe, expect, it } from "vitest";
import {
  wizardRulesDifferFromBase,
  wizardSiteRuleFields,
} from "./rule-template-fields";

const campaRules = {
  spacing_m: { min: 3, warn_below: 2.5 },
  pit_size_cm: { length: 45, width: 45, depth: 45 },
  min_photos: 3,
  require_pit_photo: true,
  guard_type_required: true,
};

describe("wizardSiteRuleFields", () => {
  it("returns only high-impact setup fields present in template", () => {
    const fields = wizardSiteRuleFields(campaRules);
    const paths = fields.map((f) => f.path);
    expect(paths).toContain("spacing_m.min");
    expect(paths).toContain("pit_size_cm.length");
    expect(paths).toContain("min_photos");
    expect(paths).toContain("guard_type_required");
    expect(paths).not.toContain("allowed_species");
  });
});

describe("wizardRulesDifferFromBase", () => {
  it("detects spacing changes", () => {
    const edited = {
      ...campaRules,
      spacing_m: { min: 4, warn_below: 2.5 },
    };
    expect(wizardRulesDifferFromBase(campaRules, edited)).toBe(true);
  });

  it("returns false when rules match template", () => {
    expect(wizardRulesDifferFromBase(campaRules, campaRules)).toBe(false);
  });
});
