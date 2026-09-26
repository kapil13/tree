"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { CmsSectionRenderer } from "@/components/marketing/cms-section-renderer";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { cmsPublic, type CmsPublicSite } from "@/lib/cms-api";
import { getCmsHomeFallbackSections } from "@/lib/cms-home-fallback";
import { useLocalizedCmsSite } from "@/lib/use-localized-cms";
import type { AppLocale } from "@/i18n/request";

export function HomePageContent({ initialData }: { initialData?: CmsPublicSite | null }) {
  const locale = useLocale() as AppLocale;
  const { data } = useQuery({
    queryKey: ["cms-public-site", locale],
    queryFn: () => cmsPublic.site(),
    initialData: initialData ?? undefined,
    staleTime: 60_000,
  });

  const payload = useLocalizedCmsSite(data);
  const liveSections = payload.page.sections ?? [];
  const hasRedesign = liveSections.some((section) => section.section_type === "intelligence_pipeline");
  const sections =
    hasRedesign && liveSections.length > 0 ? liveSections : getCmsHomeFallbackSections(locale);

  return (
    <div className="marketing-page">
      <MarketingHeader header={payload.site.header} />
      <main>
        {sections.map((section) => (
          <CmsSectionRenderer key={section.id} section={section} />
        ))}
      </main>
      <MarketingFooter footer={payload.site.footer} />
    </div>
  );
}
