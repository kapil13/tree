"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { BarChart3, Layers, Radar, Sparkles } from "lucide-react";
import {
  auditEngagements,
  errorMessage,
  type AuditCrossEstatePattern,
  type AuditExplainRun,
} from "@/lib/api";
import { AuditExplainResult } from "@/components/audit/audit-explain-result";
import { PortfolioSection } from "@/components/portfolio/portfolio-section";
import { cn } from "@/lib/cn";

function PatternRow({ pattern }: { pattern: AuditCrossEstatePattern }) {
  const t = useTranslations("auditPortfolioOps");
  const [explainRun, setExplainRun] = useState<AuditExplainRun | null>(null);

  const explain = useMutation({
    mutationFn: () => auditEngagements.explainCrossEstatePattern(pattern.id),
    onSuccess: (run) => setExplainRun(run),
  });

  return (
    <li className="rounded-lg border border-stone-200 p-3 dark:border-stone-700">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            {pattern.pattern_type}
            {pattern.severity_peak ? ` · ${pattern.severity_peak}` : ""}
          </p>
          <p className="mt-1 text-sm text-stone-800 dark:text-stone-100">{pattern.summary}</p>
          <p className="mt-1 text-xs text-stone-500">
            {t("patternEngagements", { count: pattern.engagement_count })}
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary inline-flex items-center gap-1 text-xs"
          disabled={explain.isPending}
          onClick={() => explain.mutate()}
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          {t("explain")}
        </button>
      </div>
      {explainRun ? <AuditExplainResult run={explainRun} className="mt-3" /> : null}
      {explain.isError ? (
        <p className="mt-2 text-xs text-rose-700">{errorMessage(explain.error)}</p>
      ) : null}
    </li>
  );
}

export function AuditPortfolioOpsSection({ projectId }: { projectId?: string | null }) {
  const t = useTranslations("auditPortfolioOps");
  const qc = useQueryClient();

  const rollupsQ = useQuery({
    queryKey: ["audit-portfolio-rollups"],
    queryFn: () => auditEngagements.getPortfolioRollups(),
  });

  const benchmarksQ = useQuery({
    queryKey: ["audit-benchmarks"],
    queryFn: () => auditEngagements.getBenchmarks(),
  });

  const patternsQ = useQuery({
    queryKey: ["audit-cross-estate-patterns"],
    queryFn: () => auditEngagements.getCrossEstatePatterns(),
  });

  const workspaceQ = useQuery({
    queryKey: ["audit-auditor-workspace", projectId ?? "all"],
    queryFn: () =>
      auditEngagements.getAuditorWorkspace(projectId ? { project_id: projectId } : undefined),
  });

  const digestSchedulesQ = useQuery({
    queryKey: ["audit-digest-schedules"],
    queryFn: () => auditEngagements.listDigestSchedules(),
  });

  const computeRollups = useMutation({
    mutationFn: () => auditEngagements.computePortfolioRollups(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["audit-portfolio-rollups"] }),
  });

  const computeBenchmarks = useMutation({
    mutationFn: () => auditEngagements.computeBenchmarks(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["audit-benchmarks"] }),
  });

  const detectPatterns = useMutation({
    mutationFn: () => auditEngagements.detectCrossEstatePatterns(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["audit-cross-estate-patterns"] }),
  });

  const runDigest = useMutation({
    mutationFn: (scheduleId: string) => auditEngagements.runDigestSchedule(scheduleId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["audit-digest-schedules"] }),
  });

  const rollups = rollupsQ.data;
  const scopedRollups = projectId
    ? rollups?.rollups.filter((row) => row.project_id === projectId) ?? []
    : rollups?.rollups ?? [];

  return (
    <>
      <PortfolioSection title={t("rollups.title")} description={t("rollups.desc")}>
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            className="btn-secondary text-xs"
            disabled={computeRollups.isPending}
            onClick={() => computeRollups.mutate()}
          >
            {computeRollups.isPending ? t("computing") : t("rollups.compute")}
          </button>
        </div>
        {rollupsQ.isLoading ? (
          <p className="text-sm text-stone-500">{t("loading")}</p>
        ) : scopedRollups.length === 0 ? (
          <p className="text-sm text-stone-500">{t("rollups.empty")}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {scopedRollups.map((row) => (
              <article
                key={row.id}
                className="rounded-lg border border-stone-200 p-3 text-sm dark:border-stone-700"
              >
                <div className="flex items-center gap-2 text-xs text-stone-500">
                  <BarChart3 className="h-3.5 w-3.5" aria-hidden />
                  {t("rollups.cycle", { number: row.cycle_number })}
                </div>
                <p className="mt-2 font-medium capitalize text-stone-900 dark:text-stone-100">
                  {row.engagement_status.replaceAll("_", " ")}
                </p>
                <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-stone-600">
                  <div>
                    <dt>{t("rollups.plotsDue")}</dt>
                    <dd className={cn("font-semibold", row.plots_due > 0 && "text-amber-700")}>
                      {row.plots_due}
                    </dd>
                  </div>
                  <div>
                    <dt>{t("rollups.anomalies")}</dt>
                    <dd className="font-semibold">{row.open_anomaly_count}</dd>
                  </div>
                  <div>
                    <dt>{t("rollups.mismatch")}</dt>
                    <dd
                      className={cn(
                        "font-semibold",
                        row.reconciliation_mismatch > 0 && "text-rose-700",
                      )}
                    >
                      {row.reconciliation_mismatch}
                    </dd>
                  </div>
                  <div>
                    <dt>{t("rollups.visited")}</dt>
                    <dd className="font-semibold">
                      {row.plots_visited}/{row.plots_total}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
        {computeRollups.isError ? (
          <p className="mt-2 text-sm text-rose-700">{errorMessage(computeRollups.error)}</p>
        ) : null}
      </PortfolioSection>

      <PortfolioSection title={t("benchmarks.title")} description={t("benchmarks.desc")}>
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            className="btn-secondary text-xs"
            disabled={computeBenchmarks.isPending}
            onClick={() => computeBenchmarks.mutate()}
          >
            {computeBenchmarks.isPending ? t("computing") : t("benchmarks.compute")}
          </button>
        </div>
        {benchmarksQ.isLoading ? (
          <p className="text-sm text-stone-500">{t("loading")}</p>
        ) : (benchmarksQ.data?.baselines.length ?? 0) === 0 ? (
          <p className="text-sm text-stone-500">{t("benchmarks.empty")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500 dark:bg-stone-900/50">
              <tr>
                <th className="px-4 py-2">{t("benchmarks.metric")}</th>
                <th className="px-4 py-2">{t("benchmarks.value")}</th>
                <th className="px-4 py-2">{t("benchmarks.samples")}</th>
              </tr>
            </thead>
            <tbody>
              {benchmarksQ.data?.baselines.map((baseline) => (
                <tr key={baseline.id} className="border-t border-stone-100 dark:border-stone-800">
                  <td className="px-4 py-2 font-medium">{baseline.metric_code}</td>
                  <td className="px-4 py-2">{baseline.metric_value.toFixed(3)}</td>
                  <td className="px-4 py-2">{baseline.sample_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PortfolioSection>

      <PortfolioSection title={t("patterns.title")} description={t("patterns.desc")}>
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            className="btn-secondary text-xs"
            disabled={detectPatterns.isPending}
            onClick={() => detectPatterns.mutate()}
          >
            {detectPatterns.isPending ? t("computing") : t("patterns.detect")}
          </button>
        </div>
        {patternsQ.isLoading ? (
          <p className="text-sm text-stone-500">{t("loading")}</p>
        ) : (patternsQ.data?.patterns.length ?? 0) === 0 ? (
          <p className="text-sm text-stone-500">{t("patterns.empty")}</p>
        ) : (
          <ul className="space-y-3">
            {patternsQ.data?.patterns.map((pattern) => (
              <PatternRow key={pattern.id} pattern={pattern} />
            ))}
          </ul>
        )}
      </PortfolioSection>

      <PortfolioSection title={t("workspace.title")} description={t("workspace.desc")}>
        {workspaceQ.isLoading ? (
          <p className="text-sm text-stone-500">{t("loading")}</p>
        ) : (
          <div>
            <p className="text-sm text-stone-600">
              <Layers className="mr-1 inline h-4 w-4" aria-hidden />
              {t("workspace.due", { count: workspaceQ.data?.total_due ?? 0 })}
            </p>
            {(workspaceQ.data?.items.length ?? 0) > 0 ? (
              <p className="mt-2 text-xs text-stone-500">
                {t("workspace.topPlot", {
                  code: workspaceQ.data?.items[0]?.plot_code ?? "—",
                  project: workspaceQ.data?.items[0]?.project_name ?? "—",
                })}
              </p>
            ) : null}
          </div>
        )}
      </PortfolioSection>

      <PortfolioSection title={t("digests.title")} description={t("digests.desc")}>
        {digestSchedulesQ.isLoading ? (
          <p className="text-sm text-stone-500">{t("loading")}</p>
        ) : (digestSchedulesQ.data?.length ?? 0) === 0 ? (
          <p className="text-sm text-stone-500">{t("digests.empty")}</p>
        ) : (
          <ul className="divide-y divide-stone-100 dark:divide-stone-800">
            {digestSchedulesQ.data?.map((schedule) => (
              <li
                key={schedule.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-stone-900 dark:text-stone-100">
                    {schedule.template_code}
                  </p>
                  <p className="text-xs text-stone-500">
                    {schedule.cadence}
                    {schedule.last_run_at
                      ? ` · ${t("digests.lastRun", {
                          time: new Date(schedule.last_run_at).toLocaleString(),
                        })}`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  disabled={runDigest.isPending}
                  onClick={() => runDigest.mutate(schedule.id)}
                >
                  <Radar className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                  {t("digests.run")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </PortfolioSection>
    </>
  );
}
