import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

import type { ResourceArticle } from "@/lib/content/resources";

const SOLUTION_LINKS = [
  { label: "CSR plantation monitoring", href: "/solutions/csr-plantation" },
  { label: "Mining green belt MRV", href: "/solutions/mining-greening" },
  { label: "CAMPA afforestation", href: "/solutions/campa-afforestation" },
  { label: "BRSR & ESG evidence", href: "/solutions/brsr-esg" },
  { label: "Plantation MRV product", href: "/product/mrv" },
  { label: "Government agency partnerships", href: "/partners/agencies" },
];

export function ResourcesHub({ articles }: { articles: ResourceArticle[] }) {
  return (
    <>
      <section className="marketing-hero relative overflow-hidden border-b border-forest-900/30">
        <div className="marketing-hero-noise" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-6 py-14 sm:py-16 lg:py-20">
          <div className="max-w-3xl">
            <span className="marketing-pill marketing-pill--hero">Resources</span>
            <h1 className="marketing-hero-headline mt-5">Plantation MRV guides and solution library</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-emerald-100/80 sm:text-lg">
              Practical guides for CSR plantations, mining green belts, geo-tagged field capture, and
              agency white-label programmes in India — with honest limits on what MRV software does and
              does not certify.
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-emerald-100/90 sm:text-base">
              Featured:{" "}
              <Link
                href="/resources/plantation-mrv-software-india"
                className="font-semibold text-white underline decoration-white/40 underline-offset-2 hover:text-emerald-50"
              >
                plantation MRV software India
              </Link>{" "}
              — how buyers shortlist geo-tags, survival tracking, and audit-prep exports with modeled
              estimates only.
            </p>
            <div className="mt-8">
              <Link
                href="/demo"
                className="btn-primary inline-flex bg-white px-6 py-3 text-base text-forest-900 shadow-lg shadow-black/20 hover:bg-emerald-50"
              >
                Book a demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 sm:py-16">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-50 text-forest-700">
            <BookOpen className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-2xl font-semibold text-stone-900">Latest guides</h2>
            <p className="mt-1 text-sm text-stone-600">
              Field-to-audit advice for corporates, mines, agencies, and programme partners.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {articles.map((article) => (
            <article
              key={article.slug}
              className="flex flex-col rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-forest-200 hover:shadow-md"
            >
              <time className="text-xs font-medium uppercase tracking-wide text-stone-500">
                {new Date(article.date).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </time>
              <h3 className="mt-3 font-display text-xl font-semibold text-stone-900">
                <Link href={`/resources/${article.slug}`} className="hover:text-forest-800">
                  {article.title}
                </Link>
              </h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-stone-600">{article.description}</p>
              <Link
                href={`/resources/${article.slug}`}
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-forest-700 hover:text-forest-800"
              >
                Read guide
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>

        <section className="mt-14 rounded-2xl border border-stone-200 bg-stone-50/80 p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-stone-900">Solution pages</h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            Match your programme type to a workflow overview, then return here for implementation detail.
          </p>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {SOLUTION_LINKS.map((link) => (
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
      </section>
    </>
  );
}
