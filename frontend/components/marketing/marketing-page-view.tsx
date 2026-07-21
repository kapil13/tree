"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { CmsSectionRenderer } from "@/components/marketing/cms-section-renderer";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { cmsPublic } from "@/lib/cms-api";
import { CMS_HOME_FALLBACK } from "@/lib/cms-defaults";

export function MarketingPageView({ slug }: { slug: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["cms-public-page", slug],
    queryFn: () => cmsPublic.page(slug),
    staleTime: 60_000,
  });

  if (isLoading) {
    return <p className="px-6 py-20 text-center text-stone-500">Loading…</p>;
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="text-xl font-semibold">Page not found</h1>
        <Link href="/" className="mt-4 inline-block text-forest-700 hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  const fallback = CMS_HOME_FALLBACK;
  return (
    <div className="marketing-page">
      <MarketingHeader header={data.site?.header ?? fallback.site.header} />
      <main className="pt-8">
        <div className="mx-auto max-w-4xl px-6 pb-8">
          <h1 className="text-3xl font-semibold text-stone-900">{data.page.title}</h1>
          {data.page.meta_description ? (
            <p className="mt-2 text-stone-600">{data.page.meta_description}</p>
          ) : null}
        </div>
        {(data.page.sections ?? []).map((section) => (
          <CmsSectionRenderer key={section.id} section={section} />
        ))}
      </main>
      <MarketingFooter footer={data.site?.footer ?? fallback.site.footer} />
    </div>
  );
}
