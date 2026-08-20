import { afterEach, describe, expect, it } from "vitest";
import {
  isProjectFocusedUiEnabled,
  parseProjectSecondaryTab,
  PROJECT_SECONDARY_TABS,
} from "./project-focused-ui";

describe("project-focused-ui", () => {
  const previous = process.env.NEXT_PUBLIC_PROJECT_FOCUSED_UI;

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.NEXT_PUBLIC_PROJECT_FOCUSED_UI;
    } else {
      process.env.NEXT_PUBLIC_PROJECT_FOCUSED_UI = previous;
    }
  });

  it("enables focused UI only when env flag is 1", () => {
    process.env.NEXT_PUBLIC_PROJECT_FOCUSED_UI = "1";
    expect(isProjectFocusedUiEnabled()).toBe(true);
    process.env.NEXT_PUBLIC_PROJECT_FOCUSED_UI = "0";
    expect(isProjectFocusedUiEnabled()).toBe(false);
  });

  it("parses secondary tabs and ignores merged legacy tabs", () => {
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
});
