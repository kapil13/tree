import { describe, expect, it } from "vitest";

/** Mirrors clustering cell logic for unit coverage without Google Maps. */
function clusterCount(itemCount: number, zoom: number): number {
  if (zoom >= 13 || itemCount <= 40) return itemCount;
  // Coarser clustering when zoomed out — at least one cluster if items exist
  return Math.max(1, Math.ceil(itemCount / (zoom >= 11 ? 8 : zoom >= 9 ? 20 : 50)));
}

describe("map scale UX helpers", () => {
  it("does not cluster when zoomed in", () => {
    expect(clusterCount(100, 14)).toBe(100);
  });

  it("reduces markers when zoomed out", () => {
    expect(clusterCount(200, 8)).toBeLessThan(200);
  });
});
