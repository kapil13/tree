import { MarketingShell } from "@/components/marketing/marketing-shell";
import { SolutionLandingPage } from "@/components/marketing/solution-landing-page";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getSolutionPage } from "@/lib/seo/solution-pages";

const page = getSolutionPage("/solutions/brsr-esg")!;

export const metadata = buildPageMetadata({
  title: "BRSR & ESG plantation evidence",
  description: page.description,
  path: page.path,
});

export default function BrsrEsgPage() {
  return (
    <MarketingShell>
      <SolutionLandingPage page={page} />
    </MarketingShell>
  );
}
