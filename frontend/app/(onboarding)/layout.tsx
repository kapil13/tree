import type { Metadata } from "next";

import { NOINDEX_METADATA } from "@/lib/seo/noindex";

import { OnboardingChrome } from "./onboarding-chrome";

export const dynamic = "force-dynamic";

export const metadata: Metadata = NOINDEX_METADATA;

/** Minimal chrome for professional onboarding — no sidebar/topbar. */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <OnboardingChrome>{children}</OnboardingChrome>;
}
