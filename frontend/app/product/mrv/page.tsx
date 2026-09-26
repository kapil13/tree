import { MarketingShell } from "@/components/marketing/marketing-shell";
import { SolutionLandingPage } from "@/components/marketing/solution-landing-page";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getSolutionPage } from "@/lib/seo/solution-pages";

const page = getSolutionPage("/product/mrv")!;

export const metadata = buildPageMetadata({
  title: "Plantation MRV platform",
  description: page.description,
  path: page.path,
});

export default function ProductMrvPage() {
  return (
    <MarketingShell>
      <SolutionLandingPage page={page} />
    </MarketingShell>
  );
}
