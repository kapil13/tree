import type { CmsPublicSite } from "@/lib/cms-api";
import { sanitizeCmsHref } from "@/lib/cms-sanitize";
import { getCmsHomeFallbackSite } from "@/lib/cms-home-fallback";

const fallbackSite = getCmsHomeFallbackSite();

export const CMS_HEADER_FALLBACK = fallbackSite.site.header;

export const CMS_FOOTER_FALLBACK = fallbackSite.site.footer;

export const CMS_HOME_FALLBACK: CmsPublicSite = fallbackSite;

export type CmsCta = { label: string; href: string };

export function linkProps(link?: { label: string; href: string }) {
  const base = link ?? { label: "Learn more", href: "/" };
  return {
    label: base.label,
    href: sanitizeCmsHref(base.href ?? "/"),
  };
}

export function sectionByAnchor(sections: CmsPublicSite["page"]["sections"], anchor: string) {
  return sections?.find((s) => s.anchor_id === anchor);
}
