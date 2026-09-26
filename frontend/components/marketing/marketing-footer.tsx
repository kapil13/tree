"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { AranyixLogo } from "@/components/brand/aranyix-logo";
import type { CmsPublicSite } from "@/lib/cms-api";
import { CMS_FOOTER_FALLBACK, linkProps } from "@/lib/cms-defaults";
import { VisitorCounter } from "@/components/marketing/visitor-counter";
import { useSiteVisitTracker } from "@/lib/use-site-visit-tracker";
import {
  resolveMarketingFooterLegalLinks,
  resolveMarketingFooterLinkColumns,
} from "@/lib/marketing-footer-content";

function resolveHref(href: string) {
  return href === "/dashboard" || href.startsWith("/dashboard?")
    ? "/auth?mode=signin&next=/dashboard"
    : href;
}

export function MarketingFooter({ footer = CMS_FOOTER_FALLBACK }: { footer?: CmsPublicSite["site"]["footer"] }) {
  useSiteVisitTracker(true);
  const t = useTranslations("marketing");
  const year = new Date().getFullYear();
  const linkColumns = resolveMarketingFooterLinkColumns(footer);
  const legalLinks = resolveMarketingFooterLegalLinks(footer);

  return (
    <footer className="marketing-footer">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-9">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
          <div className="max-w-sm shrink-0 space-y-3">
            <AranyixLogo variant="compact" className="h-10 w-auto max-w-[11rem]" />
            {footer.badge ? (
              <p className="inline-flex rounded-full border border-lime-300/25 bg-lime-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-lime-200/90">
                {footer.badge}
              </p>
            ) : null}
            <p className="text-sm leading-relaxed text-emerald-100/75">{footer.description}</p>
            <p className="text-xs text-emerald-100/50">{t("alsoKnownAs")}</p>
          </div>

          <div className="grid w-full grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 lg:max-w-3xl lg:flex-1">
            {linkColumns.map((col) => (
              <div key={col.title}>
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100/85">
                  {col.title}
                </h3>
                <ul className="mt-3 space-y-2">
                  {col.links.map((item) => {
                    const link = linkProps(item);
                    const href = resolveHref(link.href);
                    const className = "text-sm text-emerald-100/65 transition hover:text-lime-300";
                    return (
                      <li key={`${col.title}-${link.label}`}>
                        {href.startsWith("mailto:") ? (
                          <a href={href} className={className}>{link.label}</a>
                        ) : (
                          <Link href={href} className={className}>{link.label}</Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-sm text-emerald-100/55">
              © {year} {footer.copyright}
              <VisitorCounter />
            </p>
            {footer.legal_note ? (
              <p className="text-[11px] uppercase tracking-[0.12em] text-emerald-100/40">{footer.legal_note}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2">
            {legalLinks.length ? (
              <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                {legalLinks.map((item) => {
                  const link = linkProps(item);
                  return (
                    <Link
                      key={link.label}
                      href={resolveHref(link.href)}
                      className="text-emerald-100/60 transition hover:text-lime-300"
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            ) : null}
            <Link
              href="/contact"
              className="inline-flex w-fit items-center justify-center rounded-full border border-lime-300/30 bg-lime-400/10 px-4 py-1.5 text-sm font-medium text-lime-100 transition hover:border-lime-300/50 hover:bg-lime-400/20"
            >
              {t("contactFooterCta")}
            </Link>
            <a
              href="https://www.axentis.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-100/50 transition hover:text-lime-300"
            >
              {t("developedBy")} Axentis Technologies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
