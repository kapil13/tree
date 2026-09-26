"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { CmsSectionRenderer } from "@/components/marketing/cms-section-renderer";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { cmsPublic } from "@/lib/cms-api";
import { useLocalizedCmsSite } from "@/lib/use-localized-cms";
import type { AppLocale } from "@/i18n/request";

export function MarketingPageView({ slug }: { slug: string }) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("marketing");
  const { data, isLoading, error } = useQuery({
    queryKey: ["cms-public-page", slug, locale],
    queryFn: () => cmsPublic.page(slug),
    staleTime: 60_000,
  });

  const localized = useLocalizedCmsSite(data);

  if (isLoading) {
    return (
      <div className="marketing-page" aria-busy="true" aria-label={t("loadingPage")}>
        <div className="border-b border-stone-200 bg-white">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
            <div className="h-8 w-36 animate-pulse rounded bg-stone-200" />
            <div className="hidden gap-3 sm:flex">
              <div className="h-4 w-16 animate-pulse rounded bg-stone-200" />
              <div className="h-4 w-16 animate-pulse rounded bg-stone-200" />
              <div className="h-8 w-24 animate-pulse rounded-full bg-stone-200" />
            </div>
          </div>
        </div>
        <main className="mx-auto max-w-4xl space-y-6 px-6 py-12">
          <div className="h-9 w-72 max-w-full animate-pulse rounded bg-stone-200" />
          <div className="h-4 w-full max-w-xl animate-pulse rounded bg-stone-100" />
          <div className="space-y-3 pt-4">
            <div className="h-4 w-full animate-pulse rounded bg-stone-100" />
            <div className="h-4 w-full animate-pulse rounded bg-stone-100" />
            <div className="h-4 w-11/12 animate-pulse rounded bg-stone-100" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-stone-100" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="text-xl font-semibold">{t("pageNotFound")}</h1>
        <Link href="/" className="mt-4 inline-block text-forest-700 hover:underline">
          {t("backToHome")}
        </Link>
      </div>
    );
  }

  return (
    <div className="marketing-page">
      <MarketingHeader header={localized.site.header} />
      <main className="pt-8">
        <div className="mx-auto max-w-4xl px-6 pb-8">
          <h1 className="font-display text-3xl font-semibold text-stone-900">{localized.page.title}</h1>
          {localized.page.meta_description ? (
            <p className="mt-2 text-stone-600">{localized.page.meta_description}</p>
          ) : null}
        </div>
        {(localized.page.sections ?? []).map((section) => (
          <CmsSectionRenderer key={section.id} section={section} />
        ))}
      </main>
      <MarketingFooter footer={localized.site.footer} />
    </div>
  );
}
