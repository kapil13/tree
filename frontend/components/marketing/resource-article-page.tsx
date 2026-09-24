import Link from "next/link";
import { ArrowRight, Leaf } from "lucide-react";

import { faqPageJsonLd, JsonLd } from "@/lib/seo/json-ld";
import { HONESTY_DISCLAIMER } from "@/lib/seo/site";
import type { ResourceArticle } from "@/lib/content/resources";

const RELATED_LINKS = [
  { label: "CSR plantation MRV", href: "/solutions/csr-plantation" },
  { label: "Mining green belt monitoring", href: "/solutions/mining-greening" },
  { label: "BRSR & ESG evidence", href: "/solutions/brsr-esg" },
  { label: "Plantation MRV product", href: "/product/mrv" },
  { label: "Book a demo", href: "/demo" },
];

export type ResourceGuideLink = {
  title: string;
  slug: string;
};

export function ResourceArticlePage({
  article,
  relatedGuides,
}: {
  article: ResourceArticle;
  relatedGuides: ResourceGuideLink[];
}) {
  const published = new Date(article.date).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      {article.faqs.length > 0 ? <JsonLd data={faqPageJsonLd(article.faqs)} /> : null}

      <section className="marketing-hero relative overflow-hidden border-b border-forest-900/30">
        <div className="marketing-hero-noise" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-6 py-14 sm:py-16 lg:py-20">
          <div className="max-w-3xl">
            <span className="marketing-pill marketing-pill--hero">Resource guide</span>
            <h1 className="marketing-hero-headline mt-5">{article.title}</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-emerald-100/80 sm:text-lg">
              {article.description}
            </p>
            <p className="mt-3 text-sm text-emerald-100/60">Published {published}</p>
          </div>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <div
          className="resource-prose"
          dangerouslySetInnerHTML={{ __html: article.contentHtml }}
        />

        {article.faqHtml ? (
          <div
            className="resource-prose mt-12 border-t border-stone-200 pt-10"
            dangerouslySetInnerHTML={{ __html: article.faqHtml }}
          />
        ) : null}

        <aside className="mt-12 rounded-2xl border border-forest-100 bg-forest-50/70 p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-forest-700 shadow-sm">
              <Leaf className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-forest-900">Important</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-700">{HONESTY_DISCLAIMER}</p>
            </div>
          </div>
        </aside>

        {article.ctaHtml ? (
          <div
            className="resource-prose mt-10 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
            dangerouslySetInnerHTML={{ __html: article.ctaHtml }}
          />
        ) : null}

        <section className="mt-10 rounded-2xl bg-forest-900 px-6 py-6 text-white shadow-sm">
          <h2 className="text-lg font-semibold">Book a 90-day Plant → Track → Report pilot</h2>
          <p className="mt-2 text-sm leading-relaxed text-emerald-50/90">
            Walk through geo-tagged registration, survival tracking, and audit-prep exports on one
            bounded site. Modeled figures stay estimates. Aranyix does not issue registry carbon
            credits and is not a certification body.
          </p>
          <Link
            href="/demo"
            className="btn-primary mt-5 inline-flex items-center gap-2 bg-white px-5 py-2.5 text-sm text-forest-900 shadow-lg shadow-black/20 hover:bg-emerald-50"
          >
            Book a demo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        {relatedGuides.length > 0 ? (
          <section className="mt-10 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-stone-900">Related reading</h2>
            <ul className="mt-4 space-y-2">
              {relatedGuides.map((guide) => (
                <li key={guide.slug}>
                  <Link
                    href={`/resources/${guide.slug}`}
                    className="inline-flex items-center gap-2 text-sm font-medium text-forest-700 hover:text-forest-800"
                  >
                    {guide.title}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-12 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">Explore Aranyix</h2>
          <ul className="mt-4 space-y-2">
            {RELATED_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex items-center gap-2 text-sm font-medium text-forest-700 hover:text-forest-800"
                >
                  {link.label}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-8 text-center text-sm text-stone-500">
          <Link href="/resources" className="font-medium text-forest-700 hover:text-forest-800">
            ← Back to all resources
          </Link>
        </p>
      </article>
    </>
  );
}
