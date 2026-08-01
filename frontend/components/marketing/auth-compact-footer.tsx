import Link from "next/link";
import type { CmsPublicSite } from "@/lib/cms-api";
import { CMS_FOOTER_FALLBACK, linkProps } from "@/lib/cms-defaults";

/**
 * Slim legal strip for auth — keeps brand continuity without the full
 * marketing footer that forces page scroll on sign-in.
 */
export function AuthCompactFooter({
  footer = CMS_FOOTER_FALLBACK,
}: {
  footer?: CmsPublicSite["site"]["footer"];
}) {
  const year = new Date().getFullYear();
  const legalLinks =
    footer.columns.find((c) => c.title.toLowerCase() === "legal")?.links ??
    footer.columns.flatMap((c) => c.links).slice(0, 3);

  return (
    <footer className="shrink-0 border-t border-forest-900/10 bg-[#031912]/95 text-emerald-50/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 py-3 text-xs sm:flex-row sm:gap-4">
        <p className="text-center text-emerald-100/55 sm:text-left">
          © {year} {footer.copyright}
          <span className="mx-2 text-emerald-100/25">·</span>
          <a
            href="https://www.axentis.tech"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-100/70 transition hover:text-lime-300"
          >
            Axentis Technologies
          </a>
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1" aria-label="Legal">
          {legalLinks.map((item) => {
            const link = linkProps(item);
            return (
              <Link
                key={link.href}
                href={link.href}
                className="text-emerald-100/60 transition hover:text-lime-300"
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </footer>
  );
}
