import { MarketingShell } from "@/components/marketing/marketing-shell";
import { SolutionLandingPage } from "@/components/marketing/solution-landing-page";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getSolutionPage } from "@/lib/seo/solution-pages";

const page = getSolutionPage("/solutions/industrial-site-greening")!;

export const metadata = buildPageMetadata({
  title: "Industrial Green Belt Monitoring & Site Greening",
  description: page.description,
  path: page.path,
});

export default function IndustrialSiteGreeningPage() {
  return (
    <MarketingShell>
      <SolutionLandingPage page={page} />
    </MarketingShell>
  );
}
