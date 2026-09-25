import { describe, expect, it } from "vitest";

import { buildPageMetadata } from "@/lib/seo/metadata";
import { MONEY_PAGE_PATHS, getSolutionPage } from "@/lib/seo/solution-pages";
import { SITE_URL } from "@/lib/seo/site";
import { solutionPageBreadcrumbJsonLd } from "@/lib/seo/structured-data";

const PATH = "/solutions/industrial-site-greening";
const DOCUMENT_TITLE = "Industrial Green Belt Monitoring & Site Greening | Aranyix";

const OUTBOUND_HREFS = [
  "/solutions/mining-greening",
  "/resources/industrial-green-belt-monitoring-india",
  "/resources/mine-green-belt-plantation-monitoring-india",
  "/resources/brsr-plantation-evidence-principle-6-india",
  "/product/mrv",
  "/demo",
];

describe("industrial site greening solution", () => {
  const page = getSolutionPage(PATH)!;

  it("is a money page with one H1 title for the breadcrumb trail", () => {
    expect(page).toBeDefined();
    expect(page.title).toBe("Industrial site greening");
    expect(MONEY_PAGE_PATHS).toContain(PATH);

    const breadcrumb = solutionPageBreadcrumbJsonLd({ name: page.title, path: page.path });
    const names = (breadcrumb?.itemListElement as Array<{ name: string }>).map((item) => item.name);
    expect(names).toEqual(["Home", "Solutions", "Industrial site greening"]);
  });

  it("keeps the document title and meta description inside the SEO limits", () => {
    expect(DOCUMENT_TITLE.length).toBeLessThanOrEqual(60);
    expect(page.description.length).toBeGreaterThanOrEqual(150);
    expect(page.description.length).toBeLessThanOrEqual(160);

    const metadata = buildPageMetadata({
      title: "Industrial Green Belt Monitoring & Site Greening",
      description: page.description,
      path: page.path,
    });

    expect(`${metadata.title} | Aranyix`).toBe(DOCUMENT_TITLE);
    expect(metadata.description).toBe(page.description);
    expect(metadata.alternates).toMatchObject({ canonical: PATH });
    expect(metadata.openGraph).toMatchObject({
      url: `${SITE_URL}${PATH}`,
      title: DOCUMENT_TITLE,
      description: page.description,
    });
  });

  it("links out to the mining page, guides, product, and demo", () => {
    const hrefs = new Set<string>([
      ...page.relatedLinks.map((link) => link.href),
      page.primaryCta.href,
      page.secondaryCta.href,
    ]);
    const prose = page.sections.flatMap((section) => section.paragraphs).join("\n");
    for (const href of OUTBOUND_HREFS) {
      expect(hrefs.has(href) || prose.includes(`](${href})`)).toBe(true);
    }
    expect(page.faqs.length).toBeGreaterThanOrEqual(4);
    expect(page.faqs.length).toBeLessThanOrEqual(6);
    expect(page.primaryCta.href).toBe("/demo");
  });
});
