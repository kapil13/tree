import { MarketingShell } from "@/components/marketing/marketing-shell";
import { SolutionsHub } from "@/components/marketing/solutions-hub";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Plantation MRV Solutions for CSR, Mining, CAMPA & BRSR",
  description:
    "Plantation MRV for CSR, mining green belts, CAMPA afforestation, and BRSR evidence in India — geo-tagged survival tracking and audit-prep exports with modeled estimates only.",
  path: "/solutions",
});

export default function SolutionsPage() {
  return (
    <MarketingShell>
      <SolutionsHub />
    </MarketingShell>
  );
}
