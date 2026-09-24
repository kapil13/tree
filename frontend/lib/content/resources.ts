import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";

export type ResourceFaq = {
  question: string;
  answer: string;
};

export type ResourceFrontmatter = {
  title: string;
  slug: string;
  description?: string;
  meta_description?: string;
  date: string;
  primary_keyword: string;
  secondary?: string;
  draft?: boolean;
};

export type ResourceArticle = ResourceFrontmatter & {
  description: string;
  contentHtml: string;
  faqHtml: string;
  ctaHtml: string;
  faqs: ResourceFaq[];
};

const CONTENT_DIR = path.join(process.cwd(), "content/resources");

/**
 * Resource pages render `frontmatter.title` as the only H1.
 * Drop a leading ATX H1 (the duplicate title) and demote any later H1 to H2.
 */
export function normalizeResourceBodyMarkdown(markdown: string): string {
  const withoutLeadingTitle = markdown.replace(/^# [^\n]*\r?\n*/, "");
  return withoutLeadingTitle.replace(/^# /gm, "## ").trim();
}

/** Last-line guard so remark output cannot introduce a second page H1. */
export function demoteHtmlH1(html: string): string {
  return html.replace(/<(\/?)h1(\s|>)/gi, "<$1h2$2");
}

function splitMarkdownSections(markdown: string) {
  const faqMatch = markdown.match(/^## FAQ\s*$/im);
  const ctaMatch = markdown.match(/^## CTA\s*$/im);

  const faqIndex = faqMatch?.index ?? -1;
  const ctaIndex = ctaMatch?.index ?? -1;

  const mainEnd = faqIndex >= 0 ? faqIndex : ctaIndex >= 0 ? ctaIndex : markdown.length;
  const main = markdown.slice(0, mainEnd).trim();

  const faqSection =
    faqIndex >= 0
      ? markdown
          .slice(faqIndex, ctaIndex >= 0 ? ctaIndex : undefined)
          .replace(/^## FAQ\s*/i, "")
          .trim()
      : "";

  const ctaSection =
    ctaIndex >= 0 ? markdown.slice(ctaIndex).replace(/^## CTA\s*/i, "").trim() : "";

  return { main, faqSection, ctaSection };
}

export function parseFaqsFromMarkdown(faqSection: string): ResourceFaq[] {
  if (!faqSection.trim()) return [];

  const faqs: ResourceFaq[] = [];
  const blocks = faqSection.split(/\n(?=\*\*)/);

  for (const block of blocks) {
    const match = block.match(/^\*\*(.+?)\*\*\s*\n+([\s\S]*)$/);
    if (!match) continue;
    faqs.push({
      question: match[1].trim(),
      answer: match[2].trim().replace(/\s+/g, " "),
    });
  }

  return faqs;
}

async function markdownToHtml(markdown: string): Promise<string> {
  if (!markdown.trim()) return "";
  const file = await remark().use(remarkGfm).use(remarkHtml, { sanitize: false }).process(markdown);
  return demoteHtmlH1(String(file));
}

function resolveDescription(data: ResourceFrontmatter): string {
  return data.meta_description ?? data.description ?? data.title;
}

async function parseResourceFile(filePath: string): Promise<ResourceArticle | null> {
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  const frontmatter = data as ResourceFrontmatter;

  if (!frontmatter.title || !frontmatter.slug || !frontmatter.date) {
    return null;
  }

  const { main, faqSection, ctaSection } = splitMarkdownSections(content);
  const body = normalizeResourceBodyMarkdown(main);
  const faqBody = normalizeResourceBodyMarkdown(faqSection);
  const ctaBody = normalizeResourceBodyMarkdown(ctaSection);
  const faqs = parseFaqsFromMarkdown(faqSection);
  const [contentHtml, faqHtml, ctaHtml] = await Promise.all([
    markdownToHtml(body),
    markdownToHtml(faqBody ? `## FAQ\n\n${faqBody}` : ""),
    markdownToHtml(ctaBody ? `## Next step\n\n${ctaBody}` : ""),
  ]);

  const rawDate = data.date as string | Date;
  const date =
    rawDate instanceof Date ? rawDate.toISOString().slice(0, 10) : String(rawDate);

  return {
    ...frontmatter,
    date,
    description: resolveDescription(frontmatter),
    contentHtml,
    faqHtml,
    ctaHtml,
    faqs,
  };
}

function listResourceFiles(): string[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((name) => name.endsWith(".md"))
    .map((name) => path.join(CONTENT_DIR, name));
}

export async function getAllResources(): Promise<ResourceArticle[]> {
  const resources = await Promise.all(listResourceFiles().map(parseResourceFile));
  return resources
    .filter((resource): resource is ResourceArticle => resource != null && !resource.draft)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function getResourceBySlug(slug: string): Promise<ResourceArticle | null> {
  const resources = await getAllResources();
  return resources.find((resource) => resource.slug === slug) ?? null;
}

export async function getPublishedResourceSlugs(): Promise<string[]> {
  const resources = await getAllResources();
  return resources.map((resource) => resource.slug);
}
