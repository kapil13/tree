import Link from "next/link";
import { AranyixLogo } from "@/components/brand/aranyix-logo";
import type { CmsPublicSite } from "@/lib/cms-api";
import { CMS_HEADER_FALLBACK } from "@/lib/cms-defaults";

export function MarketingHeader({ header = CMS_HEADER_FALLBACK }: { header?: CmsPublicSite["site"]["header"] }) {
  return (
    <header className="marketing-header">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="shrink-0" aria-label="Aranyix home">
          <AranyixLogo className="h-11 w-auto max-w-[220px] sm:h-12 sm:max-w-[260px]" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {header.nav.map((item) => (
            <a key={item.href} href={item.href} className="marketing-nav-link">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link href={header.sign_in.href} className="btn-ghost hidden sm:inline-flex">
            {header.sign_in.label}
          </Link>
          <Link href={header.get_started.href} className="btn-primary">
            {header.get_started.label}
          </Link>
        </div>
      </div>
    </header>
  );
}
