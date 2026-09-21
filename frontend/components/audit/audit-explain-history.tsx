"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ChevronDown, History, Sparkles } from "lucide-react";
import { auditEngagements, type AuditExplainRun } from "@/lib/api";
import { AuditExplainResult } from "@/components/audit/audit-explain-result";
import { cn } from "@/lib/cn";

const TARGET_TYPE_ORDER = [
  "anomaly",
  "reconciliation_summary",
  "reconciliation_block",
  "evidence_graph",
  "cross_estate_pattern",
] as const;

function targetTypeLabel(
  labels: Record<string, string>,
  targetType: string,
): string {
  return labels[targetType] ?? targetType.replaceAll("_", " ");
}

export function AuditExplainHistory({
  engagementId,
  targetTypes,
  limit = 20,
  className,
}: {
  engagementId: string;
  targetTypes?: string[];
  limit?: number;
  className?: string;
}) {
  const t = useTranslations("auditExplainHistory");
  const targetLabels: Record<string, string> = {
    anomaly: t("targetType.anomaly"),
    reconciliation_summary: t("targetType.reconciliation_summary"),
    reconciliation_block: t("targetType.reconciliation_block"),
    evidence_graph: t("targetType.evidence_graph"),
    cross_estate_pattern: t("targetType.cross_estate_pattern"),
  };
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | "all">("all");

  const historyQ = useQuery({
    queryKey: ["audit-explain-runs", engagementId, limit],
    queryFn: () => auditEngagements.listExplainRuns(engagementId, limit),
  });

  const runs = historyQ.data ?? [];

  const availableTypes = useMemo(() => {
    const scoped = targetTypes
      ? runs.filter((run) => targetTypes.includes(run.target_type))
      : runs;
    const types = new Set(scoped.map((run) => run.target_type));
    const ordered = TARGET_TYPE_ORDER.filter((type) => types.has(type));
    const extras = [...types].filter(
      (type) => !TARGET_TYPE_ORDER.includes(type as (typeof TARGET_TYPE_ORDER)[number]),
    );
    return [...ordered, ...extras];
  }, [runs, targetTypes]);

  const filteredRuns = useMemo(() => {
    let items = targetTypes
      ? runs.filter((run) => targetTypes.includes(run.target_type))
      : runs;
    if (typeFilter !== "all") {
      items = items.filter((run) => run.target_type === typeFilter);
    }
    return items;
  }, [runs, targetTypes, typeFilter]);

  if (historyQ.isLoading) {
    return <p className={cn("text-sm text-stone-500", className)}>{t("loading")}</p>;
  }

  if (historyQ.error) {
    return (
      <p className={cn("text-sm text-amber-700", className)}>
        {t("error")}
      </p>
    );
  }

  return (
    <section
      className={cn("rounded-xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-950", className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-100 px-4 py-3 dark:border-stone-800">
        <div className="flex items-start gap-2">
          <History className="mt-0.5 h-4 w-4 text-stone-500" aria-hidden />
          <div>
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">{t("title")}</h2>
            <p className="mt-0.5 text-xs text-stone-500">{t("subtitle")}</p>
          </div>
        </div>
        <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs text-stone-600 dark:bg-stone-900">
          {t("count", { count: filteredRuns.length })}
        </span>
      </div>

      {availableTypes.length > 1 ? (
        <div className="flex flex-wrap gap-2 border-b border-stone-100 px-4 py-2 dark:border-stone-800">
          <button
            type="button"
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs ring-1",
              typeFilter === "all"
                ? "bg-forest-50 text-forest-800 ring-forest-200"
                : "bg-white text-stone-600 ring-stone-200",
            )}
            onClick={() => setTypeFilter("all")}
          >
            {t("filterAll")}
          </button>
          {availableTypes.map((type) => (
            <button
              key={type}
              type="button"
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs ring-1",
                typeFilter === type
                  ? "bg-forest-50 text-forest-800 ring-forest-200"
                  : "bg-white text-stone-600 ring-stone-200",
              )}
              onClick={() => setTypeFilter(type)}
            >
              {targetTypeLabel(targetLabels, type)}
            </button>
          ))}
        </div>
      ) : null}

      {filteredRuns.length === 0 ? (
        <p className="px-4 py-6 text-sm text-stone-500">{t("empty")}</p>
      ) : (
        <ul className="divide-y divide-stone-100 dark:divide-stone-800">
          {filteredRuns.map((run) => (
            <ExplainHistoryRow
              key={run.id}
              run={run}
              expanded={expandedId === run.id}
              onToggle={() => setExpandedId((current) => (current === run.id ? null : run.id))}
              label={targetTypeLabel(targetLabels, run.target_type)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function ExplainHistoryRow({
  run,
  expanded,
  onToggle,
  label,
}: {
  run: AuditExplainRun;
  expanded: boolean;
  onToggle: () => void;
  label: string;
}) {
  const preview = run.answer.length > 140 ? `${run.answer.slice(0, 140)}…` : run.answer;

  return (
    <li>
      <button
        type="button"
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-stone-50 dark:hover:bg-stone-900/40"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
            <span className="font-medium text-stone-700 dark:text-stone-300">{label}</span>
            <span>·</span>
            <span>{run.mode}</span>
            {run.created_at ? (
              <>
                <span>·</span>
                <time dateTime={run.created_at}>{new Date(run.created_at).toLocaleString()}</time>
              </>
            ) : null}
          </span>
          {!expanded ? (
            <span className="mt-1 block text-sm text-stone-600 dark:text-stone-400">{preview}</span>
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
}
