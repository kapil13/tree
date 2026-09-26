"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { AlertTriangle, ListOrdered, ShieldAlert, Sparkles } from "lucide-react";
import { auditEngagements, errorMessage, type AuditExplainRun } from "@/lib/api";
import { AuditExplainResult } from "@/components/audit/audit-explain-result";
import { AuditLockedSection } from "@/components/audit/audit-locked-section";
import { AuditPanelShell } from "@/components/audit/audit-panel-shell";
import { cn } from "@/lib/cn";

const RISK_STYLES: Record<string, string> = {
  critical: "bg-rose-100 text-rose-900 ring-rose-300",
  high: "bg-orange-100 text-orange-900 ring-orange-300",
  medium: "bg-amber-100 text-amber-900 ring-amber-300",
  low: "bg-emerald-100 text-emerald-800 ring-emerald-300",
};

const SEVERITY_STYLES: Record<string, string> = {
  critical: "text-rose-700",
  high: "text-orange-700",
  medium: "text-amber-700",
  low: "text-stone-600",
};

type QueueAnomaly = {
  id?: string;
  title: string;
  severity: string;
  summary: string;
};

type QueueBlock = {
  id: string;
  boundary_name?: string | null;
  risk_score: number;
  risk_level: string;
  priority_rank: number;
  anomaly_count: number;
  recommended_action: string;
  epistemic_label?: string;
  anomalies?: QueueAnomaly[];
};

type AnomalyItem = {
  id: string;
  boundary_name?: string | null;
  title: string;
  severity: string;
  summary: string;
  status: string;
};

export function AuditRiskPanel({
  engagementId,
  engagementStatus,
}: {
  engagementId: string;
  engagementStatus: string;
}) {
  const t = useTranslations("auditRisk");
  const qc = useQueryClient();
  const [explainRun, setExplainRun] = useState<AuditExplainRun | null>(null);
  const [explainingId, setExplainingId] = useState<string | null>(null);
  const explainResultRef = useRef<HTMLDivElement | null>(null);

  const { data: queue, isLoading: queueLoading } = useQuery({
    queryKey: ["audit-auditor-queue", engagementId],
    queryFn: () => auditEngagements.getAuditorQueue(engagementId),
    enabled:
      engagementStatus === "confidence_mapped" ||
      engagementStatus === "risk_assessed" ||
      engagementStatus === "sampling_planned" ||
      engagementStatus === "field_verified" ||
      engagementStatus === "export_ready" ||
      engagementStatus === "under_review" ||
      engagementStatus === "attested",
  });

  const { data: anomalies } = useQuery({
    queryKey: ["audit-risk-anomalies", engagementId],
    queryFn: () => auditEngagements.getRiskAnomalies(engagementId),
    enabled:
      engagementStatus === "confidence_mapped" ||
      engagementStatus === "risk_assessed" ||
      engagementStatus === "sampling_planned" ||
      engagementStatus === "field_verified" ||
      engagementStatus === "export_ready" ||
      engagementStatus === "under_review" ||
      engagementStatus === "attested",
  });

  const scan = useMutation({
    mutationFn: () => auditEngagements.runRiskScan(engagementId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-auditor-queue", engagementId] });
      qc.invalidateQueries({ queryKey: ["audit-risk-anomalies", engagementId] });
      qc.invalidateQueries({ queryKey: ["audit-engagement"] });
    },
  });

  const explain = useMutation({
    mutationFn: (anomalyId: string) => auditEngagements.explainAnomaly(engagementId, anomalyId),
    onSuccess: (run) => {
      setExplainRun(run);
      setExplainingId(null);
      void qc.invalidateQueries({ queryKey: ["audit-explain-runs", engagementId] });
    },
    onError: () => setExplainingId(null),
  });

  useEffect(() => {
    if (explainRun && explainResultRef.current) {
      explainResultRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [explainRun]);

  const unlocked =
    engagementStatus === "confidence_mapped" ||
    engagementStatus === "risk_assessed" ||
    engagementStatus === "sampling_planned" ||
    engagementStatus === "field_verified" ||
    engagementStatus === "export_ready" ||
    engagementStatus === "under_review" ||
    engagementStatus === "attested";

  if (!unlocked) {
    return <AuditLockedSection title={t("title")} message={t("confidenceRequired")} />;
  }

  if (queueLoading) {
    return <p className="text-sm text-stone-500">{t("loading")}</p>;
  }

  const blocks = (queue?.queue ?? []) as QueueBlock[];
  const levelCounts = queue?.level_counts ?? {};
  const severityCounts = anomalies?.severity_counts ?? {};
  const anomalyItems = (anomalies?.anomalies ?? []) as AnomalyItem[];

  return (
    <AuditPanelShell
      icon={ShieldAlert}
      title={t("title")}
      subtitle={t("subtitle")}
      epistemicNote={t("epistemicNote")}
      statusBadge={
        engagementStatus === "risk_assessed" ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
            {t("statusAssessed")}
          </span>
        ) : undefined
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn-primary text-sm"
          disabled={scan.isPending || engagementStatus !== "confidence_mapped"}
          onClick={() => scan.mutate()}
        >
          {t("runScan")}
        </button>
        {scan.isError && (
          <p className="text-sm text-rose-700">{errorMessage(scan.error)}</p>
        )}
        {Object.keys(levelCounts).length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs">
            {(["critical", "high", "medium", "low"] as const).map((level) =>
              levelCounts[level] ? (
                <span
                  key={level}
                  className={cn("rounded-full px-2 py-0.5 ring-1", RISK_STYLES[level])}
                >
                  {level}: {levelCounts[level]}
                </span>
              ) : null,
            )}
          </div>
        )}
      </div>

      {explain.isPending ? (
        <p className="text-sm text-stone-500">{t("explaining")}</p>
      ) : null}
      {explainRun ? (
        <div ref={explainResultRef}>
          <AuditExplainResult run={explainRun} />
        </div>
      ) : null}
      {explain.isError ? (
        <p className="text-sm text-rose-700">{errorMessage(explain.error)}</p>
      ) : null}

      <div className="space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-800">
          <ListOrdered className="h-4 w-4" aria-hidden />
          {t("queueTitle")}
        </h3>
        {blocks.length === 0 ? (
          <p className="text-sm text-stone-500">{t("noQueue")}</p>
        ) : (
          blocks.map((block) => (
            <article
              key={block.id}
              className="rounded-xl border border-stone-200 p-4 dark:border-stone-700"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-stone-500">
                    #{block.priority_rank} · {t("score", { score: block.risk_score })}
                  </p>
                  <h4 className="font-medium text-stone-900 dark:text-stone-100">
                    {block.boundary_name}
                  </h4>
                  <p className="mt-1 text-sm text-stone-600">{block.recommended_action}</p>
                  <p className="mt-1 text-xs text-stone-400">
                    {t("anomalyCount", { count: block.anomaly_count })} · {block.epistemic_label}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold uppercase ring-1",
                    RISK_STYLES[block.risk_level] ?? RISK_STYLES.low,
                  )}
                >
                  {block.risk_level}
                </span>
              </div>
              {block.anomalies && block.anomalies.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-stone-100 pt-3 dark:border-stone-800">
                  {block.anomalies.map((a, i) => (
                    <li key={a.id ?? i} className="flex items-start justify-between gap-2 text-xs">
                      <span className="flex items-start gap-2">
                        <AlertTriangle
                          className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", SEVERITY_STYLES[a.severity])}
                          aria-hidden
                        />
                        <span>
                          <strong>{a.title}</strong> — {a.summary}
                        </span>
                      </span>
                      {a.id ? (
                        <button
                          type="button"
                          className="shrink-0 text-forest-700 hover:underline dark:text-forest-300"
                          disabled={explain.isPending && explainingId === a.id}
                          onClick={() => {
                            setExplainingId(a.id!);
                            explain.mutate(a.id!);
                          }}
                        >
                          {t("explain")}
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))
        )}
      </div>

      {anomalyItems.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100">
            {t("allAnomalies")}
          </h3>
          <ul className="space-y-2">
            {anomalyItems.map((anomaly) => (
              <li
                key={anomaly.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-stone-200 p-3 text-sm dark:border-stone-700"
              >
                <div>
                  <p className="font-medium text-stone-900 dark:text-stone-100">{anomaly.title}</p>
                  <p className="mt-1 text-xs text-stone-500">
                    {anomaly.boundary_name} · {anomaly.severity} · {anomaly.status}
                  </p>
                  <p className="mt-1 text-stone-600">{anomaly.summary}</p>
                </div>
                <button
                  type="button"
                  className="btn-secondary inline-flex items-center gap-1 text-xs"
                  disabled={explain.isPending && explainingId === anomaly.id}
                  onClick={() => {
                    setExplainingId(anomaly.id);
                    explain.mutate(anomaly.id);
                  }}
                >
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  {t("explain")}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {Object.keys(severityCounts).length > 0 && (
        <div className="rounded-lg bg-stone-50 p-3 text-xs text-stone-600 dark:bg-stone-900">
          {t("anomalySummary", {
            total: anomalies?.anomaly_count ?? 0,
            critical: severityCounts.critical ?? 0,
            high: severityCounts.high ?? 0,
          })}
        </div>
      )}
    </AuditPanelShell>
  );
}
