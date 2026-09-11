"use client";

import { Lock } from "lucide-react";

export function AuditLockedSection({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <section className="rounded-xl border border-dashed border-stone-300 bg-stone-50/50 p-4 dark:border-stone-600 dark:bg-stone-900/30">
      <div className="flex items-start gap-3">
        <Lock className="mt-0.5 h-5 w-5 shrink-0 text-stone-400" aria-hidden />
        <div>
          <h2 className="text-base font-semibold text-stone-800 dark:text-stone-200">{title}</h2>
          <p className="mt-1 text-sm text-stone-500">{message}</p>
        </div>
      </div>
    </section>
  );
}
