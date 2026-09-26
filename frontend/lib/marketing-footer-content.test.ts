import { describe, expect, it } from "vitest";

import { CMS_FOOTER_FALLBACK } from "@/lib/cms-defaults";
import {
  resolveMarketingFooterLegalLinks,
  resolveMarketingFooterLinkColumns,
} from "@/lib/marketing-footer-content";

describe("resolveMarketingFooterLinkColumns", () => {
  it("fills missing Solutions and Contact columns from fallback when CMS only has Platform", () => {
    const productionLikeFooter = {
      ...CMS_FOOTER_FALLBACK,
      columns: [
        {
          title: "Platform",
          links: [{ label: "Executive dashboard", href: "/auth?mode=signin&next=/dashboard" }],
        },
        {
          title: "Programs",
          links: [{ label: "BYOT citizen tagging", href: "/auth?mode=signup" }],
        },
        {
          title: "Compliance",
          links: [{ label: "DPDP privacy controls", href: "/privacy" }],
        },
        {
          title: "Legal",
          links: [{ label: "Terms of Service", href: "/terms" }],
        },
      ],
    };

    const columns = resolveMarketingFooterLinkColumns(productionLikeFooter);

    expect(columns.map((column) => column.title)).toEqual(["Platform", "Solutions", "Contact"]);
    expect(columns[0]?.links).toHaveLength(1);
    expect(columns[1]?.links.length).toBeGreaterThan(1);
    expect(columns[2]?.links.some((link) => link.href === "/contact")).toBe(true);
  });
});

describe("resolveMarketingFooterLegalLinks", () => {
  it("omits sign-in links from the legal row", () => {
    const links = resolveMarketingFooterLegalLinks({
      ...CMS_FOOTER_FALLBACK,
      columns: [
        {
          title: "Legal",
          links: [
            { label: "Terms of Service", href: "/terms" },
            { label: "Sign in", href: "/auth?mode=signin" },
          ],
        },
      ],
    });

    expect(links.map((link) => link.label)).toEqual(["Terms of Service"]);
  });
});
