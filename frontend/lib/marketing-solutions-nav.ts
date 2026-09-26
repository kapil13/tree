import type { CmsLink, CmsPublicSite } from "@/lib/cms-api";

/** Indexable parent hub. Child solution URLs stay on their own pages. */
export const SOLUTIONS_HUB_PATH = "/solutions";

const SOLUTIONS_LABELS = new Set(["solutions", "समाधान"]);

function pathOnly(href: string): string {
  const withoutHash = href.trim().split("#")[0] ?? "";
  const withoutQuery = withoutHash.split("?")[0] ?? "";
  if (withoutQuery.length > 1 && withoutQuery.endsWith("/")) {
    return withoutQuery.slice(0, -1);
  }
  return withoutQuery || "/";
}

/**
 * The marketing header's Solutions item historically pointed at `/resources`.
 * Retarget that label to the hub, and add the hub link when it is absent.
 */
export function ensureSolutionsHubNav(nav: CmsLink[]): CmsLink[] {
  let hasHub = false;
  const next = nav.map((item) => {
    const hrefPath = pathOnly(item.href);
    const label = item.label.trim().toLowerCase();
    if (SOLUTIONS_LABELS.has(label) && (hrefPath === "/resources" || hrefPath === SOLUTIONS_HUB_PATH)) {
      hasHub = true;
      return hrefPath === SOLUTIONS_HUB_PATH ? item : { ...item, href: SOLUTIONS_HUB_PATH };
    }
    if (hrefPath === SOLUTIONS_HUB_PATH) {
      hasHub = true;
    }
    return item;
  });

  if (!hasHub) {
    next.push({ label: "Solutions", href: SOLUTIONS_HUB_PATH });
  }
  return next;
}

type MarketingFooter = CmsPublicSite["site"]["footer"];

/** Prepend the hub inside an existing Solutions column when that exact URL is missing. */
export function ensureSolutionsHubFooter(footer: MarketingFooter): MarketingFooter {
  return {
    ...footer,
    columns: footer.columns.map((column) => {
      const title = column.title.trim().toLowerCase();
      if (!SOLUTIONS_LABELS.has(title)) return column;
      const hasHub = column.links.some((link) => pathOnly(link.href) === SOLUTIONS_HUB_PATH);
      if (hasHub) return column;
      const label = title === "समाधान" ? "सभी समाधान" : "All solutions";
      return {
        ...column,
        links: [{ label, href: SOLUTIONS_HUB_PATH }, ...column.links],
      };
    }),
  };
}
