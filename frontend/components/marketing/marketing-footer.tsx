"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { AranyixLogo } from "@/components/brand/aranyix-logo";
import type { CmsPublicSite } from "@/lib/cms-api";
import { CMS_FOOTER_FALLBACK, linkProps } from "@/lib/cms-defaults";
import { ensureSolutionsHubFooter } from "@/lib/marketing-solutions-nav";

const FOOTER_COLUMN_ORDER = ["Platform", "Solutions", "Contact", "Legal"] as const;

function orderFooterColumns(columns: CmsPublicSite["site"]["footer"]["columns"]) {
  const byTitle = new Map(columns.map((column) => [column.title, column]));
  const ordered = FOOTER_COLUMN_ORDER.map((title) => byTitle.get(title)).filter(Boolean);
  const rest = columns.filter((column) => !FOOTER_COLUMN_ORDER.includes(column.title as typeof FOOTER_COLUMN_ORDER[number]));
  return [...ordered, ...rest] as CmsPublicSite["site"]["footer"]["columns"];
}

export function MarketingFooter({ footer = CMS_FOOTER_FALLBACK }: { footer?: CmsPublicSite["site"]["footer"] }) {
  const t = useTranslations("marketing");
  const year = new Date().getFullYear();
  const columns = orderFooterColumns(ensureSolutionsHubFooter(footer).columns).filter(
    (column) => column.title !== "Programs" && column.title !== "Compliance",
  );

  return (
    <footer className="marketing-footer">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="space-y-4 lg:col-span-4">
            <AranyixLogo variant="compact" className="h-10 w-auto max-w-[11rem]" />
            <p className="max-w-sm text-sm leading-relaxed text-emerald-100/75">{footer.description}</p>
            <p className="text-xs text-emerald-100/50">{t("alsoKnownAs")}</p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-8 lg:grid-cols-3">
            {columns.map((col) => (
              <div key={col.title}>
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100/85">
                  {col.title}
                </h3>
                <ul className="mt-3 space-y-2">
                  {col.links.map((item) => {
                    const link = linkProps(item);
                    const href =
                      link.href === "/dashboard" || link.href.startsWith("/dashboard?")
                        ? "/auth?mode=signin&next=/dashboard"
                        : link.href;
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

        <div className="mt-8 flex flex-col gap-4 border-t border-white/10 pt-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-emerald-100/55">
            <span>© {year} {footer.copyright}</span>
            <span className="hidden h-3 w-px bg-white/15 sm:inline-block" aria-hidden />
            <span className="text-xs uppercase tracking-[0.14em]">{footer.legal_note}</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <Link href="/contact" className="font-medium text-emerald-100/75 transition hover:text-lime-300">
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
