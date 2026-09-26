import { describe, expect, it } from "vitest";

import { buildPageMetadata, HOME_PAGE_TITLE, homePageMetadata } from "./metadata";
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
    expect(home.alternates).toEqual({ canonical: "/" });
    expect(home.openGraph).toMatchObject({ url: "https://aranyix.tech" });

    const contact = buildPageMetadata({
      title: "Contact us",
      path: "/contact/",
    });
    expect(contact.alternates).toEqual({ canonical: "/contact" });
    expect(contact.openGraph).toMatchObject({ url: "https://aranyix.tech/contact" });

    const withQuery = buildPageMetadata({
      title: "Auth",
      path: "/auth?mode=signin&next=/map",
    });
    expect(withQuery.alternates).toEqual({ canonical: "/auth" });
    expect(withQuery.openGraph).toMatchObject({ url: "https://aranyix.tech/auth" });
  });
});
