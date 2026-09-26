import { describe, expect, it } from "vitest";
import { mapHref, mapHrefForTree } from "./map-links";

describe("mapHref", () => {
  it("returns bare map path by default", () => {
    expect(mapHref()).toBe("/map");
    expect(mapHref({})).toBe("/map");
  });

  it("includes project filter", () => {
    expect(mapHref({ projectId: "proj-1" })).toBe("/map?project=proj-1");
  });

  it("includes tree deep link", () => {
    expect(mapHref({ treeId: "tree-1" })).toBe("/map?tree=tree-1");
  });

  it("combines project and tree params", () => {
    expect(mapHref({ projectId: "proj-1", treeId: "tree-1" })).toBe(
      "/map?project=proj-1&tree=tree-1",
    );
  });

  it("includes coordinate fallback", () => {
    expect(mapHref({ lat: 26.876, lng: 75.744 })).toBe("/map?lat=26.876&lng=75.744");
  });
});

describe("mapHrefForTree", () => {
  it("builds a tree deep link with optional project and coords", () => {
    expect(
      mapHrefForTree({
        id: "tree-1",
        project_id: "proj-1",
        latitude: 26.876,
        longitude: 75.744,
      }),
    ).toBe("/map?project=proj-1&tree=tree-1&lat=26.876&lng=75.744");
  });
});
