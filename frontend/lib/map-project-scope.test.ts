import { describe, expect, it } from "vitest";
import { planMapScopeSync } from "./map-project-scope";

describe("planMapScopeSync", () => {
  it("adds project to URL when context is set but URL is not", () => {
    expect(planMapScopeSync(null, "proj-1")).toEqual({
      replaceHref: "/map?project=proj-1",
    });
  });

  it("clears project from URL when context is cleared", () => {
    expect(planMapScopeSync("proj-1", null)).toEqual({
      replaceHref: "/map",
    });
  });

  it("updates URL when chip selects a different project", () => {
    expect(planMapScopeSync("proj-url", "proj-ctx")).toEqual({
      replaceHref: "/map?project=proj-ctx",
    });
  });

  it("preserves tree deep link when syncing project scope", () => {
    expect(planMapScopeSync(null, "proj-1", { treeId: "tree-1" })).toEqual({
      replaceHref: "/map?project=proj-1&tree=tree-1",
    });
    expect(planMapScopeSync("proj-1", null, { treeId: "tree-1" })).toEqual({
      replaceHref: "/map?tree=tree-1",
    });
  });
});
