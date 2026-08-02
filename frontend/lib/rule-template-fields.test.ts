import { describe, expect, it } from "vitest";
import {
  buildEditableRules,
  diffOverrideKeys,
  fieldsForTemplate,
  setNestedValue,
  textToSpeciesList,
} from "./rule-template-fields";

const nagarDefaults = {
  spacing_m: { min: 2.5, warn_below: 2.0 },
  pit_size_cm: { length: 45, width: 45, depth: 45 },
  max_gps_accuracy_m: 10,
  min_photos: 2,
  guard_type_required: true,
  layout_pattern: "cluster",
  allowed_species: null,
  species_native_pct_min: 80,
  planting_density_per_ha: { min: 800, max: 5000 },
  require_pit_photo: false,
  chainage_enabled: false,
  min_trees_project: 10000,
};

describe("rule-template-fields", () => {
  it("lists fields that exist on the template", () => {
    const fields = fieldsForTemplate(nagarDefaults);
    expect(fields.some((f) => f.path === "spacing_m.min")).toBe(true);
    expect(fields.some((f) => f.path === "chainage_enabled")).toBe(true);
  });

  it("tracks changed keys against defaults", () => {
    const edited = setNestedValue(nagarDefaults, "spacing_m.min", 3);
    const changed = diffOverrideKeys(nagarDefaults, edited);
    expect(changed).toContain("spacing_m");
  });

  it("builds editable rules from merged source", () => {
    const rules = buildEditableRules(nagarDefaults, {
      ...nagarDefaults,
      species_native_pct_min: 85,
    });
    expect(rules.species_native_pct_min).toBe(85);
  });

  it("parses species list text", () => {
    expect(textToSpeciesList("Neem\n\nPeepal")).toEqual(["Neem", "Peepal"]);
    expect(textToSpeciesList("   ")).toBeNull();
  });
});
