"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export function AuditPanelShell({
  icon: Icon,
  title,
  subtitle,
  epistemicNote,
  statusBadge,
  children,
  className,
  id,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  epistemicNote?: string;
  statusBadge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("dash-panel", className)}>
      <header className="dash-panel-head">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <Icon className="h-5 w-5 shrink-0 text-forest-700" aria-hidden />
            <h2 className="dash-panel-title">{title}</h2>
            {statusBadge}
          </div>
          {subtitle ? <p className="dash-panel-sub mt-1">{subtitle}</p> : null}
          {epistemicNote ? (
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{epistemicNote}</p>
          ) : null}
        </div>
      </header>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}
