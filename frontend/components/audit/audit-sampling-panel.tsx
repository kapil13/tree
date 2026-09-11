"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ClipboardList, MapPin, CheckCircle2 } from "lucide-react";
import { auditEngagements } from "@/lib/api";
import { cn } from "@/lib/cn";

const RISK_STYLES: Record<string, string> = {
  critical: "bg-rose-100 text-rose-900 ring-rose-300",
  high: "bg-orange-100 text-orange-900 ring-orange-300",
  medium: "bg-amber-100 text-amber-900 ring-amber-300",
  low: "bg-emerald-100 text-emerald-800 ring-emerald-300",
};

type SamplingPlot = {
  id: string;
  plot_code: string;
  boundary_name?: string | null;
  risk_level: string;
  priority_rank: number;
  status: string;
  center?: { coordinates: [number, number] };
  latest_visit?: {
    verification_outcome: string;
    trees_observed?: number | null;
    visited_at: string;
  } | null;
};

export function AuditSamplingPanel({
  engagementId,
  engagementStatus,
}: {
  engagementId: string;
  engagementStatus: string;
}) {
  const t = useTranslations("auditSampling");
  const qc = useQueryClient();
  const [selectedPlot, setSelectedPlot] = useState<string | null>(null);
  const [visitForm, setVisitForm] = useState({
    trees_observed: "",
    trees_alive: "",
    canopy_cover_pct: "",
    verification_outcome: "inconclusive",
    notes: "",
  });

  const enabled =
    engagementStatus === "risk_assessed" ||
    engagementStatus === "sampling_planned" ||
    engagementStatus === "field_verified" ||
    engagementStatus === "export_ready" ||
    engagementStatus === "under_review" ||
    engagementStatus === "attested";

  const { data, isLoading } = useQuery({
    queryKey: ["audit-sampling-plan", engagementId],
    queryFn: () => auditEngagements.getSamplingPlan(engagementId),
    enabled,
  });

  const generate = useMutation({
    mutationFn: () => auditEngagements.generateSamplingPlan(engagementId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-sampling-plan", engagementId] });
      qc.invalidateQueries({ queryKey: ["audit-engagement"] });
    },
  });

  const recordVisit = useMutation({
    mutationFn: (plotId: string) =>
      auditEngagements.recordFieldVisit(engagementId, plotId, {
        trees_observed: visitForm.trees_observed ? Number(visitForm.trees_observed) : undefined,
        trees_alive: visitForm.trees_alive ? Number(visitForm.trees_alive) : undefined,
        canopy_cover_pct: visitForm.canopy_cover_pct
          ? Number(visitForm.canopy_cover_pct)
          : undefined,
        verification_outcome: visitForm.verification_outcome as
          | "claim_supported"
          | "claim_unsupported"
          | "inconclusive",
        notes: visitForm.notes || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-sampling-plan", engagementId] });
      setSelectedPlot(null);
    },
  });

  const complete = useMutation({
    mutationFn: () => auditEngagements.completeFieldVerification(engagementId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-sampling-plan", engagementId] });
      qc.invalidateQueries({ queryKey: ["audit-engagement"] });
    },
  });

  if (!enabled) {
    return <section className="card text-sm text-stone-500">{t("riskRequired")}</section>;
  }

  if (isLoading) {
    return <p className="text-sm text-stone-500">{t("loading")}</p>;
  }

  const plots = (data?.plots ?? []) as SamplingPlot[];
  const stats = data?.visit_stats ?? { total: 0, visited: 0, planned: 0 };
  const allVisited = stats.total > 0 && stats.planned === 0;

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <ClipboardList className="h-6 w-6 text-forest-700" aria-hidden />
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            {t("title")}
          </h2>
          {(engagementStatus === "field_verified" ||
            engagementStatus === "export_ready" ||
            engagementStatus === "under_review" ||
            engagementStatus === "attested") && (
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
              {t("statusVerified")}
            </span>
          )}
        </div>
        <p className="text-sm text-stone-600 dark:text-stone-400">{t("subtitle")}</p>
        <p className="text-xs text-stone-500">{t("epistemicNote")}</p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn-primary text-sm"
          disabled={
            generate.isPending ||
            engagementStatus === "field_verified" ||
            engagementStatus === "export_ready" ||
            engagementStatus === "under_review" ||
            engagementStatus === "attested"
          }
          onClick={() => generate.mutate()}
        >
          {data?.has_plan ? t("regenerate") : t("generate")}
        </button>
        {stats.total > 0 && (
          <span className="text-xs text-stone-500">
            {t("visitProgress", { visited: stats.visited, total: stats.total })}
          </span>
        )}
        {allVisited && engagementStatus === "sampling_planned" && (
          <button
            type="button"
            className="btn-secondary text-sm"
            disabled={complete.isPending}
            onClick={() => complete.mutate()}
          >
            {t("completeVerification")}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {plots.length === 0 ? (
          <p className="text-sm text-stone-500">{t("noPlots")}</p>
        ) : (
          plots.map((plot) => (
            <article
              key={plot.id}
              className="rounded-xl border border-stone-200 p-4 dark:border-stone-700"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-stone-500">
                    #{plot.priority_rank} · {plot.plot_code}
                  </p>
                  <h3 className="font-medium text-stone-900 dark:text-stone-100">
                    <MapPin className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                    {plot.boundary_name}
                  </h3>
                  {plot.center?.coordinates && (
                    <p className="mt-1 text-xs text-stone-400">
                      {plot.center.coordinates[1].toFixed(5)},{" "}
                      {plot.center.coordinates[0].toFixed(5)}
                    </p>
                  )}
                  {plot.latest_visit && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                      {t("visited", { outcome: plot.latest_visit.verification_outcome })}
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold uppercase ring-1",
                    RISK_STYLES[plot.risk_level] ?? RISK_STYLES.medium,
                  )}
                >
                  {plot.risk_level}
                </span>
              </div>

              {plot.status !== "visited" && engagementStatus === "sampling_planned" && (
                <div className="mt-3 border-t border-stone-100 pt-3 dark:border-stone-800">
                  {selectedPlot === plot.id ? (
                    <div className="space-y-2">
                      <div className="grid gap-2 sm:grid-cols-3">
                        <input
                          className="input text-sm"
                          placeholder={t("treesObserved")}
                          value={visitForm.trees_observed}
                          onChange={(e) =>
                            setVisitForm((f) => ({ ...f, trees_observed: e.target.value }))
                          }
                        />
                        <input
                          className="input text-sm"
                          placeholder={t("treesAlive")}
                          value={visitForm.trees_alive}
                          onChange={(e) =>
                            setVisitForm((f) => ({ ...f, trees_alive: e.target.value }))
                          }
                        />
                        <input
                          className="input text-sm"
                          placeholder={t("canopyCover")}
                          value={visitForm.canopy_cover_pct}
                          onChange={(e) =>
                            setVisitForm((f) => ({ ...f, canopy_cover_pct: e.target.value }))
                          }
                        />
                      </div>
                      <select
                        className="input text-sm"
                        value={visitForm.verification_outcome}
                        onChange={(e) =>
                          setVisitForm((f) => ({ ...f, verification_outcome: e.target.value }))
                        }
                      >
                        <option value="inconclusive">{t("outcomeInconclusive")}</option>
                        <option value="claim_supported">{t("outcomeSupported")}</option>
                        <option value="claim_unsupported">{t("outcomeUnsupported")}</option>
                      </select>
                      <textarea
                        className="input text-sm"
                        rows={2}
                        placeholder={t("notes")}
                        value={visitForm.notes}
                        onChange={(e) => setVisitForm((f) => ({ ...f, notes: e.target.value }))}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn-primary text-sm"
                          disabled={recordVisit.isPending}
                          onClick={() => recordVisit.mutate(plot.id)}
                        >
                          {t("saveVisit")}
                        </button>
                        <button
                          type="button"
                          className="text-sm text-stone-500"
                          onClick={() => setSelectedPlot(null)}
                        >
                          {t("cancel")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="text-sm text-forest-700 underline"
                      onClick={() => setSelectedPlot(plot.id)}
                    >
                      {t("recordVisit")}
                    </button>
                  )}
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
