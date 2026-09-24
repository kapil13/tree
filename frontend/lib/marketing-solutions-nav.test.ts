import { describe, expect, it } from "vitest";

import { ensureSolutionsHubFooter, ensureSolutionsHubNav } from "./marketing-solutions-nav";

describe("ensureSolutionsHubNav", () => {
  it("retargets the Solutions label from /resources to the hub", () => {
    const nav = ensureSolutionsHubNav([
      { label: "Platform", href: "#platform" },
      { label: "Solutions", href: "/resources" },
    ]);

    expect(nav).toEqual([
      { label: "Platform", href: "#platform" },
      { label: "Solutions", href: "/solutions" },
    ]);
  });

  it("adds a hub link when the header has none", () => {
    const nav = ensureSolutionsHubNav([{ label: "Platform", href: "#platform" }]);

    expect(nav).toEqual([
      { label: "Platform", href: "#platform" },
      { label: "Solutions", href: "/solutions" },
    ]);
  });

  it("does not duplicate an existing hub link", () => {
    const nav = ensureSolutionsHubNav([{ label: "Solutions", href: "/solutions" }]);

    expect(nav).toEqual([{ label: "Solutions", href: "/solutions" }]);
  });
});

describe("ensureSolutionsHubFooter", () => {
  const footer = {
    description: "d",
    badge: "b",
    copyright: "c",
    legal_note: "n",
    columns: [
      {
        title: "Solutions",
        links: [{ label: "CSR plantation MRV", href: "/solutions/csr-plantation" }],
      },
      {
        title: "Legal",
        links: [{ label: "Privacy Policy", href: "/privacy" }],
      },
    ],
  };

  it("prepends the hub inside the Solutions column only", () => {
    const next = ensureSolutionsHubFooter(footer);

    expect(next.columns[0]?.links[0]).toEqual({ label: "All solutions", href: "/solutions" });
    expect(next.columns[1]?.links).toEqual(footer.columns[1]?.links);
  });

  it("leaves a column that already links to the hub unchanged", () => {
    const withHub = {
      ...footer,
      columns: [
        {
          title: "Solutions",
          links: [{ label: "All solutions", href: "/solutions" }],
        },
      ],
    };

    expect(ensureSolutionsHubFooter(withHub).columns[0]?.links).toHaveLength(1);
  });
});
