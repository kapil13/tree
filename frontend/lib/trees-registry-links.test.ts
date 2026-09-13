import { describe, expect, it } from "vitest";
import {
  parseTreesRegistryCategory,
  survivalDueTreesHref,
  treesRegistryHref,
} from "./trees-registry-links";

describe("treesRegistryHref", () => {
  it("builds filtered registry links", () => {
    expect(treesRegistryHref()).toBe("/trees");
    expect(
      treesRegistryHref({ projectId: "p1", category: "geotag_due" }),
    ).toBe("/trees?project=p1&category=geotag_due");
  });
});

describe("survivalDueTreesHref", () => {
  it("links to the first due tree when known", () => {
    expect(survivalDueTreesHref("p1", "t9")).toBe("/trees/t9#survival");
  });

  it("falls back to geotag-due filter", () => {
    expect(survivalDueTreesHref("p1")).toBe("/trees?project=p1&category=geotag_due");
  });
});

describe("parseTreesRegistryCategory", () => {
  it("accepts known categories only", () => {
    expect(parseTreesRegistryCategory("geotag_due")).toBe("geotag_due");
    expect(parseTreesRegistryCategory("invalid")).toBe("");
  });
});
