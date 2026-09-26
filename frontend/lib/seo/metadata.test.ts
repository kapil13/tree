import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildPageMetadata,
  HOME_PAGE_TITLE,
  homePageMetadata,
  NOT_FOUND_METADATA,
  ROOT_METADATA,
  withoutCanonical,
} from "./metadata";
import { DEFAULT_DESCRIPTION } from "./site";

describe("homePageMetadata", () => {
  it("sets document, og, and twitter titles to the exact homepage title", () => {
    const metadata = homePageMetadata();

    expect(HOME_PAGE_TITLE).toBe(
      "Plantation MRV for CSR, Mining, CAMPA & Biodiversity | Aranyix",
    );
    expect(metadata.title).toEqual({ absolute: HOME_PAGE_TITLE });
    expect(metadata.description).toBe(DEFAULT_DESCRIPTION);
    expect(metadata.openGraph).toMatchObject({ title: HOME_PAGE_TITLE });
    expect(metadata.twitter).toMatchObject({ title: HOME_PAGE_TITLE });
  });

  it("still suffixes other pages once", () => {
    const metadata = buildPageMetadata({
      title: "Contact us",
      path: "/contact",
    });

    expect(metadata.title).toBe("Contact us");
    expect(metadata.openGraph).toMatchObject({ title: "Contact us | Aranyix" });
    expect(metadata.twitter).toMatchObject({ title: "Contact us | Aranyix" });
  });

  it("emits a self-referencing canonical and matching og:url without query or trailing slash", () => {
    const home = homePageMetadata();
    expect(home.alternates).toEqual({
      canonical: "/",
      languages: {
        en: "https://aranyix.tech",
        hi: "https://aranyix.tech",
        "x-default": "https://aranyix.tech",
      },
    });
    expect(home.openGraph).toMatchObject({ url: "https://aranyix.tech" });

    const contact = buildPageMetadata({
      title: "Contact us",
      path: "/contact/",
    });
    expect(contact.alternates).toEqual({
      canonical: "/contact",
      languages: {
        en: "https://aranyix.tech/contact",
        hi: "https://aranyix.tech/contact",
        "x-default": "https://aranyix.tech/contact",
      },
    });
    expect(contact.openGraph).toMatchObject({ url: "https://aranyix.tech/contact" });

    const withQuery = buildPageMetadata({
      title: "Auth",
      path: "/auth?mode=signin&next=/map",
    });
    expect(withQuery.alternates).toEqual({
      canonical: "/auth",
      languages: {
        en: "https://aranyix.tech/auth",
        hi: "https://aranyix.tech/auth",
        "x-default": "https://aranyix.tech/auth",
      },
    });
    expect(withQuery.openGraph).toMatchObject({ url: "https://aranyix.tech/auth" });
  });
});

describe("not-found metadata", () => {
  it("clears the root layout canonical and does not add a robots tag", () => {
    expect(ROOT_METADATA.alternates).toEqual({ canonical: "./" });
    expect(NOT_FOUND_METADATA).toEqual({
      alternates: { canonical: null },
    });
  });

  it("is what the not-found page exports", () => {
    const source = readFileSync(path.join(__dirname, "../../app/not-found.tsx"), "utf8");
    expect(source).toContain('import { NOT_FOUND_METADATA } from "@/lib/seo/metadata"');
    expect(source).toContain("export const metadata = NOT_FOUND_METADATA");
  });

  it("strips a self-canonical from notFound() metadata without changing title or robots", () => {
    expect(withoutCanonical()).toEqual({ alternates: { canonical: null } });

    const resource = withoutCanonical({
      ...buildPageMetadata({
        title: "Resource not found",
        description: "The requested guide could not be found.",
        path: "/resources/campa-afforestation-monitoring-india",
      }),
      robots: { index: false, follow: false },
    });

    expect(resource.alternates).toEqual({ canonical: null });
    expect(resource.title).toBe("Resource not found");
    expect(resource.description).toBe("The requested guide could not be found.");
    expect(resource.robots).toEqual({ index: false, follow: false });
    expect(resource.openGraph).toMatchObject({
      url: "https://aranyix.tech/resources/campa-afforestation-monitoring-india",
    });
  });
});
