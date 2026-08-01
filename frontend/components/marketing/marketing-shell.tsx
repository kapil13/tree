"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { cmsPublic } from "@/lib/cms-api";
import { CMS_HOME_FALLBACK } from "@/lib/cms-defaults";

type MarketingShellProps = {
  children: ReactNode;
  /** Extra classes on the outer marketing-page wrapper */
  className?: string;
  /** Extra classes on the main content region */
  mainClassName?: string;
  /** Highlight Sign in / Get started when rendering auth surfaces */
  authMode?: "signin" | "signup";
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
}: MarketingShellProps) {
  const { data } = useQuery({
    queryKey: ["cms-public-site"],
    queryFn: () => cmsPublic.site(),
    staleTime: 60_000,
  });

  const site = data?.site ?? CMS_HOME_FALLBACK.site;

  return (
    <div className={`marketing-page ${className}`.trim()}>
      <MarketingHeader header={site.header} authMode={authMode} />
      <main className={mainClassName}>{children}</main>
      <MarketingFooter footer={site.footer} />
    </div>
  );
}
