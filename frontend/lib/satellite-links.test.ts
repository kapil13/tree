import { describe, expect, it } from "vitest";
import { parseSatelliteSearchParams, satelliteHref } from "./satellite-links";

describe("satellite-links", () => {
  it("builds href with fence and project", () => {
    expect(
      satelliteHref({ fenceId: "abc", projectId: "proj-1" }),
    ).toBe("/satellite?fence=abc&project=proj-1");
  });

  it("parses fence aliases and project params", () => {
    const params = new URLSearchParams("work_area_id=wa1&project=proj-2");
    expect(parseSatelliteSearchParams(params)).toEqual({
      fenceId: "wa1",
      projectId: "proj-2",
    });
  });
});
