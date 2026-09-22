"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { AranyixLogo } from "@/components/brand/aranyix-logo";
import { Leaf } from "lucide-react";
import type { CmsPublicSite } from "@/lib/cms-api";
import { CMS_FOOTER_FALLBACK, linkProps } from "@/lib/cms-defaults";

export function MarketingFooter({ footer = CMS_FOOTER_FALLBACK }: { footer?: CmsPublicSite["site"]["footer"] }) {
  const t = useTranslations("marketing");
  const year = new Date().getFullYear();

  return (
    <footer className="marketing-footer">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.35fr_repeat(4,minmax(0,1fr))]">
          <div className="space-y-5 sm:col-span-2 lg:col-span-1">
            <AranyixLogo className="h-12 w-auto max-w-[260px]" />
            <p className="max-w-sm text-sm leading-relaxed text-emerald-100/75">{footer.description}</p>
            <div className="inline-flex max-w-sm items-start gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-[11px] font-medium uppercase leading-snug tracking-[0.12em] text-emerald-100/75 sm:text-xs">
              <Leaf className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime-300" />
              <span>{footer.badge}</span>
            </div>
            <div className="space-y-1 text-sm text-emerald-100/70">
              <p className="font-medium text-white">{t("contactTitle")}</p>
              <a
                href="mailto:kapil@axentis.tech"
                className="transition hover:text-lime-300"
              >
                kapil@axentis.tech
              </a>
              <p className="text-xs text-emerald-100/55">{t("contactHint")}</p>
            </div>
          </div>

          {footer.columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-white">{col.title}</h3>
              <ul className="mt-4 space-y-2.5">
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

        <div className="mt-12 border-t border-white/10 pt-6">
          <div className="flex flex-col items-center justify-between gap-3 text-sm text-emerald-100/55 sm:flex-row">
            <span>
              © {year} {footer.copyright}
            </span>
            <span className="text-xs uppercase tracking-[0.18em]">{footer.legal_note}</span>
          </div>
          <p className="mt-4 text-center text-xs text-emerald-100/50 sm:text-left">
            {t("developedBy")}{" "}
            <a
              href="https://www.axentis.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-emerald-100/70 underline decoration-emerald-100/25 underline-offset-2 transition hover:text-lime-300"
            >
              Axentis Technologies Pvt Ltd
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
