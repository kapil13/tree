"use client";

import { useTranslations } from "next-intl";
import { resolveRouteKeys, type RouteKeyMeta } from "@/lib/route-meta";

export type ResolvedRouteMeta = {
  title: string;
  section?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
};

function translateMeta(
  t: ReturnType<typeof useTranslations<"chrome">>,
  meta: RouteKeyMeta,
): ResolvedRouteMeta {
  return {
    title: t(meta.titleKey),
    section: meta.sectionKey ? t(meta.sectionKey) : undefined,
    breadcrumbs: meta.breadcrumbs?.map((crumb) => ({
      label: t(crumb.labelKey),
      href: crumb.href,
    })),
  };
}

export function useRouteMeta(pathname: string | null): ResolvedRouteMeta | null {
  const t = useTranslations("chrome");
  const keys = resolveRouteKeys(pathname);
  if (!keys) return null;
  return translateMeta(t, keys);
}
