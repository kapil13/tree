"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { AranyixLogo } from "@/components/brand/aranyix-logo";
import type { CmsPublicSite } from "@/lib/cms-api";
import { CMS_HEADER_FALLBACK, linkProps } from "@/lib/cms-defaults";
import { cn } from "@/lib/cn";

export function MarketingHeader({
  header = CMS_HEADER_FALLBACK,
  authMode,
  compact = false,
}: {
  header?: CmsPublicSite["site"]["header"];
  /** When set (auth surfaces), highlight the active CTA and fix hash nav links. */
  authMode?: "signin" | "signup";
  /** Tighter chrome for single-viewport surfaces like auth */
  compact?: boolean;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const onAuth =
    authMode != null || pathname === "/auth" || Boolean(pathname?.startsWith("/auth/"));

  const signIn = linkProps(header.sign_in);
  const getStarted = linkProps(header.get_started);
  const activeMode = authMode ?? "signin";

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  function navHref(href: string) {
    return onAuth && href.startsWith("#") ? `/${href}` : href;
  }

  return (
    <header className="marketing-header shrink-0">
      <div
        className={cn(
          "mx-auto flex max-w-7xl items-center justify-between gap-4 px-6",
          compact ? "py-2.5" : "py-4",
        )}
      >
        <Link href="/" className="shrink-0" aria-label="Aranyix home">
          <AranyixLogo
            className={cn(
              "w-auto",
              compact
                ? "h-9 max-w-[180px] sm:h-10 sm:max-w-[200px]"
                : "h-11 max-w-[220px] sm:h-12 sm:max-w-[260px]",
            )}
          />
        </Link>

        <nav
          className={cn("hidden items-center gap-1 md:flex", compact && "gap-0")}
          aria-label="Primary"
        >
          {header.nav.map((item) => {
            const link = linkProps(item);
            return (
              <a
                key={`${link.href}-${link.label}`}
                href={navHref(link.href)}
                className={cn("marketing-nav-link", compact && "px-3 py-1.5")}
              >
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
                  compact && "px-3 py-1.5 text-sm",
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
                  compact && "px-3.5 py-1.5 text-sm",
                  activeMode === "signup" && "ring-2 ring-forest-500/30 ring-offset-1",
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

          <button
            type="button"
            className="btn-ghost md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-forest-950/40 backdrop-blur-[2px]"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div
            className="absolute right-0 top-0 flex h-full w-[min(20rem,88vw)] flex-col overflow-y-auto border-l border-forest-900/10 bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
          >
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
              <p className="font-display text-lg font-semibold text-forest-900">Aranyix</p>
              <button
                type="button"
                className="btn-ghost"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-1 px-3 py-4" aria-label="Mobile primary">
              {header.nav.map((item) => {
                const link = linkProps(item);
                return (
                  <a
                    key={`mobile-${link.href}-${link.label}`}
                    href={navHref(link.href)}
                    className="rounded-xl px-3 py-3 text-base font-medium text-stone-700 transition hover:bg-forest-50 hover:text-forest-800"
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                );
              })}
            </nav>

            <div className="space-y-2 border-t border-stone-100 px-4 py-4">
              <Link
                href={onAuth ? "/auth?mode=signin" : signIn.href}
                className="btn-secondary w-full"
                onClick={() => setMenuOpen(false)}
              >
                {signIn.label}
              </Link>
              <Link
                href={onAuth ? "/auth?mode=signup" : getStarted.href}
                className="btn-primary w-full"
                onClick={() => setMenuOpen(false)}
              >
                {getStarted.label}
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
