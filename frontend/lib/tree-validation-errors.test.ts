import { describe, expect, it } from "vitest";
import { humanizeValidationErrors } from "./tree-validation-errors";

describe("humanizeValidationErrors", () => {
  it("maps missing_required to readable text", () => {
    expect(humanizeValidationErrors(["missing_required:species_text"])).toBe(
      "Missing species.",
    );
  });

  it("points inherited fields to project setup in project mode", () => {
    const msg = humanizeValidationErrors(
      ["missing_required:legal_basis", "missing_required:land_category"],
      { projectMode: true, projectId: "proj-1" },
    );
    expect(msg).toContain("Project setup is incomplete");
    expect(msg).toContain("/projects/proj-1/setup");
  });
});
