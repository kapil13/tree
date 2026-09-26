import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { lookupPublicPath } from "@/lib/public-resource";
import { withoutCanonical } from "@/lib/seo/metadata";
import { NOINDEX_METADATA } from "@/lib/seo/noindex";

import PublicImpactPage from "./impact-client";

async function impactLookup(token: string) {
  return lookupPublicPath(`/v1/public/verify/${encodeURIComponent(token)}`);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  if ((await impactLookup(token)) === "missing") return withoutCanonical();
  return NOINDEX_METADATA;
}

export default async function ImpactTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if ((await impactLookup(token)) === "missing") notFound();
  return <PublicImpactPage />;
}
