"use client";

import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";

export function AuditTabLoading() {
  const t = useTranslations("auditWorkspace");

  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <p className="sr-only">{t("loading")}</p>
      <div className="intel-skeleton h-20 rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

export function AuditTabError({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  const t = useTranslations("auditWorkspace");

  return (
    <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
      <p>{message ?? t("loadError")}</p>
      {onRetry ? (
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-sm hover:bg-rose-50 dark:border-rose-800 dark:bg-stone-950"
          onClick={onRetry}
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          {t("retry")}
        </button>
      ) : null}
    </div>
  );
}
