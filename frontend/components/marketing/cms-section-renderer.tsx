"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { HeroEmblem } from "@/components/marketing/hero-emblem";
import { MarketingIntelligenceFlow } from "@/components/marketing/marketing-intelligence-flow";
import { cmsIcon } from "@/lib/cms-icons";
import type { CmsSection } from "@/lib/cms-api";
import { linkProps } from "@/lib/cms-defaults";
import { sanitizeCmsHtml } from "@/lib/cms-sanitize";

/** Lightweight Markdown-ish renderer for CMS legal/plain bodies (`#`, `##`, paragraphs). */
function LegalPlainBody({ text }: { text: string }) {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <div className="space-y-4 text-stone-700">
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;
        if (trimmed.startsWith("# ")) {
          return (
            <h1 key={i} className="text-3xl font-semibold tracking-tight text-forest-900">
              {trimmed.slice(2)}
            </h1>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={i} className="mt-8 text-xl font-semibold text-forest-900">
              {trimmed.slice(3)}
            </h2>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap leading-relaxed">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

function CtaLink({
  cta,
  className,
  hrefOverride,
}: {
  cta?: { label?: string; href?: string };
  className?: string;
  hrefOverride?: string;
}) {
  const link = linkProps(cta as { label: string; href: string } | undefined);
  const href = hrefOverride ?? link.href;
  if (href.startsWith("#")) {
    return (
      <a href={href} className={className}>
        {link.label}
        {className?.includes("btn-primary") ? <ArrowRight className="h-4 w-4" /> : null}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {link.label}
      {className?.includes("btn-primary") ? <ArrowRight className="h-4 w-4" /> : null}
    </Link>
  );
}

/** Cold-traffic secondary CTAs should not deep-link into /dashboard. */
function marketingSecondaryHref(href: string): string {
  if (href === "/dashboard" || href.startsWith("/dashboard?")) return "#how-it-works";
  return href;
}

export function CmsSectionRenderer({ section }: { section: CmsSection }) {
  const c = section.content;

  switch (section.section_type) {
    case "hero": {
      const secondary = linkProps(c.secondary_cta as { label: string; href: string } | undefined);
      const secondaryHref = marketingSecondaryHref(secondary.href);
      const PillIcon = cmsIcon(String(c.pill_icon || "Sparkles"));
      const stats = Array.isArray(c.stats) ? (c.stats as Array<Record<string, string>>) : [];
      const title = String(c.title || "");
      const highlight = String(c.title_highlight || "");
      return (
        <section className="marketing-hero">
          <div className="marketing-hero-grid relative z-10 mx-auto min-h-[min(92vh,54rem)] max-w-7xl px-6 py-16 sm:py-20 lg:py-24">
            <div className="marketing-hero-copy space-y-7">
              {c.pill ? (
                <p className="marketing-pill marketing-pill--hero motion-fade-up">
                  <PillIcon className="h-3.5 w-3.5" />
                  {String(c.pill)}
                </p>
              ) : null}
              <div className="space-y-4 motion-fade-up-delay">
                <h1 className="marketing-hero-headline font-display">
                  {title}
                  {highlight ? (
                    <>
                      <br />
                      <span className="marketing-gradient-text">{highlight}</span>
                    </>
                  ) : null}
                </h1>
                <p className="max-w-xl text-base leading-relaxed text-emerald-50/82 sm:text-lg">
                  {String(c.subtitle || "")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 motion-fade-up-delay">
                <CtaLink
                  cta={c.primary_cta as { label: string; href: string }}
                  className="btn-primary bg-white px-6 py-3 text-base text-forest-900 shadow-lg shadow-black/20 hover:bg-emerald-50"
                />
                <CtaLink
                  cta={c.secondary_cta as { label: string; href: string }}
                  hrefOverride={secondaryHref}
                  className="btn-secondary border-white/15 bg-white/5 px-5 py-3 text-base text-white hover:bg-white/10"
                />
              </div>
              {stats.length > 0 ? (
                <dl className="marketing-hero-stats motion-fade-up-delay">
                  {stats.map((row) => (
                    <div key={row.label} className="marketing-hero-stat">
                      <dt className="marketing-hero-stat-value">{row.value}</dt>
                      <dd className="marketing-hero-stat-label">{row.label}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
            <div className="marketing-hero-visual motion-soft-glow" aria-hidden>
              <HeroEmblem className="marketing-hero-emblem-inline" />
            </div>
          </div>
          <div className="marketing-hero-noise" aria-hidden />
        </section>
      );
    }

    case "stats":
      return (
        <section className="marketing-stats-band">
          <div className="mx-auto grid max-w-7xl gap-4 px-6 py-8 sm:grid-cols-2 lg:grid-cols-4">
            {(Array.isArray(c.items) ? c.items : []).map((item: Record<string, string>) => (
              <article key={item.label} className="marketing-stat-tile">
                <p className="marketing-stat-value">{item.value}</p>
                <p className="marketing-stat-label">{item.label}</p>
                {item.detail ? <p className="marketing-stat-detail">{item.detail}</p> : null}
              </article>
            ))}
          </div>
        </section>
      );

    case "intelligence_pipeline":
      return (
        <section id={section.anchor_id || undefined} className="marketing-band">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <p className="marketing-eyebrow marketing-eyebrow--light text-center">
              {String(c.eyebrow || "")}
            </p>
            <MarketingIntelligenceFlow title={String(c.title || "")} copy={String(c.copy || "")} />
          </div>
        </section>
      );

    case "reports":
      return (
        <section id={section.anchor_id || undefined} className="mx-auto max-w-7xl px-6 py-20">
          <div className="marketing-section-head">
            <p className="marketing-eyebrow">{String(c.eyebrow || "")}</p>
            <h2 className="marketing-section-title font-display">{String(c.title || "")}</h2>
            <p className="marketing-section-copy">{String(c.copy || "")}</p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(Array.isArray(c.items) ? c.items : []).map((item: Record<string, string>) => {
              const Icon = cmsIcon(item.icon);
              return (
                <article key={item.title} className="marketing-report-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="marketing-report-icon">
                      <Icon className="h-5 w-5" />
                    </div>
                    {item.tag ? <span className="marketing-report-tag">{item.tag}</span> : null}
                  </div>
                  <h3 className="mt-5 font-display text-lg font-semibold text-stone-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">{item.description}</p>
                </article>
              );
            })}
          </div>
        </section>
      );

    case "features":
      return (
        <section id={section.anchor_id || undefined} className="mx-auto max-w-7xl px-6 py-20">
          <div className="marketing-section-head">
            <p className="marketing-eyebrow">{String(c.eyebrow || "")}</p>
            <h2 className="marketing-section-title font-display">{String(c.title || "")}</h2>
            <p className="marketing-section-copy">{String(c.copy || "")}</p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {(Array.isArray(c.items) ? c.items : []).map((item: Record<string, string>) => {
              const Icon = cmsIcon(item.icon);
              return (
                <article key={item.title} className={`marketing-feature-card bg-gradient-to-br ${item.accent || ""}`}>
                  <div className="marketing-feature-icon">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 font-display text-lg font-semibold text-stone-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">{item.description}</p>
                </article>
              );
            })}
          </div>
        </section>
      );

    case "compliance":
      return (
        <section id={section.anchor_id || undefined} className="marketing-band">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <div className="marketing-section-head marketing-section-head--light">
              <p className="marketing-eyebrow marketing-eyebrow--light">{String(c.eyebrow || "")}</p>
              <h2 className="marketing-section-title font-display text-white">{String(c.title || "")}</h2>
              <p className="marketing-section-copy text-emerald-100/75">{String(c.copy || "")}</p>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {(Array.isArray(c.items) ? c.items : []).map((item: Record<string, string>) => {
                const Icon = cmsIcon(item.icon);
                return (
                  <article key={item.code} className="marketing-compliance-tile">
                    <div className="flex items-start justify-between gap-3">
                      <div className="marketing-compliance-icon">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="marketing-compliance-code">{item.code}</span>
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-white">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-emerald-100/70">{item.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      );

    case "programs":
      return (
        <section id={section.anchor_id || undefined} className="mx-auto max-w-7xl px-6 py-20">
          <div className="marketing-section-head">
            <p className="marketing-eyebrow">{String(c.eyebrow || "")}</p>
            <h2 className="marketing-section-title font-display">{String(c.title || "")}</h2>
            <p className="marketing-section-copy">{String(c.copy || "")}</p>
          </div>
          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            {(Array.isArray(c.items) ? c.items : []).map((item: Record<string, string>) => {
              const Icon = cmsIcon(item.icon);
              return (
                <article key={item.title} className="marketing-program-card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="marketing-program-icon">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="marketing-program-badge">{item.badge}</span>
                  </div>
                  <h3 className="mt-5 font-display text-xl font-semibold text-stone-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">{item.description}</p>
                </article>
              );
            })}
          </div>
        </section>
      );

    case "steps":
      return (
        <section id={section.anchor_id || undefined} className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid items-start gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="marketing-section-head lg:sticky lg:top-28">
              <p className="marketing-eyebrow">{String(c.eyebrow || "")}</p>
              <h2 className="marketing-section-title font-display">{String(c.title || "")}</h2>
              <p className="marketing-section-copy">{String(c.copy || "")}</p>
              <CtaLink cta={c.cta as { label: string; href: string }} className="btn-primary mt-8 inline-flex" />
            </div>
            <div className="space-y-4">
              {(Array.isArray(c.items) ? c.items : []).map((step: Record<string, string>) => (
                <article key={step.step} className="marketing-step-card">
                  <span className="marketing-step-number">{step.step}</span>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-stone-900">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-stone-600">{step.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      );

    case "platform_preview":
      return (
        <section className="mx-auto max-w-7xl px-6 pb-20">
          <div className="marketing-preview">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div className="space-y-6">
                <p className="marketing-eyebrow marketing-eyebrow--light">{String(c.eyebrow || "")}</p>
                <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">{String(c.title || "")}</h2>
                <p className="text-sm leading-relaxed text-emerald-100/75">{String(c.copy || "")}</p>
                <ul className="space-y-3">
                  {(Array.isArray(c.bullets) ? c.bullets : []).map((point: string) => (
                    <li key={point} className="flex items-start gap-3 text-sm text-emerald-50/90">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-lime-300" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="marketing-preview-panel">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/60">Live overview</p>
                    <p className="mt-1 text-lg font-semibold text-white">Plantation health</p>
                  </div>
                  <span className="rounded-full bg-lime-400/15 px-3 py-1 text-xs font-medium text-lime-300">Healthy</span>
                </div>
                <div className="grid grid-cols-3 gap-3 p-5">
                  {(Array.isArray(c.metrics) ? c.metrics : []).map((row: string[]) => (
                    <div key={row[1]} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xl font-semibold text-white">{row[0]}</p>
                      <p className="mt-1 text-[11px] text-emerald-100/65">{row[1]}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-3 px-5 pb-5">
                  {(Array.isArray(c.rows) ? c.rows : []).map((row: string[]) => (
                    <div key={row[0]} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                      <span className="text-sm text-emerald-50/85">{row[0]}</span>
                      <span className="text-xs font-medium text-lime-300">{row[1]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      );

    case "cta":
      return (
        <section className="mx-auto max-w-7xl px-6 pb-24">
          <div className="marketing-cta">
            <div className="relative z-10 max-w-2xl">
              <p className="marketing-eyebrow marketing-eyebrow--light">{String(c.eyebrow || "")}</p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">{String(c.title || "")}</h2>
              <p className="mt-4 text-sm leading-relaxed text-emerald-100/75">{String(c.copy || "")}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <CtaLink cta={c.primary_cta as { label: string; href: string }} className="btn-primary bg-white px-6 py-3 text-base text-forest-900 hover:bg-emerald-50" />
                <CtaLink cta={c.secondary_cta as { label: string; href: string }} className="btn-secondary border-white/20 bg-white/5 px-6 py-3 text-base text-white hover:bg-white/10" />
              </div>
            </div>
          </div>
        </section>
      );

    case "rich_text":
      return (
        <section
          id={section.anchor_id || undefined}
          className="mx-auto max-w-3xl px-6 py-16 prose prose-stone prose-headings:text-forest-900"
        >
          {c.html ? (
            <div dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(String(c.html)) }} />
          ) : (
            <LegalPlainBody text={String(c.body || "")} />
          )}
        </section>
      );

    default:
      return null;
  }
}
