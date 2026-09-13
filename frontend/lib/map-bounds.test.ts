import { describe, expect, it } from "vitest";
import {
  MAP_MIN_ZOOM,
  boundsFromTrees,
  centroidFromTrees,
  clampMapZoom,
  hasValidCoords,
  isBootstrapTruncated,
  mergeTreesById,
  treesWithValidCoords,
} from "./map-bounds";

describe("hasValidCoords", () => {
  it("accepts finite coordinates", () => {
    expect(hasValidCoords({ latitude: 26.88, longitude: 75.74 })).toBe(true);
  });

  it("rejects non-finite coordinates", () => {
    expect(hasValidCoords({ latitude: NaN, longitude: 75.74 })).toBe(false);
  });
});

describe("boundsFromTrees", () => {
  it("returns null when no valid trees", () => {
    expect(boundsFromTrees([])).toBeNull();
    expect(boundsFromTrees([{ latitude: NaN, longitude: 1 }])).toBeNull();
  });

  it("computes bounds for multiple trees", () => {
    expect(
      boundsFromTrees([
        { latitude: 26.88, longitude: 75.74 },
        { latitude: 28.61, longitude: 77.21 },
      ]),
    ).toEqual({
      north: 28.61,
      south: 26.88,
      east: 77.21,
      west: 75.74,
    });
  });

  it("computes bounds for a single tree", () => {
    expect(boundsFromTrees([{ latitude: 26.88, longitude: 75.74 }])).toEqual({
      north: 26.88,
      south: 26.88,
      east: 75.74,
      west: 75.74,
    });
  });
});

describe("clampMapZoom", () => {
  it("caps zoomed-out portfolios at the minimum zoom", () => {
    expect(clampMapZoom(3)).toBe(MAP_MIN_ZOOM);
    expect(clampMapZoom(8)).toBe(8);
    expect(clampMapZoom(null)).toBeNull();
  });
});

describe("isBootstrapTruncated", () => {
  it("detects when the bootstrap page size is exceeded", () => {
    expect(isBootstrapTruncated(150)).toBe(false);
    expect(isBootstrapTruncated(151)).toBe(true);
  });
});

describe("centroidFromTrees", () => {
  it("averages valid coordinates", () => {
    expect(
      centroidFromTrees([
        { latitude: 10, longitude: 20 },
        { latitude: 20, longitude: 40 },
      ]),
    ).toEqual({ lat: 15, lng: 30 });
  });
});

describe("mergeTreesById", () => {
  it("deduplicates by id and prefers later groups", () => {
    const merged = mergeTreesById(
      [{ id: "a", name: "old" }],
      [{ id: "a", name: "new" }, { id: "b", name: "two" }],
    );
    expect(merged).toEqual([
      { id: "a", name: "new" },
      { id: "b", name: "two" },
    ]);
  });
});

describe("treesWithValidCoords", () => {
  it("filters invalid points", () => {
    expect(
      treesWithValidCoords([
        { latitude: 1, longitude: 2 },
        { latitude: NaN, longitude: 2 },
      ]),
    ).toHaveLength(1);
  });
});
