"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { HeroEmblem } from "@/components/marketing/hero-emblem";
import { cmsIcon } from "@/lib/cms-icons";
import type { CmsSection } from "@/lib/cms-api";
import { linkProps } from "@/lib/cms-defaults";

function CtaLink({ cta, className }: { cta?: { label?: string; href?: string }; className?: string }) {
  const link = linkProps(cta as { label: string; href: string } | undefined);
  return (
    <Link href={link.href} className={className}>
      {link.label}
      {className?.includes("btn-primary") ? <ArrowRight className="h-4 w-4" /> : null}
    </Link>
  );
}

export function CmsSectionRenderer({ section }: { section: CmsSection }) {
  const c = section.content;

  switch (section.section_type) {
    case "hero":
      return (
        <section className="marketing-hero">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
            <div className="space-y-8">
              <div className="marketing-pill">
                {(() => {
                  const Icon = cmsIcon(String(c.pill_icon || "Sparkles"));
                  return <Icon className="h-3.5 w-3.5 text-lime-400" />;
                })()}
                {String(c.pill || "")}
              </div>
              <div className="space-y-5">
                <h1 className="marketing-hero-title">
                  {String(c.title || "")}
                  <span className="marketing-gradient-text"> {String(c.title_highlight || "")}</span>
                </h1>
                <p className="max-w-xl text-lg leading-relaxed text-stone-600">{String(c.subtitle || "")}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <CtaLink cta={c.primary_cta as { label: string; href: string }} className="btn-primary px-6 py-3 text-base" />
                <CtaLink cta={c.secondary_cta as { label: string; href: string }} className="btn-secondary px-6 py-3 text-base" />
              </div>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {(Array.isArray(c.stats) ? c.stats : []).map((stat: { value?: string; label?: string }) => (
                  <div key={String(stat.label)} className="marketing-stat">
                    <dt className="text-2xl font-bold text-forest-800">{stat.value}</dt>
                    <dd className="mt-1 text-xs leading-snug text-stone-500">{stat.label}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="relative mx-auto w-full max-w-[520px] lg:max-w-none">
              <div className="marketing-hero-visual">
                <HeroEmblem className="relative z-10 h-auto w-full drop-shadow-2xl" />
              </div>
              {(Array.isArray(c.float_cards) ? c.float_cards : []).map((card: Record<string, string>, i) => {
                const Icon = cmsIcon(card.icon);
                return (
                  <div
                    key={card.title}
                    className={`marketing-float-card ${i === 0 ? "marketing-float-card--left" : "marketing-float-card--right"}`}
                  >
                    <Icon className="h-4 w-4 text-lime-400" />
                    <div>
                      <p className="text-xs font-semibold text-white">{card.title}</p>
                      <p className="text-[11px] text-emerald-100/70">{card.subtitle}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      );

    case "features":
      return (
        <section id={section.anchor_id || undefined} className="mx-auto max-w-7xl px-6 py-20">
          <div className="marketing-section-head">
            <p className="marketing-eyebrow">{String(c.eyebrow || "")}</p>
            <h2 className="marketing-section-title">{String(c.title || "")}</h2>
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
                  <h3 className="mt-5 text-lg font-semibold text-stone-900">{item.title}</h3>
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
              <h2 className="marketing-section-title text-white">{String(c.title || "")}</h2>
              <p className="marketing-section-copy text-emerald-100/75">{String(c.copy || "")}</p>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <h2 className="marketing-section-title">{String(c.title || "")}</h2>
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
                  <h3 className="mt-5 text-xl font-semibold text-stone-900">{item.title}</h3>
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
              <h2 className="marketing-section-title">{String(c.title || "")}</h2>
              <p className="marketing-section-copy">{String(c.copy || "")}</p>
              <CtaLink cta={c.cta as { label: string; href: string }} className="btn-primary mt-8 inline-flex" />
            </div>
            <div className="space-y-4">
              {(Array.isArray(c.items) ? c.items : []).map((step: Record<string, string>) => (
                <article key={step.step} className="marketing-step-card">
                  <span className="marketing-step-number">{step.step}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-stone-900">{step.title}</h3>
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
                <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{String(c.title || "")}</h2>
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
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{String(c.title || "")}</h2>
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
        <section id={section.anchor_id || undefined} className="mx-auto max-w-3xl px-6 py-16 prose prose-stone">
          {c.html ? (
            <div dangerouslySetInnerHTML={{ __html: String(c.html) }} />
          ) : (
            <p className="whitespace-pre-wrap text-stone-700">{String(c.body || "")}</p>
          )}
        </section>
      );

    default:
      return null;
  }
}
