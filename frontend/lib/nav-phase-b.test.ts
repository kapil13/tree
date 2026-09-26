import { describe, expect, it } from "vitest";
import {
  complianceAnchorToSection,
  portfolioComplianceHref,
  projectComplianceHref,
} from "./compliance-links";
import { parseReportTab, reportTabHref } from "./report-tabs";
import { projectTabHref } from "./compliance-gap-actions";

describe("report-tabs", () => {
  it("parses known report tabs from query params", () => {
    expect(parseReportTab("brsr")).toBe("brsr");
    expect(parseReportTab("etfHandoff")).toBe("etfHandoff");
    expect(parseReportTab("unknown")).toBeNull();
  });

  it("builds canonical report tab hrefs", () => {
    expect(reportTabHref("standard")).toBe("/reports");
    expect(reportTabHref("gbf")).toBe("/reports?tab=gbf");
  });
});

describe("compliance-links", () => {
  it("builds portfolio and project compliance hrefs", () => {
    expect(portfolioComplianceHref()).toBe("/portfolio-health?tab=compliance");
    expect(projectComplianceHref("proj-1")).toBe("/projects/proj-1/compliance");
    expect(projectComplianceHref("proj-1", "issues")).toBe(
      "/projects/proj-1/compliance?section=issues",
    );
  });

  it("maps legacy anchors to section ids", () => {
    expect(complianceAnchorToSection("violations")).toBe("issues");
    expect(complianceAnchorToSection("checklist")).toBe("checklist");
  });
});

describe("compliance gap hrefs", () => {
  it("deep-links violation gaps to compliance issues section", () => {
    expect(projectTabHref("proj-1", "compliance", "violations")).toBe(
      "/projects/proj-1/compliance?section=issues",
    );
  });
});
