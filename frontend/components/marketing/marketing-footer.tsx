"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { AranyixLogo } from "@/components/brand/aranyix-logo";
import type { CmsPublicSite } from "@/lib/cms-api";
import { CMS_FOOTER_FALLBACK, linkProps } from "@/lib/cms-defaults";
import { ensureSolutionsHubFooter } from "@/lib/marketing-solutions-nav";

const FOOTER_LINK_COLUMN_ORDER = ["Platform", "Solutions", "Contact"] as const;

function orderFooterColumns(columns: CmsPublicSite["site"]["footer"]["columns"]) {
  const byTitle = new Map(columns.map((column) => [column.title, column]));
  const ordered = FOOTER_LINK_COLUMN_ORDER.map((title) => byTitle.get(title)).filter(Boolean);
  const rest = columns.filter(
    (column) =>
      !FOOTER_LINK_COLUMN_ORDER.includes(column.title as typeof FOOTER_LINK_COLUMN_ORDER[number]) &&
      column.title !== "Legal",
  );
  return [...ordered, ...rest] as CmsPublicSite["site"]["footer"]["columns"];
}

function resolveHref(href: string) {
  return href === "/dashboard" || href.startsWith("/dashboard?")
    ? "/auth?mode=signin&next=/dashboard"
    : href;
}

export function MarketingFooter({ footer = CMS_FOOTER_FALLBACK }: { footer?: CmsPublicSite["site"]["footer"] }) {
  const t = useTranslations("marketing");
  const year = new Date().getFullYear();
  const normalized = ensureSolutionsHubFooter(footer);
  const legalColumn = normalized.columns.find((column) => column.title === "Legal");
  const linkColumns = orderFooterColumns(normalized.columns).filter(
    (column) =>
      column.title !== "Programs" &&
      column.title !== "Compliance" &&
      column.title !== "Legal",
  );

  return (
    <footer className="marketing-footer">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-start lg:gap-x-10">
          <div className="space-y-3 lg:col-span-4">
            <AranyixLogo variant="compact" className="h-10 w-auto max-w-[11rem]" />
            {footer.badge ? (
              <p className="inline-flex rounded-full border border-lime-300/25 bg-lime-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-lime-200/90">
                {footer.badge}
              </p>
            ) : null}
            <p className="max-w-sm text-sm leading-relaxed text-emerald-100/75">{footer.description}</p>
            <p className="text-xs text-emerald-100/50">{t("alsoKnownAs")}</p>
          </div>

          <div className="grid grid-cols-2 gap-6 sm:gap-8 lg:col-span-8 lg:grid-cols-3">
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

        <div className="mt-6 flex flex-col gap-4 border-t border-white/10 pt-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2">
            <span className="text-sm text-emerald-100/55">© {year} {footer.copyright}</span>
            {footer.legal_note ? (
              <>
                <span className="hidden h-3 w-px bg-white/15 sm:inline-block" aria-hidden />
                <span className="text-xs uppercase tracking-[0.14em] text-emerald-100/45">{footer.legal_note}</span>
              </>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            {legalColumn?.links.length ? (
              <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                {legalColumn.links.map((item) => {
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
              className="inline-flex items-center justify-center rounded-full border border-lime-300/30 bg-lime-400/10 px-4 py-1.5 text-sm font-medium text-lime-100 transition hover:border-lime-300/50 hover:bg-lime-400/20"
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
