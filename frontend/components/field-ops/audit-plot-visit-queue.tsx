"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { auditEngagements, errorMessage } from "@/lib/api";
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

export function AuditPlotVisitQueue() {
  const { user } = useAuth();
  const { projectId } = useProjectContext();
  const qc = useQueryClient();
  const t = useTranslations("auditPortfolio");
  const [activePlot, setActivePlot] = useState<AuditPlotItem | null>(null);
  const [treesObserved, setTreesObserved] = useState("");
  const [treesAlive, setTreesAlive] = useState("");
  const [notes, setNotes] = useState("");
  const [outcome, setOutcome] = useState("inconclusive");

  const plotsQ = useQuery({
    queryKey: scopedKey(user, "audit-plot-queue", projectId ?? "all"),
    queryFn: () => auditEngagements.fieldPlotQueue(projectId ?? undefined),
  });

  const duePlots = useMemo(() => plotsQ.data?.items ?? [], [plotsQ.data]);

  const recordVisit = useMutation({
    mutationFn: () =>
      auditEngagements.recordFieldVisit(activePlot!.engagement_id, activePlot!.plot_id, {
        trees_observed: treesObserved ? Number(treesObserved) : undefined,
        trees_alive: treesAlive ? Number(treesAlive) : undefined,
        verification_outcome: outcome,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      setActivePlot(null);
      setTreesObserved("");
      setTreesAlive("");
      setNotes("");
      setOutcome("inconclusive");
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
          {duePlots.slice(0, 8).map((plot) => (
            <li key={plot.plot_id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium text-stone-900 dark:text-stone-50">{plot.plot_code}</p>
                <p className="text-xs text-stone-500">
                  {plot.project_name} · {plot.risk_level} risk
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  <MapPin className="mr-1 inline h-3 w-3" />
                  {plot.center.coordinates[1].toFixed(5)}, {plot.center.coordinates[0].toFixed(5)}
                </p>
              </div>
              <div className="flex gap-2">
                <Link href={projectAuditIntakeHref(plot.project_id)} className="btn-secondary text-xs">
                  {t("openAudit")}
                </Link>
                <button
                  type="button"
                  className="btn-primary text-xs"
                  onClick={() => {
                    setActivePlot(plot);
                    setTreesObserved("");
                    setTreesAlive("");
                    setNotes("");
                    setOutcome("inconclusive");
                  }}
                >
                  {t("recordVisit")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {activePlot ? (
        <div className="border-t border-stone-100 px-4 py-4 dark:border-stone-800">
          <p className="text-sm font-medium text-stone-900 dark:text-stone-50">
            {t("visitPlot", { code: activePlot.plot_code })}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="text-xs text-stone-500">
              {t("treesObserved")}
              <input
                className="input mt-1 w-full text-sm"
                type="number"
                min={0}
                value={treesObserved}
                onChange={(e) => setTreesObserved(e.target.value)}
              />
            </label>
            <label className="text-xs text-stone-500">
              {t("treesAlive")}
              <input
                className="input mt-1 w-full text-sm"
                type="number"
                min={0}
                value={treesAlive}
                onChange={(e) => setTreesAlive(e.target.value)}
              />
            </label>
          </div>
          <label className="mt-2 block text-xs text-stone-500">
            {t("outcome")}
            <select
              className="input mt-1 w-full text-sm"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
            >
              <option value="inconclusive">{t("outcomeInconclusive")}</option>
              <option value="claim_supported">{t("outcomeSupported")}</option>
              <option value="claim_unsupported">{t("outcomeUnsupported")}</option>
            </select>
          </label>
          <textarea
            className="input mt-2 w-full text-sm"
            rows={3}
            placeholder={t("notes")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="btn-primary text-xs"
              disabled={recordVisit.isPending}
              onClick={() => recordVisit.mutate()}
            >
              {recordVisit.isPending ? t("saving") : t("saveVisit")}
            </button>
            <button type="button" className="btn-secondary text-xs" onClick={() => setActivePlot(null)}>
              {t("cancel")}
            </button>
          </div>
          {recordVisit.error ? (
            <p className="mt-2 text-xs text-rose-700">{errorMessage(recordVisit.error)}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
