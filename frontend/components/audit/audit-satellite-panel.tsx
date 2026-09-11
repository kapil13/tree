"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Satellite, TrendingUp } from "lucide-react";
import { auditEngagements } from "@/lib/api";
import { satelliteHref } from "@/lib/satellite-links";
import { cn } from "@/lib/cn";

type TimelineBlock = {
  boundary_version_id: string;
  boundary_name?: string | null;
  fence_id?: string | null;
  baseline?: {
    t0_ndvi_mean?: number | null;
    t0_provider?: string | null;
    backfill_status?: string;
    planting_date?: string | null;
    epistemic_label?: string;
  } | null;
  timeline?: Array<{
    phase: string;
    ndvi_mean?: number | null;
    change_vs_t0?: number | null;
    scene_acquired_at: string;
    epistemic_label?: string;
  }>;
};

export function AuditSatellitePanel({
  projectId,
  engagementId,
  engagementStatus,
}: {
  projectId: string;
  engagementId: string;
  engagementStatus: string;
}) {
  const t = useTranslations("auditSatellite");
  const qc = useQueryClient();

  const { data: timeline, isLoading } = useQuery({
    queryKey: ["audit-satellite-timeline", engagementId],
    queryFn: () => auditEngagements.getSatelliteTimeline(engagementId),
    enabled:
      engagementStatus === "intake_complete" ||
      engagementStatus === "analysis_ready" ||
      engagementStatus === "confidence_mapped" ||
      engagementStatus === "risk_assessed" ||
      engagementStatus === "sampling_planned" ||
      engagementStatus === "field_verified" ||
      engagementStatus === "export_ready",
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["audit-satellite-timeline", engagementId] });
    qc.invalidateQueries({ queryKey: ["audit-engagement", projectId] });
  };

  const promote = useMutation({
    mutationFn: () => auditEngagements.promoteBoundaries(engagementId),
    onSuccess: invalidate,
  });
  const t0 = useMutation({
    mutationFn: () => auditEngagements.establishT0Baseline(engagementId),
    onSuccess: invalidate,
  });
  const temporal = useMutation({
    mutationFn: () => auditEngagements.runTemporalAnalysis(engagementId),
    onSuccess: invalidate,
  });
  const analysisReady = useMutation({
    mutationFn: () => auditEngagements.markAnalysisReady(engagementId),
    onSuccess: invalidate,
  });

  if (engagementStatus === "draft") {
    return (
      <section className="card text-sm text-stone-500">
        {t("intakeRequired")}
      </section>
    );
  }

  if (isLoading) {
    return <p className="text-sm text-stone-500">{t("loading")}</p>;
  }

  const blocks = (timeline?.blocks ?? []) as TimelineBlock[];
  const isReady =
    engagementStatus === "analysis_ready" ||
    engagementStatus === "confidence_mapped" ||
    engagementStatus === "risk_assessed" ||
    engagementStatus === "sampling_planned" ||
    engagementStatus === "field_verified" ||
    engagementStatus === "export_ready";

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <Satellite className="h-6 w-6 text-forest-700" aria-hidden />
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            {t("title")}
          </h2>
          {isReady && (
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
              {t("statusReady")}
            </span>
          )}
        </div>
        <p className="text-sm text-stone-600 dark:text-stone-400">{t("subtitle")}</p>
        <p className="text-xs text-stone-500">{t("auditModeNote")}</p>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary text-sm"
          disabled={promote.isPending || isReady}
          onClick={() => promote.mutate()}
        >
          {t("promoteBoundaries")}
        </button>
        <button
          type="button"
          className="btn-secondary text-sm"
          disabled={t0.isPending || isReady}
          onClick={() => t0.mutate()}
        >
          {t("establishT0")}
        </button>
        <button
          type="button"
          className="btn-secondary text-sm"
          disabled={temporal.isPending || isReady}
          onClick={() => temporal.mutate()}
        >
          {t("runTemporal")}
        </button>
        <button
          type="button"
          className="btn-primary text-sm"
          disabled={analysisReady.isPending || isReady}
          onClick={() => analysisReady.mutate()}
        >
          {t("markReady")}
        </button>
      </div>

      {timeline && (
        <p className="text-xs text-stone-500">
          {t("summary", {
            blocks: timeline.block_count,
            t0: timeline.t0_baselines_found,
          })}
        </p>
      )}

      <div className="space-y-4">
        {blocks.length === 0 ? (
          <p className="text-sm text-stone-500">{t("noBlocks")}</p>
        ) : (
          blocks.map((block) => (
            <article
              key={block.boundary_version_id}
              className="rounded-xl border border-stone-200 p-4 dark:border-stone-700"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-medium text-stone-900 dark:text-stone-100">
                  {block.boundary_name}
                </h3>
                {block.fence_id && (
                  <Link
                    href={satelliteHref({ projectId, fenceId: block.fence_id })}
                    className="text-xs text-forest-700 underline"
                  >
                    {t("openSatellite")}
                  </Link>
                )}
              </div>
              {block.baseline && (
                <p className="mt-2 text-sm text-stone-600">
                  T0 ({block.baseline.planting_date ?? "—"}): NDVI{" "}
                  {block.baseline.t0_ndvi_mean?.toFixed(3) ?? "—"}{" "}
                  <span className="text-xs text-stone-400">
                    [{block.baseline.t0_provider}] ({block.baseline.backfill_status})
                  </span>
                </p>
              )}
              {block.timeline && block.timeline.length > 0 && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-stone-500">
                        <th className="pr-4 py-1">{t("phase")}</th>
                        <th className="pr-4 py-1">NDVI</th>
                        <th className="pr-4 py-1">Δ T0</th>
                        <th className="py-1">{t("date")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {block.timeline.map((row) => (
                        <tr key={row.phase} className="border-t border-stone-100 dark:border-stone-800">
                          <td className="py-1.5 pr-4 font-medium uppercase">{row.phase}</td>
                          <td className="py-1.5 pr-4">
                            {row.ndvi_mean != null ? row.ndvi_mean.toFixed(3) : "—"}
                          </td>
                          <td className="py-1.5 pr-4">
                            <span
                              className={cn(
                                row.change_vs_t0 != null && row.change_vs_t0 > 0
                                  ? "text-emerald-700"
                                  : "text-stone-600",
                              )}
                            >
                              {row.change_vs_t0 != null
                                ? `${row.change_vs_t0 > 0 ? "+" : ""}${row.change_vs_t0.toFixed(3)}`
                                : "—"}
                            </span>
                          </td>
                          <td className="py-1.5 text-stone-500">
                            {row.scene_acquired_at.slice(0, 10)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          ))
        )}
      </div>

      <p className="flex items-center gap-2 text-xs text-stone-500">
        <TrendingUp className="h-3.5 w-3.5" aria-hidden />
        {t("epistemicNote")}
      </p>
    </section>
  );
}
