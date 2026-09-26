"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export function PortfolioKpiCard({
  icon: Icon,
  label,
  value,
  warn = false,
  href,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  warn?: boolean;
  href?: string;
  onClick?: () => void;
}) {
  const interactive = Boolean(href || onClick);
  const className = cn(
    "card flex items-center gap-3",
    warn && "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40",
    interactive &&
      "cursor-pointer transition hover:border-forest-200 dark:hover:border-forest-700",
  );

  const content = (
    <>
      <div
        className={cn(
          "rounded-lg p-2",
          warn ? "bg-amber-100 dark:bg-amber-900/50" : "bg-stone-100 dark:bg-stone-800",
        )}
      >
        <Icon
          className={cn(
            "h-5 w-5",
            warn ? "text-amber-800 dark:text-amber-200" : "text-stone-600 dark:text-stone-400",
          )}
        />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">{label}</p>
        <p className="text-2xl font-semibold capitalize text-stone-900 dark:text-stone-50">{value}</p>
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className} aria-label={`${label}: ${value}`}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        className={cn(className, "w-full text-left")}
        onClick={onClick}
        aria-label={`${label}: ${value}`}
      >
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}
