import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { lookupPublicPath } from "@/lib/public-resource";
import { withoutCanonical } from "@/lib/seo/metadata";
import { NOINDEX_METADATA } from "@/lib/seo/noindex";

import PublicAuditVerifyPage from "./audit-verify-client";

async function auditLookup(digest: string) {
  return lookupPublicPath(`/v1/public/verify/audit/${encodeURIComponent(digest)}`);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ digest: string }>;
}): Promise<Metadata> {
  const { digest } = await params;
  if ((await auditLookup(digest)) === "missing") return withoutCanonical();
  return NOINDEX_METADATA;
}

export default async function VerifyAuditPage({
  params,
}: {
  params: Promise<{ digest: string }>;
}) {
  const { digest } = await params;
  if ((await auditLookup(digest)) === "missing") notFound();
  return <PublicAuditVerifyPage />;
}
