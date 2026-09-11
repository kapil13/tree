"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ClipboardList, MapPin, CheckCircle2, Navigation } from "lucide-react";
import { auditEngagements, errorMessage } from "@/lib/api";
import { AuditLockedSection } from "@/components/audit/audit-locked-section";
import {
  AuditFieldVisitForm,
  type AuditFieldVisitPayload,
} from "@/components/audit/audit-field-visit-form";
import { AuditSamplingMap } from "@/components/audit/audit-sampling-map";
import {
  type AuditBoundary,
  type AuditSamplingPlot,
  mapsDirectionsUrl,
  plotLatLng,
} from "@/lib/audit-field-visit";
import { cn } from "@/lib/cn";

const RISK_STYLES: Record<string, string> = {
  critical: "bg-rose-100 text-rose-900 ring-rose-300",
  high: "bg-orange-100 text-orange-900 ring-orange-300",
  medium: "bg-amber-100 text-amber-900 ring-amber-300",
  low: "bg-emerald-100 text-emerald-800 ring-emerald-300",
};

export function AuditSamplingPanel({
  engagementId,
  engagementStatus,
  boundaries = [],
}: {
  engagementId: string;
  engagementStatus: string;
  boundaries?: AuditBoundary[];
}) {
  const t = useTranslations("auditSampling");
  const qc = useQueryClient();
  const [selectedPlot, setSelectedPlot] = useState<string | null>(null);

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

  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const generate = useMutation({
    mutationFn: () => auditEngagements.generateSamplingPlan(engagementId),
    onSuccess: (result) => {
      setActionMessage(t("generateSuccess", { count: result.total_plots }));
      qc.invalidateQueries({ queryKey: ["audit-sampling-plan", engagementId] });
      qc.invalidateQueries({ queryKey: ["audit-engagement"] });
    },
    onError: () => setActionMessage(null),
  });

  const recordVisit = useMutation({
    mutationFn: ({ plotId, payload }: { plotId: string; payload: AuditFieldVisitPayload }) =>
      auditEngagements.recordFieldVisit(engagementId, plotId, payload),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["audit-sampling-plan", engagementId] });
      setSelectedPlot(null);
      const warnings = result.location_warnings ?? [];
      if (warnings.length > 0) {
        setActionMessage(t("visitSavedWithWarnings", { warnings: warnings.join(", ") }));
      }
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
    return <AuditLockedSection title={t("title")} message={t("riskRequired")} />;
  }

  if (isLoading) {
    return <p className="text-sm text-stone-500">{t("loading")}</p>;
  }

  const plots = (data?.plots ?? []) as AuditSamplingPlot[];
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
            (engagementStatus !== "risk_assessed" && engagementStatus !== "sampling_planned")
          }
          onClick={() => generate.mutate()}
        >
          {data?.has_plan ? t("regenerate") : t("generate")}
        </button>
        {actionMessage && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {actionMessage}
          </p>
        )}
        {generate.isError && (
          <p className="text-sm text-rose-700">{errorMessage(generate.error)}</p>
        )}
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

      {plots.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            {t("mapLegend")}
          </p>
          <AuditSamplingMap boundaries={boundaries} plots={plots} />
        </div>
      ) : null}

      <div className="space-y-3">
        {plots.length === 0 ? (
          <p className="text-sm text-stone-500">{t("noPlots")}</p>
        ) : (
          plots.map((plot) => {
            const pos = plotLatLng(plot);
            return (
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
                    {pos ? (
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <p className="text-xs text-stone-400">
                          {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
                        </p>
                        <a
                          href={mapsDirectionsUrl(pos.lat, pos.lng)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-sky-700 hover:underline"
                        >
                          <Navigation className="h-3 w-3" aria-hidden />
                          {t("openInMaps")}
                        </a>
                      </div>
                    ) : null}
                    {plot.latest_visit && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                        {t("visited", {
                          outcome: plot.latest_visit.verification_outcome,
                          presence: plot.latest_visit.tree_presence ?? "—",
                        })}
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
                      <AuditFieldVisitForm
                        plot={plot}
                        saving={recordVisit.isPending}
                        onSubmit={(payload) => recordVisit.mutate({ plotId: plot.id, payload })}
                        onCancel={() => setSelectedPlot(null)}
                      />
                    ) : (
                      <button
                        type="button"
                        className="text-sm text-forest-700 underline"
                        onClick={() => setSelectedPlot(plot.id)}
                      >
                        {t("recordVisit")}
                      </button>
                    )}
                    {recordVisit.isError && selectedPlot === plot.id ? (
                      <p className="mt-2 text-xs text-rose-700">{errorMessage(recordVisit.error)}</p>
                    ) : null}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
