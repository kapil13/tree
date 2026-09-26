import Link from "next/link";
import { ArrowRight, Leaf } from "lucide-react";

import { JsonLd } from "@/lib/seo/json-ld";
import { HONESTY_DISCLAIMER } from "@/lib/seo/site";
import { getSolutionPage } from "@/lib/seo/solution-pages";
import { solutionHubBreadcrumbJsonLd } from "@/lib/seo/structured-data";

const SOLUTION_PATHS = [
  { path: "/solutions/csr-plantation", title: "CSR plantation" },
  { path: "/solutions/mining-greening", title: "Mining greening" },
  { path: "/solutions/campa-afforestation", title: "CAMPA afforestation" },
  { path: "/solutions/brsr-esg", title: "BRSR / ESG" },
  { path: "/solutions/industrial-site-greening", title: "Industrial site greening" },
] as const;

const INDUSTRIAL_RESOURCE = {
  href: "/resources/industrial-green-belt-monitoring-india",
  title: "Industrial green belt monitoring in India",
  description:
    "A guide for oil, construction, and environmental-clearance green belts — geo-tagged survival tracking and audit-prep exports with modeled estimates only.",
};

export function SolutionsHub() {
  const solutions = SOLUTION_PATHS.map((item) => {
    const page = getSolutionPage(item.path);
    if (!page) {
      throw new Error(`Missing solution page ${item.path}`);
    }
    return { ...item, eyebrow: page.eyebrow, description: page.description };
  });

  return (
    <>
      <JsonLd data={solutionHubBreadcrumbJsonLd()} />
      <section className="marketing-hero relative overflow-hidden border-b border-forest-900/30">
        <div className="marketing-hero-noise" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-6 py-14 sm:py-16 lg:py-20">
          <div className="max-w-3xl">
            <span className="marketing-pill marketing-pill--hero">Solutions</span>
            <h1 className="marketing-hero-headline mt-5">
              Plantation MRV solutions for CSR, mining, CAMPA, and BRSR
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-emerald-100/80 sm:text-lg">
              Geo-tagged plantation monitoring for Indian CSR programmes, mining green belts, CAMPA
              afforestation, BRSR evidence, and industrial site greening. Survival tracking and
              audit-prep exports, with modeled estimates only.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/demo"
                className="btn-primary inline-flex bg-white px-6 py-3 text-base text-forest-900 shadow-lg shadow-black/20 hover:bg-emerald-50"
              >
                Book a demo
              </Link>
              <Link
                href="/contact"
                className="btn-secondary border-white/20 bg-white/10 px-5 py-3 text-base text-white hover:bg-white/15"
              >
                Request a pilot
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 sm:py-16">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-stone-900">Programme solutions</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
            Five live workflows. Each page explains the evidence to collect and how Aranyix supports
            audit-prep reporting.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {solutions.map((solution) => (
            <article
              key={solution.path}
              className="flex flex-col rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-forest-200 hover:shadow-md"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{solution.eyebrow}</p>
              <h3 className="mt-3 font-display text-xl font-semibold text-stone-900">
                <Link href={solution.path} className="hover:text-forest-800">
                  {solution.title}
                </Link>
              </h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-stone-600">{solution.description}</p>
              <Link
                href={solution.path}
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-forest-700 hover:text-forest-800"
              >
                View solution
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>

        <section className="mt-14 rounded-2xl border border-stone-200 bg-stone-50/80 p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-stone-900">Industrial green belt guide</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
            Oil, construction, and campus green belts use the same evidence stack as the{" "}
            <Link
              href="/solutions/industrial-site-greening"
              className="font-medium text-forest-800 underline decoration-forest-200 underline-offset-2"
            >
              industrial site greening
            </Link>{" "}
            solution. This resource is the longer guide.
          </p>
          <article className="mt-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h3 className="font-display text-xl font-semibold text-stone-900">
              <Link href={INDUSTRIAL_RESOURCE.href} className="hover:text-forest-800">
                {INDUSTRIAL_RESOURCE.title}
              </Link>
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-stone-600">{INDUSTRIAL_RESOURCE.description}</p>
            <Link
              href={INDUSTRIAL_RESOURCE.href}
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-forest-700 hover:text-forest-800"
            >
              Read the guide
              <ArrowRight className="h-4 w-4" />
            </Link>
          </article>
        </section>

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
      </section>
    </>
  );
}
