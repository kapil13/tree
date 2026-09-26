import { HomePageContent } from "@/components/marketing/home-page-content";
import { homePageJsonLd, JsonLd } from "@/lib/seo/json-ld";
import { homePageMetadata } from "@/lib/seo/metadata";

export const metadata = homePageMetadata();

export default function HomePage() {
  return (
    <>
      <JsonLd data={homePageJsonLd()} />
      <HomePageContent />
    </>
  );
}
