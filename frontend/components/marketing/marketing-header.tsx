"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { AranyixLogo } from "@/components/brand/aranyix-logo";
import { LanguageSwitcher } from "@/components/settings/language-switcher";
import { MarketingMegaMenuDesktop, MarketingMegaMenuMobile } from "@/components/marketing/marketing-mega-menu";
import type { CmsPublicSite } from "@/lib/cms-api";
import { CMS_HEADER_FALLBACK, linkProps } from "@/lib/cms-defaults";
import { MARKETING_HEADER_NAV } from "@/lib/marketing-nav";
import { cn } from "@/lib/cn";

export function MarketingHeader({
  header = CMS_HEADER_FALLBACK,
  authMode,
  compact = false,
}: {
  header?: CmsPublicSite["site"]["header"];
  authMode?: "signin" | "signup";
  compact?: boolean;
}) {
  const pathname = usePathname();
  const t = useTranslations("marketing");
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

  return (
    <header className="marketing-header shrink-0">
      <div
        className={cn(
          "mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 sm:px-6",
          compact ? "py-2.5" : "py-3",
        )}
      >
        <Link href="/" className="marketing-header-logo shrink-0" aria-label={t("homeAria")}>
          <AranyixLogo
            variant="compact"
            className={cn(
              "w-auto",
              compact
                ? "h-9 max-w-[9.5rem] sm:h-10 sm:max-w-[10.5rem]"
                : "h-10 max-w-[10.5rem] sm:h-11 sm:max-w-[11.5rem] lg:max-w-[12.5rem]",
            )}
          />
        </Link>

        <MarketingMegaMenuDesktop items={MARKETING_HEADER_NAV} onAuth={onAuth} />

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <LanguageSwitcher variant="compact" className="hidden sm:inline-flex" />
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
                  "btn-primary text-sm sm:text-base",
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
              <Link href={signIn.href} className="btn-ghost hidden lg:inline-flex">
                {signIn.label}
              </Link>
              <Link href={getStarted.href} className="btn-primary text-sm sm:px-5 sm:py-2.5">
                {getStarted.label}
              </Link>
            </>
          )}

          <button
            type="button"
            className="btn-ghost lg:hidden"
            aria-label={menuOpen ? t("closeMenu") : t("openMenu")}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-forest-950/40 backdrop-blur-[2px]"
            aria-label={t("closeMenu")}
            onClick={() => setMenuOpen(false)}
          />
          <div
            className="absolute right-0 top-0 flex h-full w-[min(22rem,92vw)] flex-col overflow-y-auto border-l border-forest-900/10 bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label={t("mobileNav")}
          >
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
              <p className="font-display text-lg font-semibold text-forest-900">Menu</p>
              <button
                type="button"
                className="btn-ghost"
                aria-label={t("closeMenu")}
                onClick={() => setMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <MarketingMegaMenuMobile
              items={MARKETING_HEADER_NAV}
              onAuth={onAuth}
              onNavigate={() => setMenuOpen(false)}
            />

            <div className="space-y-2 border-t border-stone-100 px-4 py-4">
              <LanguageSwitcher variant="compact" className="w-full justify-center" />
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
