"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Navigation } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  AuditFieldVisitForm,
  type AuditFieldVisitPayload,
} from "@/components/audit/audit-field-visit-form";
import { auditEngagements, errorMessage } from "@/lib/api";
import { mapsDirectionsUrl, type AuditSamplingPlot } from "@/lib/audit-field-visit";
import { projectAuditIntakeHref } from "@/lib/audit-intake-links";
import { useProjectContext } from "@/lib/project-context";
import { scopedKey } from "@/lib/query-keys";
import { useAuth } from "@/lib/auth-store";

type AuditPlotItem = {
  plot_id: string;
  plot_code: string;
  engagement_id: string;
  project_id: string;
  project_code: string;
  project_name: string;
  risk_level: string;
  priority_rank: number;
  status: string;
  engagement_status: string;
  center: { type: string; coordinates: [number, number] };
};

function toSamplingPlot(plot: AuditPlotItem): AuditSamplingPlot {
  return {
    id: plot.plot_id,
    plot_code: plot.plot_code,
    boundary_name: plot.project_name,
    risk_level: plot.risk_level,
    priority_rank: plot.priority_rank,
    status: plot.status,
    center: { coordinates: plot.center.coordinates },
  };
}

export function AuditPlotVisitQueue() {
  const { user } = useAuth();
  const { projectId } = useProjectContext();
  const qc = useQueryClient();
  const t = useTranslations("auditPortfolio");
  const [activePlot, setActivePlot] = useState<AuditPlotItem | null>(null);

  const plotsQ = useQuery({
    queryKey: scopedKey(user, "audit-plot-queue", projectId ?? "all"),
    queryFn: () => auditEngagements.fieldPlotQueue(projectId ?? undefined),
  });

  const duePlots = useMemo(() => plotsQ.data?.items ?? [], [plotsQ.data]);

  const recordVisit = useMutation({
    mutationFn: (payload: AuditFieldVisitPayload) =>
      auditEngagements.recordFieldVisit(activePlot!.engagement_id, activePlot!.plot_id, payload),
    onSuccess: () => {
      setActivePlot(null);
      void qc.invalidateQueries({ queryKey: scopedKey(user, "audit-plot-queue") });
      void qc.invalidateQueries({ queryKey: scopedKey(user, "field-brief") });
      void qc.invalidateQueries({ queryKey: scopedKey(user, "audit-portfolio-summary") });
      void qc.invalidateQueries({ queryKey: ["field-ops-summary"] });
    },
  });

  if (!plotsQ.isLoading && duePlots.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
      <div className="border-b border-stone-100 px-4 py-3 dark:border-stone-800">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-stone-50">
          <ClipboardCheck className="h-4 w-4 text-sky-700" />
          {t("queueTitle")}
        </h2>
        <p className="mt-0.5 text-xs text-stone-500">{t("queueDesc")}</p>
      </div>
      {plotsQ.isLoading ? (
        <p className="px-4 py-6 text-sm text-stone-500">{t("loading")}</p>
      ) : (
        <ul className="divide-y divide-stone-100 dark:divide-stone-800">
          {duePlots.slice(0, 8).map((plot) => {
            const [lng, lat] = plot.center.coordinates;
            return (
              <li
                key={plot.plot_id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-stone-900 dark:text-stone-50">{plot.plot_code}</p>
                  <p className="text-xs text-stone-500">
                    {plot.project_name} · {plot.risk_level} risk
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                    <span>{lat.toFixed(5)}, {lng.toFixed(5)}</span>
                    <a
                      href={mapsDirectionsUrl(lat, lng)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sky-700 hover:underline"
                    >
                      <Navigation className="h-3 w-3" aria-hidden />
                      {t("openInMaps")}
                    </a>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={projectAuditIntakeHref(plot.project_id)} className="btn-secondary text-xs">
                    {t("openAudit")}
                  </Link>
                  <button
                    type="button"
                    className="btn-primary text-xs"
                    onClick={() => setActivePlot(plot)}
                  >
                    {t("recordVisit")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {activePlot ? (
        <div className="border-t border-stone-100 px-4 py-4 dark:border-stone-800">
          <p className="text-sm font-medium text-stone-900 dark:text-stone-50">
            {t("visitPlot", { code: activePlot.plot_code })}
          </p>
          <div className="mt-3">
            <AuditFieldVisitForm
              plot={toSamplingPlot(activePlot)}
              saving={recordVisit.isPending}
              onSubmit={(payload) => recordVisit.mutate(payload)}
              onCancel={() => setActivePlot(null)}
            />
          </div>
          {recordVisit.error ? (
            <p className="mt-2 text-xs text-rose-700">{errorMessage(recordVisit.error)}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
