"use client";

import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { PortfolioKpiGrid } from "./portfolio-kpi-grid";

export function PortfolioTabLoading({
  label,
  hint,
}: {
  label?: string;
  hint?: string;
}) {
  const t = useTranslations("portfolioTabs.common");

  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <p className="sr-only">{label ?? t("loading")}</p>
      {hint ? <p className="text-xs text-stone-400 dark:text-stone-500">{hint}</p> : null}
      <PortfolioKpiGrid>
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-20 rounded-xl" />
        ))}
      </PortfolioKpiGrid>
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

export function PortfolioTabError({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  const t = useTranslations("portfolioTabs.common");

  return (
    <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
      <p>{message ?? t("error")}</p>
      {onRetry ? (
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-sm hover:bg-rose-50 dark:border-rose-800 dark:bg-stone-950 dark:hover:bg-rose-950/60"
          onClick={onRetry}
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          {t("retry")}
        </button>
      ) : null}
    </div>
  );
}
