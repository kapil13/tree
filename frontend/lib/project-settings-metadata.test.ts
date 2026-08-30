import { describe, expect, it } from "vitest";
import { buildProjectMetadata, SATELLITE_WATCH_METADATA_KEY } from "@/lib/project-monitoring";

describe("buildProjectMetadata", () => {
  it("sets satellite_watch_enabled when toggled on", () => {
    const metadata = buildProjectMetadata(
      { metadata: { scheme_refs: { district: "Pune" } } },
      { surveyDays: "30", satelliteWatch: true, monitoringMode: false },
    );
    expect(metadata[SATELLITE_WATCH_METADATA_KEY]).toBe(true);
    expect(metadata.scheme_refs).toEqual({ district: "Pune" });
  });

  it("removes satellite_watch_enabled when toggled off", () => {
    const metadata = buildProjectMetadata(
      { metadata: { [SATELLITE_WATCH_METADATA_KEY]: true } },
      { surveyDays: "30", satelliteWatch: false, monitoringMode: false },
    );
    expect(metadata[SATELLITE_WATCH_METADATA_KEY]).toBeUndefined();
  });
});
