import type { AppLocale } from "@/i18n/request";
import type { CmsPublicSite } from "@/lib/cms-api";
import { sanitizeCmsHref } from "@/lib/cms-sanitize";
import { getCmsHomeFallbackSite } from "@/lib/cms-home-fallback";

const fallbackSiteEn = getCmsHomeFallbackSite("en");

export const CMS_HEADER_FALLBACK = fallbackSiteEn.site.header;

export const CMS_FOOTER_FALLBACK = fallbackSiteEn.site.footer;

export const CMS_HOME_FALLBACK: CmsPublicSite = fallbackSiteEn;

export function cmsDefaultsForLocale(locale: AppLocale) {
  const site = getCmsHomeFallbackSite(locale);
  return {
    header: site.site.header,
    footer: site.site.footer,
    home: site,
  };
}

export type CmsCta = { label: string; href: string };

export function linkProps(link?: { label: string; href: string }, learnMoreLabel = "Learn more") {
  const base = link ?? { label: learnMoreLabel, href: "/" };
  return {
    label: base.label,
    href: sanitizeCmsHref(base.href ?? "/"),
  };
}

export function sectionByAnchor(sections: CmsPublicSite["page"]["sections"], anchor: string) {
  return sections?.find((s) => s.anchor_id === anchor);
}
