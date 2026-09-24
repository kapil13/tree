import { notFound } from "next/navigation";

import { MarketingShell } from "@/components/marketing/marketing-shell";
import { ResourceArticlePage } from "@/components/marketing/resource-article-page";
import { getAllResources, getPublishedResourceSlugs, getResourceBySlug } from "@/lib/content/resources";
import { buildPageMetadata } from "@/lib/seo/metadata";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const slugs = await getPublishedResourceSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const article = await getResourceBySlug(slug);

  if (!article) {
    return buildPageMetadata({
      title: "Resource not found",
      description: "The requested guide could not be found.",
      path: `/resources/${slug}`,
    });
  }

  return buildPageMetadata({
    title: article.title,
    description: article.description,
    path: `/resources/${slug}`,
  });
}

export default async function ResourceSlugPage({ params }: PageProps) {
  const { slug } = await params;
  const articles = await getAllResources();
  const article = articles.find((item) => item.slug === slug);

  if (!article) {
    notFound();
  }

  const relatedGuides = articles
    .filter((item) => item.slug !== article.slug)
    .map((item) => ({ title: item.title, slug: item.slug }));

  return (
    <MarketingShell>
      <ResourceArticlePage article={article} relatedGuides={relatedGuides} />
    </MarketingShell>
  );
}
