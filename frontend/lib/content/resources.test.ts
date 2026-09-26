import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";
import { describe, expect, it } from "vitest";

import {
  demoteHtmlH1,
  getAllResources,
  getPublishedResourceSlugs,
  normalizeResourceBodyMarkdown,
} from "./resources";

describe("normalizeResourceBodyMarkdown", () => {
  it("drops a leading title H1 and keeps the body", () => {
    const markdown = "# Plantation MRV Software in India\n\nIndian CSR teams still ask where the trees are.\n\n## The buyer problem\n\nProof is hard.";

    expect(normalizeResourceBodyMarkdown(markdown)).toBe(
      "Indian CSR teams still ask where the trees are.\n\n## The buyer problem\n\nProof is hard.",
    );
  });

  it("does not strip a leading H2", () => {
    expect(normalizeResourceBodyMarkdown("## FAQ\n\n**Question?**\n\nAnswer.")).toBe(
      "## FAQ\n\n**Question?**\n\nAnswer.",
    );
  });

  it("demotes a later H1 so the template title stays the only H1", () => {
    expect(normalizeResourceBodyMarkdown("# Title\n\n# Second heading\n\nBody")).toBe(
      "## Second heading\n\nBody",
    );
  });
});

describe("demoteHtmlH1", () => {
  it("rewrites opening and closing h1 tags, including attributes", () => {
    expect(demoteHtmlH1('<h1 id="title">Title</h1><p>Body</p>')).toBe(
      '<h2 id="title">Title</h2><p>Body</p>',
    );
  });
});

describe("published resource articles", () => {
  it("renders body, FAQ, and CTA html with no H1 and keeps listing slugs", async () => {
    const articles = await getAllResources();
    const slugs = await getPublishedResourceSlugs();

    expect(articles.length).toBeGreaterThan(0);
    expect(slugs).toEqual(articles.map((article) => article.slug));
    expect(new Set(slugs).size).toBe(slugs.length);

    for (const article of articles) {
      const rendered = `<h1>${article.title}</h1>${article.contentHtml}${article.faqHtml}${article.ctaHtml}`;
      expect(rendered.match(/<h1\b/gi)).toHaveLength(1);
      expect(article.contentHtml).not.toMatch(/<h1\b/i);
      expect(article.faqHtml).not.toMatch(/<h1\b/i);
      expect(article.ctaHtml).not.toMatch(/<h1\b/i);
      expect(article.contentHtml.length).toBeGreaterThan(200);
      expect(article.ctaHtml).toContain("/demo");
      expect(article.ctaHtml).toContain("90-day Plant");
      expect(article.ctaHtml.toLowerCase()).not.toContain("we issue");
      expect(article.faqs.length).toBeGreaterThan(0);
    }

    const mrv = articles.find((article) => article.slug === "plantation-mrv-software-india");
    expect(mrv?.contentHtml).toContain("where are the trees");
    expect(mrv?.contentHtml).not.toContain("<h1");
  });
});

describe("half-yearly EC compliance guide", () => {
  const filePath = path.join(
    process.cwd(),
    "content/resources/09-half-yearly-ec-compliance-report-green-belt-india.md",
  );

  it("stays a hidden draft with the SEO limits", () => {
    const { data, content } = matter(fs.readFileSync(filePath, "utf8"));
    const title = String(data.title);
    const description = String(data.meta_description);

    expect(data.draft).toBe(true);
    expect(data.slug).toBe("half-yearly-ec-compliance-report-green-belt-india");
    expect(title.length).toBeLessThanOrEqual(60);
    expect(title.toLowerCase()).toContain("half-yearly ec compliance report");
    expect(description.length).toBeGreaterThanOrEqual(140);
    expect(description.length).toBeLessThanOrEqual(158);
    expect(content.match(/^# /gm)).toHaveLength(1);
    expect(content).toContain("/solutions/mining-greening");
    expect(content).toContain("/demo");
    expect(content.toLowerCase()).not.toContain("we issue");
  });

  it("is omitted from published listings", async () => {
    const slugs = await getPublishedResourceSlugs();
    expect(slugs).not.toContain("half-yearly-ec-compliance-report-green-belt-india");
  });
});
