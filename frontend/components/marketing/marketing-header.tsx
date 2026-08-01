"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AranyixLogo } from "@/components/brand/aranyix-logo";
import type { CmsPublicSite } from "@/lib/cms-api";
import { CMS_HEADER_FALLBACK, linkProps } from "@/lib/cms-defaults";
import { cn } from "@/lib/cn";

export function MarketingHeader({
  header = CMS_HEADER_FALLBACK,
  authMode,
}: {
  header?: CmsPublicSite["site"]["header"];
  /** When set (auth surfaces), highlight the active CTA and fix hash nav links. */
  authMode?: "signin" | "signup";
}) {
  const pathname = usePathname();
  const onAuth =
    authMode != null || pathname === "/auth" || Boolean(pathname?.startsWith("/auth/"));

  const signIn = linkProps(header.sign_in);
  const getStarted = linkProps(header.get_started);
  const activeMode = authMode ?? "signin";

  return (
    <header className="marketing-header">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="shrink-0" aria-label="Aranyix home">
          <AranyixLogo className="h-11 w-auto max-w-[220px] sm:h-12 sm:max-w-[260px]" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {header.nav.map((item) => {
            const link = linkProps(item);
            // Hash links on marketing home are relative; from /auth send users home first.
            const href =
              onAuth && link.href.startsWith("#") ? `/${link.href}` : link.href;
            return (
              <a key={`${link.href}-${link.label}`} href={href} className="marketing-nav-link">
                {link.label}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {onAuth ? (
            <>
              <Link
                href="/auth?mode=signin"
                className={cn(
                  "btn-ghost hidden sm:inline-flex",
                  activeMode === "signin" && "bg-forest-50 text-forest-800",
                )}
                aria-current={activeMode === "signin" ? "page" : undefined}
              >
                {signIn.label}
              </Link>
              <Link
                href="/auth?mode=signup"
                className={cn(
                  "btn-primary",
                  activeMode === "signup" && "ring-2 ring-forest-500/30 ring-offset-2",
                )}
                aria-current={activeMode === "signup" ? "page" : undefined}
              >
                {getStarted.label}
              </Link>
            </>
          ) : (
            <>
              <Link href={signIn.href} className="btn-ghost hidden sm:inline-flex">
                {signIn.label}
              </Link>
              <Link href={getStarted.href} className="btn-primary">
                {getStarted.label}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
