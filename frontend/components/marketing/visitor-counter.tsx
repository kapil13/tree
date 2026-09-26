"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { siteVisits } from "@/lib/site-visits-api";

function formatCount(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value);
}

export function VisitorCounter() {
  const t = useTranslations("marketing");
  const { data } = useQuery({
    queryKey: ["site-visit-stats"],
    queryFn: () => siteVisits.stats(),
    staleTime: 60_000,
    retry: 1,
  });

  if (!data || data.total <= 0) return null;

  const locale =
    typeof document !== "undefined" ? document.documentElement.lang || "en" : "en";

  return (
    <>
      <span className="text-emerald-100/35" aria-hidden> · </span>
      <span className="tabular-nums text-emerald-100/45">
        {t("visitorCount", { count: formatCount(data.total, locale) })}
      </span>
    </>
  );
}
