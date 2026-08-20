import { describe, expect, it } from "vitest";
import {
  parseProjectSecondaryTab,
  PROJECT_FOCUSED_LAYOUT_MARKER,
  PROJECT_SECONDARY_TABS,
} from "./project-focused-ui";

describe("project-focused-ui", () => {
  it("parses secondary tabs and ignores legacy overview/trees URLs", () => {
    expect(parseProjectSecondaryTab("compliance")).toBe("compliance");
    expect(parseProjectSecondaryTab("overview")).toBeNull();
    expect(parseProjectSecondaryTab("trees")).toBeNull();
    expect(parseProjectSecondaryTab(null)).toBeNull();
    expect(PROJECT_SECONDARY_TABS).toEqual([
      "compliance",
      "credits",
      "team",
      "settings",
    ]);
  });

  it("exposes a stable layout marker for deploy checks", () => {
    expect(PROJECT_FOCUSED_LAYOUT_MARKER).toBe("project-focused-layout-v1");
  });
});
