import { MarketingShell } from "@/components/marketing/marketing-shell";
import { SolutionLandingPage } from "@/components/marketing/solution-landing-page";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getSolutionPage } from "@/lib/seo/solution-pages";

const page = getSolutionPage("/solutions/campa-afforestation")!;

export const metadata = buildPageMetadata({
  title: "CAMPA afforestation MRV",
  description: page.description,
  path: page.path,
});

export default function CampaAfforestationPage() {
  return (
    <MarketingShell>
      <SolutionLandingPage page={page} />
    </MarketingShell>
  );
}
