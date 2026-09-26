"use client";

import { useLocale } from "next-intl";
import type { AppLocale } from "@/i18n/request";
import type { CmsPublicSite } from "@/lib/cms-api";
import { getCmsHomeFallbackSite } from "@/lib/cms-home-fallback";

/** CMS API serves English only — use locale fallback for Hindi marketing copy. */
export function localizedCmsSite(apiPayload: CmsPublicSite | null | undefined, locale: AppLocale): CmsPublicSite {
  const fallback = getCmsHomeFallbackSite(locale);
  if (locale !== "hi") {
    return apiPayload ?? fallback;
  }

  const liveSections = apiPayload?.page?.sections ?? [];
  const hasRedesign = liveSections.some((s) => s.section_type === "intelligence_pipeline");
  const sections =
    hasRedesign && liveSections.length > 0 ? fallback.page.sections : fallback.page.sections;

  return {
    site: fallback.site,
    page: {
      ...(apiPayload?.page ?? fallback.page),
      title: fallback.page.title,
      meta_description: fallback.page.meta_description,
      sections,
    },
  };
}

export function useLocalizedCmsSite(apiPayload: CmsPublicSite | null | undefined): CmsPublicSite {
  const locale = useLocale() as AppLocale;
  return localizedCmsSite(apiPayload, locale);
}

export function useCmsHomeFallback(): CmsPublicSite {
  const locale = useLocale() as AppLocale;
  return getCmsHomeFallbackSite(locale);
}
