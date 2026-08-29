"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Leaf, Mic } from "lucide-react";
import {
  BioacousticVisual,
  ComplianceOrbit,
  FieldMapVisual,
  HeroCommandVisual,
  IntelligenceRiver,
  PLATFORM_EDGES,
  ProgramScene,
  ReportPaper,
  SatelliteFusionVisual,
} from "@/components/marketing/marketing-visuals";
import { cmsIcon } from "@/lib/cms-icons";
import type { CmsSection } from "@/lib/cms-api";
import { linkProps } from "@/lib/cms-defaults";
import { sanitizeCmsHtml } from "@/lib/cms-sanitize";

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

function marketingSecondaryHref(href: string): string {
  if (href === "/dashboard" || href.startsWith("/dashboard?")) return "#how-it-works";
  return href;
}

const REPORT_ACCENTS = ["#14532d", "#0e7490", "#3f6212", "#1e3a5f", "#854d0e", "#4c1d95"];

const REPORT_GROUP_THEMES: Record<
  string,
  { icon: typeof Mic; accent: string; cardClass: string }
> = {
  bio: { icon: Mic, accent: "#0d9488", cardClass: "marketing-report-group--bio" },
  ghg: { icon: Leaf, accent: "#15803d", cardClass: "marketing-report-group--ghg" },
};

type ReportGroup = {
  id?: string;
  theme?: string;
  title?: string;
  subtitle?: string;
  items?: Array<Record<string, string>>;
};

function reportGroupsFromContent(c: Record<string, unknown>): ReportGroup[] {
  const raw = c.groups;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw as ReportGroup[];
  }
  const items = Array.isArray(c.items) ? (c.items as Array<Record<string, string>>) : [];
  if (items.length === 0) return [];
  return [{ id: "legacy", title: "", items }];
}

function complianceGroups(items: Array<Record<string, string>>) {
  const india = items.filter((i) =>
    /DPDP|NHAI|CAMPA|NGT|WCAG|BYOT|Green Credit|GCP|GIM|MISHTI|Nagar Van|Sahakar/i.test(
      `${i.code} ${i.title}`,
    ),
  );
  const carbon = items.filter((i) =>
    /VM0047|ICVCM|IPCC|ISO|BRSR|Gold|REDD|Paris|NDC/i.test(`${i.code} ${i.title}`),
  );
  const nature = items.filter((i) => !india.includes(i) && !carbon.includes(i));
  return [
    { title: "India & public programs", items: india },
    { title: "Carbon & disclosure", items: carbon },
    { title: "Nature & integrity", items: nature },
  ].filter((g) => g.items.length > 0);
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
                <p className="max-w-xl text-base leading-relaxed text-emerald-50/90 sm:text-lg">
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
                  className="btn-secondary border-white/20 bg-white/10 px-5 py-3 text-base text-white hover:bg-white/15"
                />
              </div>
            </div>
            <div className="marketing-hero-visual" aria-hidden>
              <HeroCommandVisual className="marketing-hero-emblem-inline" />
            </div>
          </div>
          {stats.length > 0 ? (
            <dl className="marketing-hero-ribbon">
              {stats.map((row) => (
                <div key={row.label} className="marketing-hero-ribbon-item">
                  <dt>{row.value}</dt>
                  <dd>{row.label}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <div className="marketing-hero-noise" aria-hidden />
        </section>
      );
    }

    case "stats": {
      const items = Array.isArray(c.items) ? (c.items as Array<Record<string, string>>) : [];
      return (
        <section className="marketing-stats-ribbon" aria-label="Platform scale">
          <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-8 px-6 py-10">
            {items.map((item) => (
              <div key={item.label} className="marketing-stats-metric">
                <p className="marketing-stats-num">{item.value}</p>
                <p className="marketing-stats-cap">{item.label}</p>
                {item.detail ? <p className="marketing-stats-sub">{item.detail}</p> : null}
              </div>
            ))}
          </div>
        </section>
      );
    }

    case "features": {
      const items = Array.isArray(c.items) ? (c.items as Array<Record<string, string>>) : [];
      const rest = items.slice(2);
      return (
        <section id={section.anchor_id || undefined} className="marketing-platform">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <div className="marketing-section-head">
              <p className="marketing-eyebrow">{String(c.eyebrow || "")}</p>
              <h2 className="marketing-section-title font-display">{String(c.title || "")}</h2>
              <p className="marketing-section-copy">{String(c.copy || "")}</p>
            </div>

            <div className="marketing-platform-mosaic">
              <article className="marketing-mosaic-map">
                <FieldMapVisual />
                {items[0] ? (
                  <div className="marketing-mosaic-caption">
                    <h3>{items[0].title}</h3>
                    <p>{items[0].description}</p>
                  </div>
                ) : null}
              </article>
              <article className="marketing-mosaic-sat">
                <SatelliteFusionVisual />
                {items[1] ? (
                  <div className="marketing-mosaic-caption marketing-mosaic-caption--on-dark">
                    <h3>{items[1].title}</h3>
                    <p>{items[1].description}</p>
                  </div>
                ) : null}
              </article>
            </div>

            <div className="marketing-bio-strip">
              <BioacousticVisual />
            </div>

            {rest.length > 0 ? (
              <ul className="marketing-capability-list">
                {rest.map((item) => {
                  const Icon = cmsIcon(item.icon);
                  return (
                    <li key={item.title}>
                      <Icon className="h-5 w-5 text-forest-700" />
                      <div>
                        <h3>{item.title}</h3>
                        <p>{item.description}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        </section>
      );
    }

    case "intelligence_pipeline": {
      return (
        <section id={section.anchor_id || undefined} className="marketing-river-section">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <div className="mx-auto max-w-2xl text-center">
              <p className="marketing-eyebrow">{String(c.eyebrow || "")}</p>
              <h2 className="marketing-section-title font-display">{String(c.title || "")}</h2>
              <p className="marketing-section-copy mx-auto">{String(c.copy || "")}</p>
            </div>
            <div className="mt-12">
              <IntelligenceRiver />
            </div>
            <ul className="marketing-edge-grid">
              {PLATFORM_EDGES.map((edge) => {
                const Icon = edge.icon;
                return (
                  <li key={edge.title}>
                    <Icon className="h-5 w-5" aria-hidden />
                    <strong>{edge.title}</strong>
                    <p>{edge.copy}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      );
    }

    case "compliance": {
      const items = Array.isArray(c.items) ? (c.items as Array<Record<string, string>>) : [];
      const groups = complianceGroups(items);
      return (
        <section id={section.anchor_id || undefined} className="marketing-band">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <div className="marketing-compliance-layout">
              <div>
                <p className="marketing-eyebrow marketing-eyebrow--light">{String(c.eyebrow || "")}</p>
                <h2 className="marketing-title-on-dark font-display">{String(c.title || "")}</h2>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-emerald-50/85">{String(c.copy || "")}</p>
              </div>
              <ComplianceOrbit codes={items.map((item) => String(item.code || item.title))} />
            </div>
            <div className="marketing-compliance-groups">
              {groups.map((group) => (
                <div key={group.title}>
                  <p className="marketing-compliance-group-title">{group.title}</p>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item.code || item.title}>
                        <span>{item.code}</span>
                        <strong>{item.title}</strong>
                        <p>{item.description}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }

    case "reports": {
      const groups = reportGroupsFromContent(c as Record<string, unknown>);
      const footerLink = c.footer_link as { label?: string; href?: string } | undefined;
      return (
        <section id={section.anchor_id || undefined} className="marketing-reports">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <div className="marketing-section-head">
              <p className="marketing-eyebrow">{String(c.eyebrow || "")}</p>
              <h2 className="marketing-section-title font-display">{String(c.title || "")}</h2>
              <p className="marketing-section-copy">{String(c.copy || "")}</p>
            </div>
            <div className="marketing-report-groups">
              {groups.map((group, groupIndex) => {
                const themeKey = String(group.theme || (groupIndex === 0 ? "bio" : "ghg"));
                const theme = REPORT_GROUP_THEMES[themeKey] ?? REPORT_GROUP_THEMES.bio!;
                const GroupIcon = theme.icon;
                const groupItems = Array.isArray(group.items) ? group.items : [];
                return (
                  <div
                    key={group.id || group.title || groupIndex}
                    className={`marketing-report-group ${theme.cardClass}`}
                  >
                    {group.title ? (
                      <header className="marketing-report-group-head">
                        <span className="marketing-report-group-icon" aria-hidden>
                          <GroupIcon className="h-5 w-5" />
                        </span>
                        <div>
                          <h3 className="marketing-report-group-title font-display">{group.title}</h3>
                          {group.subtitle ? (
                            <p className="marketing-report-group-subtitle">{group.subtitle}</p>
                          ) : null}
                        </div>
                      </header>
                    ) : null}
                    <div className="marketing-report-gallery">
                      {groupItems.map((item, i) => (
                        <ReportPaper
                          key={item.title}
                          tag={item.tag || "EXPORT"}
                          title={item.title}
                          description={item.description}
                          formats={item.formats || "PDF · XLSX"}
                          accent={
                            item.accent ||
                            REPORT_ACCENTS[(groupIndex * 3 + i) % REPORT_ACCENTS.length] ||
                            theme.accent
                          }
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            {footerLink?.label && footerLink?.href ? (
              <p className="marketing-reports-footer">
                <Link href={footerLink.href} className="marketing-reports-footer-link">
                  {footerLink.label}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </p>
            ) : null}
          </div>
        </section>
      );
    }

    case "programs": {
      const items = Array.isArray(c.items) ? (c.items as Array<Record<string, string>>) : [];
      return (
        <section id={section.anchor_id || undefined} className="marketing-programs">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <div className="marketing-section-head">
              <p className="marketing-eyebrow">{String(c.eyebrow || "")}</p>
              <h2 className="marketing-section-title font-display">{String(c.title || "")}</h2>
              <p className="marketing-section-copy">{String(c.copy || "")}</p>
            </div>
            <div className="mt-12 space-y-6">
              {items.map((item, i) => (
                <article key={item.title} className={i % 2 === 1 ? "marketing-program-row marketing-program-row--flip" : "marketing-program-row"}>
                  <div className="marketing-program-art">
                    <ProgramScene kind={item.title} />
                  </div>
                  <div className="marketing-program-copy">
                    {item.badge ? <span className="marketing-program-badge">{item.badge}</span> : null}
                    <h3 className="font-display text-2xl font-semibold text-stone-900">{item.title}</h3>
                    <p className="mt-3 text-base leading-relaxed text-stone-600">{item.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      );
    }

    case "steps": {
      const items = Array.isArray(c.items) ? (c.items as Array<Record<string, string>>) : [];
      return (
        <section id={section.anchor_id || undefined} className="marketing-timeline-section">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <div className="mx-auto max-w-2xl text-center">
              <p className="marketing-eyebrow">{String(c.eyebrow || "")}</p>
              <h2 className="marketing-section-title font-display">{String(c.title || "")}</h2>
              <p className="marketing-section-copy mx-auto">{String(c.copy || "")}</p>
              <CtaLink cta={c.cta as { label: string; href: string }} className="btn-primary mt-8 inline-flex" />
            </div>
            <ol className="marketing-timeline">
              {items.map((step) => (
                <li key={step.step}>
                  <span className="marketing-timeline-node">{step.step}</span>
                  <div>
                    <h3 className="font-display text-xl font-semibold text-stone-900">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-stone-600">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      );
    }

    case "platform_preview":
      return (
        <section className="mx-auto max-w-7xl px-6 pb-20">
          <div className="marketing-preview">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div className="space-y-6">
                <p className="marketing-eyebrow marketing-eyebrow--light">{String(c.eyebrow || "")}</p>
                <h2 className="marketing-title-on-dark font-display">{String(c.title || "")}</h2>
                <p className="text-base leading-relaxed text-emerald-50/85">{String(c.copy || "")}</p>
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
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/70">Live overview</p>
                    <p className="mt-1 text-lg font-semibold text-white">Plantation health</p>
                  </div>
                  <span className="rounded-full bg-lime-400/20 px-3 py-1 text-xs font-medium text-lime-200">Healthy</span>
                </div>
                <div className="grid grid-cols-3 gap-3 p-5">
                  {(Array.isArray(c.metrics) ? c.metrics : []).map((row: string[]) => (
                    <div key={row[1]} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xl font-semibold text-white">{row[0]}</p>
                      <p className="mt-1 text-[11px] text-emerald-100/75">{row[1]}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-3 px-5 pb-5">
                  {(Array.isArray(c.rows) ? c.rows : []).map((row: string[]) => (
                    <div key={row[0]} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                      <span className="text-sm text-emerald-50">{row[0]}</span>
                      <span className="text-xs font-medium text-lime-200">{row[1]}</span>
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
              <h2 className="marketing-title-on-dark font-display">{String(c.title || "")}</h2>
              <p className="mt-4 text-base leading-relaxed text-emerald-50/85">{String(c.copy || "")}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <CtaLink cta={c.primary_cta as { label: string; href: string }} className="btn-primary bg-white px-6 py-3 text-base text-forest-900 hover:bg-emerald-50" />
                <CtaLink cta={c.secondary_cta as { label: string; href: string }} className="btn-secondary border-white/25 bg-white/10 px-6 py-3 text-base text-white hover:bg-white/15" />
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
