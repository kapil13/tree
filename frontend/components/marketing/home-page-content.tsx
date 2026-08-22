"use client";

import { useQuery } from "@tanstack/react-query";
import { CmsSectionRenderer } from "@/components/marketing/cms-section-renderer";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { cmsPublic, type CmsPublicSite } from "@/lib/cms-api";
import { CMS_HOME_FALLBACK } from "@/lib/cms-defaults";
import { getCmsHomeFallbackSections } from "@/lib/cms-home-fallback";

export function HomePageContent({ initialData }: { initialData?: CmsPublicSite | null }) {
  const { data } = useQuery({
    queryKey: ["cms-public-site"],
    queryFn: () => cmsPublic.site(),
    initialData: initialData ?? undefined,
    staleTime: 60_000,
  });

  const payload = data ?? CMS_HOME_FALLBACK;
  const sections =
    payload.page.sections && payload.page.sections.length > 0
      ? payload.page.sections
      : getCmsHomeFallbackSections();

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
