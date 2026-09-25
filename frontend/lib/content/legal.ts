import fs from "node:fs";
import path from "node:path";

import { buildPageMetadata } from "@/lib/seo/metadata";

export const LEGAL_SLUGS = ["privacy", "terms", "data-use"] as const;

export type LegalSlug = (typeof LEGAL_SLUGS)[number];

/** Titles and descriptions currently published on aranyix.tech. */
const LEGAL_META: Record<LegalSlug, { title: string; description: string; path: string }> = {
  privacy: {
    title: "Privacy Policy",
    description: "How Aranyix collects, uses, and protects personal data.",
    path: "/privacy",
  },
  terms: {
    title: "Terms of Service",
    description: "Terms of Service for the Aranyix",
    path: "/terms",
  },
  "data-use": {
    title: "Data Use Policy",
    description: "How Aranyix uses plantation, satellite, and AI-derived data.",
    path: "/data-use",
  },
};

export type LegalDocument = {
  slug: LegalSlug;
  title: string;
  description: string;
  path: string;
  body: string;
};

export function getLegalDocument(slug: LegalSlug): LegalDocument {
  const meta = LEGAL_META[slug];
  const body = fs.readFileSync(path.join(process.cwd(), "content/legal", `${slug}.md`), "utf8");
  return { slug, ...meta, body };
}

export function legalPageMetadata(slug: LegalSlug) {
  const doc = getLegalDocument(slug);
  return buildPageMetadata({
    title: doc.title,
    description: doc.description,
    path: doc.path,
  });
}
