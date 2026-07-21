import { MarketingPageView } from "@/components/marketing/marketing-page-view";

export default function CmsPageRoute({ params }: { params: { slug: string } }) {
  return <MarketingPageView slug={params.slug} />;
}
