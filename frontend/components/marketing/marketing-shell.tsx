"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { AuthCompactFooter } from "@/components/marketing/auth-compact-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { cmsPublic } from "@/lib/cms-api";
import { CMS_HOME_FALLBACK } from "@/lib/cms-defaults";
import { cn } from "@/lib/cn";

type MarketingShellProps = {
  children: ReactNode;
  className?: string;
  mainClassName?: string;
  authMode?: "signin" | "signup";
  /** full = marketing footer; compact = slim legal bar (auth) */
  footerVariant?: "full" | "compact";
};

/**
 * Shared public chrome: CMS-backed header + footer used by marketing pages
 * and standalone surfaces (auth) so the site feels one product end-to-end.
 */
export function MarketingShell({
  children,
  className = "",
  mainClassName = "",
  authMode,
  footerVariant = "full",
}: MarketingShellProps) {
  const { data } = useQuery({
    queryKey: ["cms-public-site"],
    queryFn: () => cmsPublic.site(),
    staleTime: 60_000,
  });

  const site = data?.site ?? CMS_HOME_FALLBACK.site;
  const isAuth = footerVariant === "compact" || authMode != null;

  return (
    <div
      className={cn(
        "marketing-page",
        isAuth && "flex h-dvh max-h-dvh flex-col overflow-hidden",
        className,
      )}
    >
      <MarketingHeader header={site.header} authMode={authMode} compact={isAuth} />
      <main className={cn(isAuth && "flex min-h-0 flex-1 flex-col", mainClassName)}>
        {children}
      </main>
      {footerVariant === "compact" || authMode != null ? (
        <AuthCompactFooter footer={site.footer} />
      ) : (
        <MarketingFooter footer={site.footer} />
      )}
    </div>
  );
}
