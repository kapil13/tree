import { describe, expect, it } from "vitest";
import { formatAnalysisConfidence, formatAnalysisLabel } from "./tree-analysis-display";

describe("tree-analysis-display", () => {
  it("formats confidence as a percentage", () => {
    expect(formatAnalysisConfidence(0.823)).toBe("82%");
    expect(formatAnalysisConfidence(null)).toBe("—");
  });

  it("humanizes snake_case labels", () => {
    expect(formatAnalysisLabel("leaf_spot")).toBe("Leaf Spot");
    expect(formatAnalysisLabel("disease_risk")).toBe("Disease Risk");
  });
});
