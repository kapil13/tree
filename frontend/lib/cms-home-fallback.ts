import type { AppLocale } from "@/i18n/request";
import type { CmsPublicSite, CmsSection } from "@/lib/cms-api";
import fallbackDataEn from "@/lib/cms-home-fallback.json";
import fallbackDataHi from "@/lib/cms-home-fallback.hi.json";

type FallbackPayload = {
  header: CmsPublicSite["site"]["header"];
  footer: CmsPublicSite["site"]["footer"];
  sections: Array<Omit<CmsSection, "id" | "enabled">>;
};

const fallbackByLocale: Record<AppLocale, FallbackPayload> = {
  en: fallbackDataEn as FallbackPayload,
  hi: fallbackDataHi as FallbackPayload,
};

function payloadForLocale(locale: AppLocale): FallbackPayload {
  return fallbackByLocale[locale] ?? fallbackByLocale.en;
}

export function getCmsHomeFallbackSections(locale: AppLocale = "en"): CmsSection[] {
  return payloadForLocale(locale).sections.map((section, index) => ({
    ...section,
    id: `fallback-${section.section_type}-${index}`,
    enabled: true,
  }));
}

export function getCmsHomeFallbackSite(locale: AppLocale = "en"): CmsPublicSite {
  const data = payloadForLocale(locale);
  const titles: Record<AppLocale, { title: string; meta: string }> = {
    en: {
      title: "Aranyix — Intelligence for a Thriving Planet",
      meta: "Environmental MRV platform — satellite SAR fusion, bioacoustic biodiversity, and audit-ready compliance exports.",
    },
    hi: {
      title: "Aranyix — एक समृद्ध ग्रह के लिए बुद्धिमत्ता",
      meta: "पर्यावरण MRV प्लेटफ़ॉर्म — उपग्रह SAR फ्यूजन, जैव ध्वनि विविधता और ऑडिट-तैयार अनुपालन निर्यात।",
    },
  };
  const copy = titles[locale] ?? titles.en;
  return {
    site: {
      header: data.header,
      footer: data.footer,
    },
    page: {
      id: "fallback-home",
      slug: "home",
      title: copy.title,
      meta_description: copy.meta,
      published: true,
      is_home: true,
      sort_order: 0,
      updated_at: null,
      sections: getCmsHomeFallbackSections(locale),
    },
  };
}
