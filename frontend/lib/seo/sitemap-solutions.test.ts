import { describe, expect, it } from "vitest";

import sitemap from "@/app/sitemap";
import { SITE_URL } from "@/lib/seo/site";

describe("sitemap solutions hub", () => {
  it("lists /solutions and the live child solution URLs", async () => {
    const entries = await sitemap();
    const solutionUrls = entries
      .map((entry) => entry.url)
      .filter((url) => url.startsWith(`${SITE_URL}/solutions`))
      .sort();

    expect(solutionUrls).toEqual(
      [
        `${SITE_URL}/solutions`,
        `${SITE_URL}/solutions/brsr-esg`,
        `${SITE_URL}/solutions/campa-afforestation`,
        `${SITE_URL}/solutions/csr-plantation`,
        `${SITE_URL}/solutions/industrial-site-greening`,
        `${SITE_URL}/solutions/mining-greening`,
      ].sort(),
    );

    const hub = entries.find((entry) => entry.url === `${SITE_URL}/solutions`);
    expect(hub).toMatchObject({
      changeFrequency: "monthly",
      priority: 0.85,
    });
  });
});
