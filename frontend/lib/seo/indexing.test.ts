import { describe, expect, it } from "vitest";

import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { NOINDEX_METADATA } from "@/lib/seo/noindex";
import { SITE_URL } from "@/lib/seo/site";

const NOINDEX_PREFIXES = [
  "/auth",
  "/login",
  "/signup",
  "/onboarding",
  "/verify",
  "/impact",
  "/p",
  "/dashboard",
  "/settings",
  "/platform",
  "/projects",
  "/intelligence",
  "/trees",
  "/satellite",
  "/field-ops",
  "/monitoring",
  "/portfolio-health",
  "/bioacoustic",
  "/alerts",
  "/assistant",
  "/reports",
  "/map",
  "/tools",
  "/verification",
  "/stewardship",
  "/presentation",
  "/presentationa",
];

describe("search indexing hygiene", () => {
  it("keeps app and auth URLs crawlable so Google can see noindex", () => {
    const rules = robots().rules;
    const rule = Array.isArray(rules) ? rules[0] : rules;
    expect(rule?.disallow).toEqual(["/api/"]);
    expect(robots().sitemap).toBe(`${SITE_URL}/sitemap.xml`);
    expect(NOINDEX_METADATA.robots).toEqual({ index: false, follow: false });
  });

  it("lists only final https://aranyix.tech URLs and omits drafts and app routes", async () => {
    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls).toContain(SITE_URL);
    expect(urls).toContain(`${SITE_URL}/solutions`);
    expect(urls).toContain(`${SITE_URL}/privacy`);
    expect(urls).not.toContain(
      `${SITE_URL}/resources/campa-afforestation-monitoring-india`,
    );

    for (const url of urls) {
      expect(url.startsWith("https://aranyix.tech")).toBe(true);
      expect(url.includes("www.")).toBe(false);
      expect(url.includes("?")).toBe(false);
      expect(url.endsWith("/")).toBe(false);

      const path = url.slice(SITE_URL.length) || "/";
      const blocked = NOINDEX_PREFIXES.some(
        (prefix) => path === prefix || path.startsWith(`${prefix}/`),
      );
      expect(blocked).toBe(false);
    }
  });
});
