import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { NOINDEX_METADATA } from "@/lib/seo/noindex";

export const metadata: Metadata = NOINDEX_METADATA;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const params = new URLSearchParams({ mode: "signin" });
  if (next?.startsWith("/") && !next.startsWith("//")) {
    params.set("next", next);
  }
  redirect(`/auth?${params.toString()}`);
}
