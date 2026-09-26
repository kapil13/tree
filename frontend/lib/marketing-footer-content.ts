import type { CmsPublicSite } from "@/lib/cms-api";
import { CMS_FOOTER_FALLBACK } from "@/lib/cms-defaults";
import { ensureSolutionsHubFooter } from "@/lib/marketing-solutions-nav";

export const MARKETING_FOOTER_LINK_TITLES = ["Platform", "Solutions", "Contact"] as const;

const EXCLUDED_LINK_COLUMNS = new Set(["Programs", "Compliance", "Legal"]);

type Footer = CmsPublicSite["site"]["footer"];

function linkColumnsByTitle(footer: Footer) {
  return new Map(
    footer.columns
      .filter((column) => !EXCLUDED_LINK_COLUMNS.has(column.title))
      .map((column) => [column.title, column]),
  );
}

/** Always return three populated marketing footer columns, filling gaps from fallback. */
export function resolveMarketingFooterLinkColumns(
  footer: Footer,
  fallback: Footer = CMS_FOOTER_FALLBACK,
): Footer["columns"] {
  const live = linkColumnsByTitle(ensureSolutionsHubFooter(footer));
  const defaults = linkColumnsByTitle(ensureSolutionsHubFooter(fallback));

  return MARKETING_FOOTER_LINK_TITLES.map((title) => {
    const column = live.get(title) ?? defaults.get(title);
    return column ?? { title, links: [] };
  }).filter((column) => column.links.length > 0);
}

export function resolveMarketingFooterLegalLinks(
  footer: Footer,
  fallback: Footer = CMS_FOOTER_FALLBACK,
): Footer["columns"][number]["links"] {
  const legal =
    footer.columns.find((column) => column.title === "Legal") ??
    fallback.columns.find((column) => column.title === "Legal");

  return (legal?.links ?? []).filter((link) => {
    const href = link.href.trim().toLowerCase();
    return !href.includes("mode=signin") && href !== "/auth" && href !== "/login";
  });
}
