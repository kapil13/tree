import { describe, expect, it } from "vitest";
import {
  planPortfolioScopeSync,
  resolvePortfolioProjectName,
} from "./portfolio-project-scope";

describe("planPortfolioScopeSync", () => {
  it("syncs context from URL when they differ", () => {
    expect(planPortfolioScopeSync("proj-url", "proj-ctx", "overview")).toEqual({
      setContextProjectId: "proj-url",
    });
  });

  it("adds project to URL when context is set but URL is not", () => {
    expect(planPortfolioScopeSync(null, "proj-1", "monitoring")).toEqual({
      replaceHref: "/portfolio-health?tab=monitoring&project=proj-1",
    });
  });

  it("clears project from URL when context is cleared", () => {
    expect(planPortfolioScopeSync("proj-1", null, "compliance")).toEqual({
      replaceHref: "/portfolio-health?tab=compliance",
    });
  });

  it("does nothing when URL and context already match", () => {
    expect(planPortfolioScopeSync("proj-1", "proj-1", "overview")).toEqual({});
    expect(planPortfolioScopeSync(null, null, "overview")).toEqual({});
  });
});

describe("resolvePortfolioProjectName", () => {
  it("prefers selected project when ids match", () => {
    expect(
      resolvePortfolioProjectName(
        "p1",
        [{ id: "p2", name: "Other" }],
        { id: "p1", name: "Selected" },
      ),
    ).toBe("Selected");
  });

  it("falls back to projects list", () => {
    expect(
      resolvePortfolioProjectName("p2", [{ id: "p2", name: "From list" }], undefined),
    ).toBe("From list");
  });
});
