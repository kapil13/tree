import type { CmsPublicSite, CmsSection } from "@/lib/cms-api";
import fallbackData from "@/lib/cms-home-fallback.json";

type FallbackPayload = {
  header: CmsPublicSite["site"]["header"];
  footer: CmsPublicSite["site"]["footer"];
  sections: Array<Omit<CmsSection, "id" | "enabled">>;
};

const data = fallbackData as FallbackPayload;

export function getCmsHomeFallbackSections(): CmsSection[] {
  return data.sections.map((section, index) => ({
    ...section,
    id: `fallback-${section.section_type}-${index}`,
    enabled: true,
  }));
}

export function getCmsHomeFallbackSite(): CmsPublicSite {
  return {
    site: {
      header: data.header,
      footer: data.footer,
    },
    page: {
      id: "fallback-home",
      slug: "home",
      title: "Aranyix — Intelligence for a Thriving Planet",
      meta_description:
        "Environmental MRV platform — satellite SAR fusion, bioacoustic biodiversity, and audit-ready compliance exports.",
      published: true,
      is_home: true,
      sort_order: 0,
      updated_at: null,
      sections: getCmsHomeFallbackSections(),
    },
  };
}
