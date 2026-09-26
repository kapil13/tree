import { describe, expect, it } from "vitest";

import { getAllResources } from "@/lib/content/resources";
import { ROOT_METADATA } from "@/lib/seo/metadata";
import { getSolutionPage } from "@/lib/seo/solution-pages";
import { SITE_URL } from "@/lib/seo/site";

import {
  articleJsonLd,
  breadcrumbListJsonLd,
  inLanguageFromOpenGraphLocale,
  readSchemaDate,
  resourceArticleJsonLd,
  resourceGuideBreadcrumbJsonLd,
  resourceHubBreadcrumbJsonLd,
  serializeJsonLd,
  solutionHubBreadcrumbJsonLd,
  solutionPageBreadcrumbJsonLd,
} from "./structured-data";

const SOLUTION_CHILD_PATHS = [
  "/solutions/csr-plantation",
  "/solutions/mining-greening",
  "/solutions/campa-afforestation",
  "/solutions/brsr-esg",
  "/solutions/industrial-site-greening",
] as const;

function listItems(data: Record<string, unknown>) {
  return data.itemListElement as Array<{
    "@type": string;
    position: number;
    name: string;
    item: string;
  }>;
}

describe("solution breadcrumbs", () => {
  it("builds Home → Solutions for the hub", () => {
    const data = solutionHubBreadcrumbJsonLd();

    expect(data).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Solutions", item: `${SITE_URL}/solutions` },
      ],
    });
    expect(solutionPageBreadcrumbJsonLd({ name: "Ignored H1", path: "/solutions" })).toEqual(data);
    expect(solutionPageBreadcrumbJsonLd({ name: "Ignored H1", path: "/solutions/" })).toEqual(data);
  });

  it("builds Home → Solutions → page for each live solution child", () => {
    for (const path of SOLUTION_CHILD_PATHS) {
      const page = getSolutionPage(path);
      expect(page).toBeDefined();

      const data = solutionPageBreadcrumbJsonLd({ name: page!.title, path: page!.path });
      expect(listItems(data!)).toEqual([
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Solutions", item: `${SITE_URL}/solutions` },
        { "@type": "ListItem", position: 3, name: page!.title, item: `${SITE_URL}${path}` },
      ]);
    }
  });

  it("covers a future /solutions child without a special case", () => {
    const data = solutionPageBreadcrumbJsonLd({
      name: "Industrial site greening",
      path: "/solutions/industrial-site-greening",
    });

    expect(listItems(data!).map((item) => item.name)).toEqual([
      "Home",
      "Solutions",
      "Industrial site greening",
    ]);
    expect(listItems(data!)[2]?.item).toBe(`${SITE_URL}/solutions/industrial-site-greening`);
  });

  it("leaves non-solution landings without a solutions trail", () => {
    for (const path of ["/product/mrv", "/demo", "/partners/agencies", "/resources"]) {
      expect(solutionPageBreadcrumbJsonLd({ name: "Other", path })).toBeNull();
    }
  });
});

describe("resource breadcrumbs", () => {
  it("builds Home → Resources for the hub", () => {
    expect(resourceHubBreadcrumbJsonLd()).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Resources", item: `${SITE_URL}/resources` },
      ],
    });
  });

  it("builds Home → Resources → guide title", () => {
    const data = resourceGuideBreadcrumbJsonLd({
      name: "Plantation MRV Software in India: From Field Tags to Audit-Prep Reports",
      path: "/resources/plantation-mrv-software-india",
    });

    expect(listItems(data).map((item) => [item.position, item.name, item.item])).toEqual([
      [1, "Home", `${SITE_URL}/`],
      [2, "Resources", `${SITE_URL}/resources`],
      [
        3,
        "Plantation MRV Software in India: From Field Tags to Audit-Prep Reports",
        `${SITE_URL}/resources/plantation-mrv-software-india`,
      ],
    ]);
  });
});

describe("article JSON-LD", () => {
  const guide = {
    title: "Plantation MRV Software in India: From Field Tags to Audit-Prep Reports",
    description:
      "Choose plantation MRV software India teams trust: geo-tagged trees, survival tracking, and audit-prep exports—without claiming carbon credits.",
    date: "2026-09-24",
    slug: "plantation-mrv-software-india",
  };

  it("maps the site Open Graph locale to en-IN", () => {
    expect(ROOT_METADATA.openGraph).toMatchObject({ locale: "en_IN" });
    expect(inLanguageFromOpenGraphLocale("en_IN")).toBe("en-IN");
  });

  it("describes a guide with Aranyix as author and publisher", () => {
    const data = resourceArticleJsonLd(guide);
    const canonical = `${SITE_URL}/resources/${guide.slug}`;

    expect(data).toEqual({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: guide.title,
      description: guide.description,
      datePublished: "2026-09-24",
      inLanguage: "en-IN",
      author: { "@type": "Organization", name: "Aranyix", url: SITE_URL },
      publisher: { "@type": "Organization", name: "Aranyix", url: SITE_URL },
      mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    });
    expect(data).not.toHaveProperty("dateModified");
    expect(data["@type"]).not.toBe("FAQPage");
  });

  it("includes dateModified only when a date is available", () => {
    const withoutModified = articleJsonLd({
      headline: guide.title,
      description: guide.description,
      datePublished: guide.date,
      path: `/resources/${guide.slug}`,
    });
    expect(withoutModified).not.toHaveProperty("dateModified");

    const modified = articleJsonLd({
      headline: guide.title,
      description: guide.description,
      datePublished: guide.date,
      dateModified: "2026-09-25",
      path: `/resources/${guide.slug}`,
    });
    expect(modified.dateModified).toBe("2026-09-25");

    const fromDate = articleJsonLd({
      headline: guide.title,
      description: guide.description,
      datePublished: new Date("2026-09-24T00:00:00.000Z"),
      dateModified: new Date("2026-09-25T00:00:00.000Z"),
      path: `/resources/${guide.slug}`,
    });
    expect(fromDate.datePublished).toBe("2026-09-24");
    expect(fromDate.dateModified).toBe("2026-09-25");
  });

  it("reads schema dates and ignores blanks", () => {
    expect(readSchemaDate(new Date("2026-09-01T00:00:00.000Z"))).toBe("2026-09-01");
    expect(readSchemaDate(" 2026-09-08 ")).toBe("2026-09-08");
    expect(readSchemaDate("")).toBeUndefined();
    expect(readSchemaDate("   ")).toBeUndefined();
    expect(readSchemaDate(null)).toBeUndefined();
    expect(readSchemaDate(undefined)).toBeUndefined();
  });
});

describe("published resource guides", () => {
  it("builds article and breadcrumb JSON-LD for every published guide", async () => {
    const articles = await getAllResources();
    expect(articles.length).toBeGreaterThan(0);

    for (const article of articles) {
      const articleLd = resourceArticleJsonLd(article);
      const breadcrumbLd = resourceGuideBreadcrumbJsonLd({
        name: article.title,
        path: `/resources/${article.slug}`,
      });

      expect(articleLd).toMatchObject({
        "@context": "https://schema.org",
        "@type": "Article",
        headline: article.title,
        description: article.description,
        datePublished: article.date,
        inLanguage: "en-IN",
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": `${SITE_URL}/resources/${article.slug}`,
        },
      });
      if (article.dateModified) {
        expect(articleLd.dateModified).toBe(article.dateModified);
      } else {
        expect(articleLd).not.toHaveProperty("dateModified");
      }

      expect(listItems(breadcrumbLd).map((item) => item.name)).toEqual([
        "Home",
        "Resources",
        article.title,
      ]);
      expect(JSON.parse(serializeJsonLd(articleLd))).toEqual(articleLd);
      expect(JSON.parse(serializeJsonLd(breadcrumbLd))).toEqual(breadcrumbLd);
    }
  });
});

describe("JSON-LD serialization", () => {
  it("emits one schema type per object and escapes script-breaking characters", () => {
    const breadcrumb = breadcrumbListJsonLd([
      { name: "Home", path: "/" },
      { name: "Solutions", path: "/solutions" },
    ]);
    const serialized = serializeJsonLd({
      ...breadcrumb,
      name: "</script><script>alert(1)",
    });

    expect(serialized).not.toContain("<");
    expect(JSON.parse(serialized)).toMatchObject({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      name: "</script><script>alert(1)",
    });
    expect(breadcrumb["@graph"]).toBeUndefined();
  });
});
