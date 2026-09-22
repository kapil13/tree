import { HomePageContent } from "@/components/marketing/home-page-content";
import { homePageJsonLd, JsonLd } from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { DEFAULT_DESCRIPTION } from "@/lib/seo/site";

export const metadata = buildPageMetadata({
  title: "Intelligence for a Thriving Planet",
  description: DEFAULT_DESCRIPTION,
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <JsonLd data={homePageJsonLd()} />
      <HomePageContent />
    </>
  );
}
