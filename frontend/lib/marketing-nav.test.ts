import { describe, expect, it } from "vitest";

import { MARKETING_HEADER_NAV } from "./marketing-nav";

describe("MARKETING_HEADER_NAV", () => {
  it("includes Contact and Resources top-level links", () => {
    const hrefs = MARKETING_HEADER_NAV.map((item) => item.href);
    expect(hrefs).toContain("/contact");
    expect(hrefs).toContain("/resources");
  });

  it("groups homepage anchors under Platform mega menu", () => {
    const platform = MARKETING_HEADER_NAV.find((item) => item.id === "platform");
    const links = platform?.columns?.flatMap((column) => column.links.map((link) => link.href)) ?? [];
    expect(links).toContain("/#intelligence");
    expect(links).toContain("/#compliance");
  });

  it("lists solution pages under Solutions mega menu", () => {
    const solutions = MARKETING_HEADER_NAV.find((item) => item.id === "solutions");
    expect(solutions?.featured?.href).toBe("/solutions");
    const links = solutions?.columns?.flatMap((column) => column.links.map((link) => link.href)) ?? [];
    expect(links).toContain("/solutions/csr-plantation");
    expect(links).toContain("/solutions/industrial-site-greening");
  });
});
