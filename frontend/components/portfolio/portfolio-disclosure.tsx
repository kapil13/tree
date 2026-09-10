"use client";

import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export function PortfolioDisclosure({
  title,
  description,
  icon: Icon,
  defaultOpen = false,
  badge,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  defaultOpen?: boolean;
  badge?: string;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = `portfolio-disclosure-${title.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <section className={cn("card overflow-hidden p-0", className)}>
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 border-b border-stone-200 px-4 py-3 text-left transition hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-900/50"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <div className="flex min-w-0 items-start gap-2">
          {Icon ? (
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-stone-500 dark:text-stone-400" aria-hidden />
          ) : null}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-medium text-stone-900 dark:text-stone-50">{title}</h2>
              {badge ? (
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                  {badge}
                </span>
              ) : null}
            </div>
            {description ? (
              <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{description}</p>
            ) : null}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 text-stone-400 transition-transform dark:text-stone-500",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <div id={panelId} className="p-4 dark:bg-stone-950/20">
          {children}
        </div>
      ) : null}
    </section>
  );
}
