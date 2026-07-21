"use client";

import { useQuery } from "@tanstack/react-query";
import { CmsSectionRenderer } from "@/components/marketing/cms-section-renderer";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { cmsPublic, type CmsPublicSite } from "@/lib/cms-api";
import { CMS_HOME_FALLBACK } from "@/lib/cms-defaults";

export function HomePageContent({ initialData }: { initialData?: CmsPublicSite | null }) {
  const { data } = useQuery({
    queryKey: ["cms-public-site"],
    queryFn: () => cmsPublic.site(),
    initialData: initialData ?? undefined,
    staleTime: 60_000,
  });

  const payload = data ?? CMS_HOME_FALLBACK;
  const sections = payload.page.sections ?? [];

  return (
    <div className="marketing-page">
      <MarketingHeader header={payload.site.header} />
      <main>
        {sections.length > 0 ? (
          sections.map((section) => <CmsSectionRenderer key={section.id} section={section} />)
        ) : (
          <p className="px-6 py-20 text-center text-stone-500">Homepage content is being configured.</p>
        )}
      </main>
      <MarketingFooter footer={payload.site.footer} />
    </div>
  );
}
