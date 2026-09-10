"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export function PortfolioSection({
  title,
  description,
  icon: Icon,
  action,
  flush = false,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: { label: string; href: string };
  flush?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const header = (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2">
        {Icon ? <Icon className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" aria-hidden /> : null}
        <div>
          <h2 className="text-base font-medium text-stone-900 dark:text-stone-50">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{description}</p>
          ) : null}
        </div>
      </div>
      {action ? (
        <Link href={action.href} className="text-xs font-medium text-forest-700 hover:underline dark:text-forest-300">
          {action.label}
        </Link>
      ) : null}
    </div>
  );

  if (flush) {
    return (
      <section className={cn("card overflow-hidden p-0", className)}>
        <div className="border-b border-stone-200 px-4 py-3 dark:border-stone-800">{header}</div>
        {children}
      </section>
    );
  }

  return (
    <section className={cn("card p-4", className)}>
      {header}
      <div className="mt-3">{children}</div>
    </section>
  );
}
