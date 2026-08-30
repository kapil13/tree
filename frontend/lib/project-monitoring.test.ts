import { describe, expect, it } from "vitest";
import {
  isMonitoringOnlyProject,
  isSatelliteWatchEnabled,
  SATELLITE_WATCH_METADATA_KEY,
} from "./project-monitoring";

describe("project-monitoring", () => {
  it("treats estate_monitoring as monitoring-only and always watched", () => {
    const project = { scheme_code: "estate_monitoring", metadata: {} };
    expect(isMonitoringOnlyProject(project)).toBe(true);
    expect(isSatelliteWatchEnabled(project)).toBe(true);
  });

  it("allows planting schemes to opt into satellite watch", () => {
    const project = {
      scheme_code: "campa_ca",
      metadata: { [SATELLITE_WATCH_METADATA_KEY]: true },
    };
    expect(isMonitoringOnlyProject(project)).toBe(false);
    expect(isSatelliteWatchEnabled(project)).toBe(true);
  });

  it("defaults planting schemes to satellite watch off", () => {
    const project = { scheme_code: "nagar_van", metadata: {} };
    expect(isSatelliteWatchEnabled(project)).toBe(false);
  });
});
