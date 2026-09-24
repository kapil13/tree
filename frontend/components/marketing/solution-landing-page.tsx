import Link from "next/link";
import { ArrowRight, Leaf } from "lucide-react";

import { splitInlineLinks } from "@/lib/seo/inline-links";
import { faqPageJsonLd, JsonLd } from "@/lib/seo/json-ld";
import { HONESTY_DISCLAIMER } from "@/lib/seo/site";
import type { SolutionPage } from "@/lib/seo/solution-pages";

function ParagraphWithLinks({ text }: { text: string }) {
  const segments = splitInlineLinks(text);
  return (
    <p className="text-base leading-relaxed text-stone-700">
      {segments.map((segment, index) =>
        segment.type === "text" ? (
          <span key={index}>{segment.text}</span>
        ) : (
          <Link
            key={index}
            href={segment.href}
            className="font-medium text-forest-700 underline decoration-forest-200 underline-offset-2 hover:text-forest-800"
          >
            {segment.label}
          </Link>
        ),
      )}
    </p>
  );
}

export function SolutionLandingPage({ page }: { page: SolutionPage }) {
  return (
    <>
      <JsonLd data={faqPageJsonLd(page.faqs)} />

      <section className="marketing-hero relative overflow-hidden border-b border-forest-900/30">
        <div className="marketing-hero-noise" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-6 py-14 sm:py-16 lg:py-20">
          <div className="max-w-3xl">
            <span className="marketing-pill marketing-pill--hero">{page.eyebrow}</span>
            <h1 className="marketing-hero-headline mt-5">{page.title}</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-emerald-100/80 sm:text-lg">
              {page.intro}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={page.primaryCta.href} className="btn-primary bg-white px-6 py-3 text-base text-forest-900 shadow-lg shadow-black/20 hover:bg-emerald-50">
                {page.primaryCta.label}
              </Link>
              <Link
                href={page.secondaryCta.href}
                className="btn-secondary border-white/20 bg-white/10 px-5 py-3 text-base text-white hover:bg-white/15"
              >
                {page.secondaryCta.label}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
        <div className="space-y-12">
          {page.sections.map((section) => (
            <article key={section.heading} className="space-y-4">
              <h2 className="font-display text-2xl font-semibold text-stone-900">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <ParagraphWithLinks key={paragraph.slice(0, 48)} text={paragraph} />
              ))}
              {section.bullets && section.bullets.length > 0 ? (
                <ul className="space-y-2 pl-1">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3 text-sm leading-relaxed text-stone-700">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-forest-500" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>

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

        <section className="mt-12" aria-labelledby={`${page.slug}-faq`}>
          <h2 id={`${page.slug}-faq`} className="font-display text-2xl font-semibold text-stone-900">
            Frequently asked questions
          </h2>
          <dl className="mt-6 space-y-6">
            {page.faqs.map((faq) => (
              <div key={faq.question} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <dt className="text-base font-semibold text-stone-900">{faq.question}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-stone-700">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-12 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">Related pages</h2>
          <ul className="mt-4 space-y-2">
            {page.relatedLinks.map((link) => (
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
