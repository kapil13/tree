import { describe, expect, it } from "vitest";
import { violationActionHref } from "./compliance-violation-links";

describe("violationActionHref", () => {
  it("links tree violations to the tree record", () => {
    expect(violationActionHref("p1", "t9")).toBe("/trees/t9");
  });

  it("links project violations to compliance issues", () => {
    expect(violationActionHref("p1")).toBe("/projects/p1/compliance?section=issues");
  });
});
