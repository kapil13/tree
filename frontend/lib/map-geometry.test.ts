import { describe, expect, it } from "vitest";
import { centroidFromPaths, geoJsonToPaths, zoomForPaths } from "./map-geometry";

describe("map-geometry", () => {
  it("computes centroid from geojson polygon", () => {
    const paths = geoJsonToPaths({
      type: "Polygon",
      coordinates: [[[77.5, 12.9], [77.6, 12.9], [77.6, 13.0], [77.5, 13.0], [77.5, 12.9]]],
    });
    const center = centroidFromPaths(paths);
    expect(center).not.toBeNull();
    expect(center!.lat).toBeCloseTo(12.95, 1);
    expect(center!.lng).toBeCloseTo(77.55, 1);
  });

  it("returns tighter zoom for small polygons", () => {
    const small = [
      { lat: 12.971, lng: 77.594 },
      { lat: 12.972, lng: 77.594 },
      { lat: 12.972, lng: 77.595 },
    ];
    const large = [
      { lat: 10, lng: 70 },
      { lat: 11, lng: 71 },
      { lat: 10.5, lng: 72 },
    ];
    expect(zoomForPaths(small)).toBeGreaterThan(zoomForPaths(large));
  });
});
