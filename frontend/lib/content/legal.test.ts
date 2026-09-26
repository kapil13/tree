import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getLegalDocument, legalPageMetadata } from "@/lib/content/legal";

describe("published legal pages", () => {
  it("keeps the live privacy, terms, and data-use wording", () => {
    const expected = {
      privacy: {
        title: "Privacy Policy",
        description: "How Aranyix collects, uses, and protects personal data.",
        sha256: "f726ee701af9e4dfe8a033dbe752740c00a221943c10ad9425f1861d54ddae6f",
      },
      terms: {
        title: "Terms of Service",
        description: "Terms of Service for the Aranyix",
        sha256: "f21d2dc630f5a89877610f3b9dc15bc016f5253dea121f34ab5d8805822b7a79",
      },
      "data-use": {
        title: "Data Use Policy",
        description: "How Aranyix uses plantation, satellite, and AI-derived data.",
        sha256: "920981a7a28203806c52fd253918e74a73b99cd00ae65bcc0f4fd45767d7321b",
      },
    } as const;

    for (const [slug, meta] of Object.entries(expected)) {
      const doc = getLegalDocument(slug as keyof typeof expected);
      const bytes = fs.readFileSync(path.join(process.cwd(), "content/legal", `${slug}.md`));
      expect(doc.title).toBe(meta.title);
      expect(doc.description).toBe(meta.description);
      expect(doc.body.startsWith(`# ${meta.title}`)).toBe(true);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(meta.sha256);

      const metadata = legalPageMetadata(slug as keyof typeof expected);
      expect(metadata.alternates).toEqual({
        canonical: doc.path,
        languages: {
          en: `https://aranyix.tech${doc.path}`,
          hi: `https://aranyix.tech${doc.path}`,
          "x-default": `https://aranyix.tech${doc.path}`,
        },
      });
      expect(metadata.description).toBe(meta.description);
      expect(metadata.openGraph).toMatchObject({
        url: `https://aranyix.tech${doc.path}`,
        description: meta.description,
      });
      expect(metadata.robots).toEqual({ index: true, follow: true });
    }
  });
});
