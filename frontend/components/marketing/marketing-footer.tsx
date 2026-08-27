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
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="space-y-5">
            <AranyixLogo className="h-12 w-auto max-w-[260px]" />
            <p className="max-w-sm text-sm leading-relaxed text-emerald-100/75">{footer.description}</p>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-emerald-100/70">
              <Leaf className="h-3.5 w-3.5 text-lime-300" />
              {footer.badge}
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
                  return (
                    <li key={`${col.title}-${link.label}`}>
                      <Link href={href} className="text-sm text-emerald-100/65 transition hover:text-lime-300">
                        {link.label}
                      </Link>
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
