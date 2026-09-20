"use client";

import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import type { AuditExplainRun } from "@/lib/api";
import { cn } from "@/lib/cn";

export function AuditExplainResult({
  run,
  className,
}: {
  run: AuditExplainRun;
  className?: string;
}) {
  const t = useTranslations("auditExplain");

  return (
    <div
      className={cn(
        "rounded-xl border border-sky-200 bg-sky-50/60 p-4 text-sm dark:border-sky-900 dark:bg-sky-950/30",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
        <Sparkles className="h-3.5 w-3.5 text-sky-600" aria-hidden />
        <span className="font-medium uppercase tracking-wide text-sky-800 dark:text-sky-300">
          {t("badge")}
        </span>
        <span>·</span>
        <span>{t("mode", { mode: run.mode })}</span>
        {run.provider ? (
          <>
            <span>·</span>
            <span>{run.provider}</span>
          </>
        ) : null}
        {run.created_at ? (
          <>
            <span>·</span>
            <time dateTime={run.created_at}>{new Date(run.created_at).toLocaleString()}</time>
          </>
        ) : null}
      </div>
      <p className="mt-3 whitespace-pre-wrap text-stone-800 dark:text-stone-100">{run.answer}</p>
      {run.llm_error ? (
        <p className="mt-2 text-xs text-amber-700">{t("llmFallback", { error: run.llm_error })}</p>
      ) : null}
      {run.citations.length > 0 ? (
        <details className="mt-3 text-xs text-stone-500">
          <summary className="cursor-pointer font-medium text-stone-600">{t("citations")}</summary>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            {run.citations.map((citation, index) => (
              <li key={index}>{JSON.stringify(citation)}</li>
            ))}
          </ul>
        </details>
      ) : null}
      <p className="mt-3 text-[11px] text-stone-400">{t("disclaimer")}</p>
    </div>
  );
}
