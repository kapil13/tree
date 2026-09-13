import { describe, expect, it } from "vitest";
import { planFieldOpsScopeSync } from "./field-ops-project-scope";

describe("planFieldOpsScopeSync", () => {
  it("adds project to URL when context is set but URL is not", () => {
    expect(planFieldOpsScopeSync(null, "proj-1")).toEqual({
      replaceHref: "/field-ops?project=proj-1",
    });
  });

  it("clears project from URL when context is cleared", () => {
    expect(planFieldOpsScopeSync("proj-1", null)).toEqual({
      replaceHref: "/field-ops",
    });
  });

  it("updates URL when chip selects a different project", () => {
    expect(planFieldOpsScopeSync("proj-url", "proj-ctx")).toEqual({
      replaceHref: "/field-ops?project=proj-ctx",
    });
  });

  it("does nothing when URL and context already match", () => {
    expect(planFieldOpsScopeSync("proj-1", "proj-1")).toEqual({});
    expect(planFieldOpsScopeSync(null, null)).toEqual({});
  });
});
