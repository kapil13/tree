import { MarketingShell } from "@/components/marketing/marketing-shell";
import { ResourcesHub } from "@/components/marketing/resources-hub";
import { getAllResources } from "@/lib/content/resources";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "MRV resources & guides",
  description:
    "Practical plantation MRV guides for CSR, mining green belts, geo-tagged field capture, and agency white-label programmes in India.",
  path: "/resources",
});

export default async function ResourcesPage() {
  const articles = await getAllResources();

  return (
    <MarketingShell>
      <ResourcesHub articles={articles} />
    </MarketingShell>
  );
}
