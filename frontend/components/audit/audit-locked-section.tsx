"use client";

import Link from "next/link";
import { Lock } from "lucide-react";

export function AuditLockedSection({
  title,
  message,
  actionLabel,
  actionHref,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}) {
  return (
    <section className="dash-panel border-dashed">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-stone-400" aria-hidden />
          <div>
            <h2 className="text-base font-semibold text-stone-800 dark:text-stone-200">{title}</h2>
            <p className="mt-1 max-w-2xl text-sm text-stone-500">{message}</p>
          </div>
        </div>
        {actionLabel && actionHref ? (
          <Link href={actionHref} className="btn-primary shrink-0 text-sm">
            {actionLabel}
          </Link>
        ) : actionLabel && onAction ? (
          <button type="button" className="btn-primary shrink-0 text-sm" onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}
