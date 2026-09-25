import type { Metadata } from "next";

import { NOINDEX_METADATA } from "@/lib/seo/noindex";

export const metadata: Metadata = NOINDEX_METADATA;

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
