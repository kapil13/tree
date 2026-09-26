import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { lookupPublicPath } from "@/lib/public-resource";
import { NOINDEX_METADATA } from "@/lib/seo/noindex";

import PublicVerifyPage from "./verify-client";

async function verifyLookup(token: string) {
  return lookupPublicPath(`/v1/public/verify/${encodeURIComponent(token)}`);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  if ((await verifyLookup(token)) === "missing") return {};
  return NOINDEX_METADATA;
}

export default async function VerifyTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if ((await verifyLookup(token)) === "missing") notFound();
  return <PublicVerifyPage />;
}
