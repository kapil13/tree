import { MarketingShell } from "@/components/marketing/marketing-shell";
import { SolutionLandingPage } from "@/components/marketing/solution-landing-page";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getSolutionPage } from "@/lib/seo/solution-pages";

const page = getSolutionPage("/solutions/csr-plantation")!;

export const metadata = buildPageMetadata({
  title: "CSR plantation monitoring",
  description: page.description,
  path: page.path,
});

export default function CsrPlantationPage() {
  return (
    <MarketingShell>
      <SolutionLandingPage page={page} />
    </MarketingShell>
  );
}
