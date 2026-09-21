import { describe, expect, it } from "vitest";
import {
  getProjectWorkspaceNav,
  parseAuditPhase,
  parseProjectSecondarySegment,
  parseProjectSecondaryTab,
  PROJECT_FOCUSED_LAYOUT_MARKER,
  PROJECT_SECONDARY_TABS,
  projectAuditHref,
  projectOverviewHref,
  projectSecondaryHref,
  resolveLegacyProjectTabHref,
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

  it("builds sub-route hrefs", () => {
    expect(projectOverviewHref("abc")).toBe("/projects/abc");
    expect(projectAuditHref("abc")).toBe("/projects/abc/audit");
    expect(projectAuditHref("abc", "sampling")).toBe("/projects/abc/audit?phase=sampling");
    expect(projectSecondaryHref("abc", "compliance")).toBe("/projects/abc/compliance");
    expect(parseProjectSecondarySegment("team")).toBe("team");
  });

  it("parses audit phase query values", () => {
    expect(parseAuditPhase("reconciliation")).toBe("reconciliation");
    expect(parseAuditPhase("invalid")).toBeNull();
    expect(parseAuditPhase(null)).toBeNull();
  });

  it("maps legacy ?tab= query values to sub-routes", () => {
    expect(resolveLegacyProjectTabHref("abc", "compliance")).toBe(
      "/projects/abc/compliance",
    );
    expect(resolveLegacyProjectTabHref("abc", "trees")).toBe("/projects/abc");
    expect(resolveLegacyProjectTabHref("abc", "overview")).toBe("/projects/abc");
    expect(resolveLegacyProjectTabHref("abc", null)).toBeNull();
  });

  it("exposes a stable layout marker for deploy checks", () => {
    expect(PROJECT_FOCUSED_LAYOUT_MARKER).toBe("project-focused-layout-v3");
  });

  it("renames credits tab for monitoring programmes", () => {
    const plantingNav = getProjectWorkspaceNav(false);
    const monitoringNav = getProjectWorkspaceNav(true);
    expect(plantingNav.find((item) => item.id === "credits")?.label).toBe("Credits & reports");
    expect(monitoringNav.find((item) => item.id === "credits")?.label).toBe("Reports & sampling");
    expect(monitoringNav.find((item) => item.id === "credits")?.shortLabel).toBe("Reports");
  });
});
