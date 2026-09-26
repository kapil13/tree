import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MarketingPageView } from "@/components/marketing/marketing-page-view";
import { lookupPublicPath } from "@/lib/public-resource";
import { withoutCanonical } from "@/lib/seo/metadata";
import { NOINDEX_METADATA } from "@/lib/seo/noindex";

async function cmsLookup(slug: string) {
  return lookupPublicPath(`/v1/public/pages/${encodeURIComponent(slug)}`);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if ((await cmsLookup(slug)) === "missing") return withoutCanonical();
  return NOINDEX_METADATA;
}

export default async function CmsPageRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if ((await cmsLookup(slug)) === "missing") notFound();
  return <MarketingPageView slug={slug} />;
}
