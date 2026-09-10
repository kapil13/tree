"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";

export type PortfolioTabBannerVariant = "info" | "scope" | "warn" | "cta";

const VARIANT_CLASS: Record<PortfolioTabBannerVariant, string> = {
  info: "border-stone-200 bg-stone-50 text-stone-800 dark:border-stone-700 dark:bg-stone-900/50 dark:text-stone-100",
  scope: "border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100",
  warn: "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
  cta:
    "border-forest-200 bg-gradient-to-br from-forest-50 to-white text-stone-900 dark:border-forest-900 dark:from-forest-950/40 dark:to-stone-950 dark:text-stone-50",
};

export function PortfolioTabBanner({
  variant,
  title,
  description,
  action,
  className,
}: {
  variant: PortfolioTabBannerVariant;
  title?: string;
  description?: string;
  action?: { label: string; href: string };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm",
        VARIANT_CLASS[variant],
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {title ? <p className="font-medium">{title}</p> : null}
        {description ? (
          <p className={cn(title && "mt-1", "text-stone-700 dark:text-stone-300")}>{description}</p>
        ) : null}
      </div>
      {action ? (
        <Link href={action.href} className="btn-secondary shrink-0 text-xs">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
