import { MarketingPageView } from "@/components/marketing/marketing-page-view";

export default async function CmsPageRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <MarketingPageView slug={slug} />;
}
