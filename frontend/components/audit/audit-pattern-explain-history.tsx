"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, History, Sparkles } from "lucide-react";
import type { AuditExplainRun } from "@/lib/api";
import { AuditExplainResult } from "@/components/audit/audit-explain-result";
import { cn } from "@/lib/cn";

export function AuditPatternExplainHistory({ runs }: { runs: AuditExplainRun[] }) {
  const t = useTranslations("auditExplainHistory");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (runs.length === 0) {
    return null;
  }

  return (
    <section className="mt-4 rounded-xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-950">
      <div className="flex items-center gap-2 border-b border-stone-100 px-4 py-3 dark:border-stone-800">
        <History className="h-4 w-4 text-stone-500" aria-hidden />
        <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
          {t("patternTitle")}
        </h3>
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600 dark:bg-stone-900">
          {runs.length}
        </span>
      </div>
      <ul className="divide-y divide-stone-100 dark:divide-stone-800">
        {runs.map((run) => {
          const expanded = expandedId === run.id;
          const preview = run.answer.length > 120 ? `${run.answer.slice(0, 120)}…` : run.answer;
          return (
            <li key={run.id}>
              <button
                type="button"
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-stone-50 dark:hover:bg-stone-900/40"
                onClick={() => setExpandedId((current) => (current === run.id ? null : run.id))}
                aria-expanded={expanded}
              >
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="text-xs text-stone-500">
                    {run.created_at ? new Date(run.created_at).toLocaleString() : t("unknownTime")}
                    <span className="mx-1">·</span>
                    {run.mode}
                  </span>
                  {!expanded ? (
                    <span className="mt-1 block text-sm text-stone-600 dark:text-stone-400">
                      {preview}
                    </span>
                  ) : null}
                </span>
                <ChevronDown
                  className={cn("mt-1 h-4 w-4 shrink-0 text-stone-400 transition", expanded && "rotate-180")}
                  aria-hidden
                />
              </button>
              {expanded ? (
                <div className="px-4 pb-4">
                  <AuditExplainResult run={run} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
