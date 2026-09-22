import { MarketingShell } from "@/components/marketing/marketing-shell";
import { SolutionLandingPage } from "@/components/marketing/solution-landing-page";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getSolutionPage } from "@/lib/seo/solution-pages";

const page = getSolutionPage("/partners/agencies")!;

export const metadata = buildPageMetadata({
  title: "Government agency partnerships",
  description: page.description,
  path: page.path,
});

export default function AgencyPartnersPage() {
  return (
    <MarketingShell>
      <SolutionLandingPage page={page} />
    </MarketingShell>
  );
}
