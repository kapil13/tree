"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";
import { auditEngagements, errorMessage } from "@/lib/api";
import { AuditPanelShell } from "@/components/audit/audit-panel-shell";
import { formatAuditStatus } from "@/lib/audit-workspace";

export function AuditReauditPanel({
  engagementId,
  engagementStatus,
}: {
  engagementId: string;
  engagementStatus: string;
}) {
  const t = useTranslations("auditReaudit");
  const qc = useQueryClient();
  const [notes, setNotes] = useState("");

  const cyclesQ = useQuery({
    queryKey: ["audit-cycles", engagementId],
    queryFn: () => auditEngagements.getAuditCycles(engagementId),
  });

  const start = useMutation({
    mutationFn: () => auditEngagements.startReaudit(engagementId, { notes: notes || undefined }),
    onSuccess: () => {
      setNotes("");
      void qc.invalidateQueries({ queryKey: ["audit-cycles", engagementId] });
      void qc.invalidateQueries({ queryKey: ["audit-engagement"] });
      void qc.invalidateQueries({ queryKey: ["audit-portfolio-summary"] });
      void qc.invalidateQueries({ queryKey: ["audit-plot-queue"] });
      void qc.invalidateQueries({ queryKey: ["audit-integrity-bridge", engagementId] });
    },
  });

  const cycles = cyclesQ.data;
  const canStart = engagementStatus === "attested";

  return (
    <AuditPanelShell
      icon={RefreshCw}
      title={t("title")}
      subtitle={t("subtitle")}
      epistemicNote={t("epistemicNote")}
      statusBadge={
        cycles ? (
          <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-800 ring-1 ring-sky-200">
            {t("cycleBadge", { count: cycles.current_cycle })}
          </span>
        ) : undefined
      }
    >
      {cyclesQ.isLoading ? (
        <p className="text-sm text-stone-500">{t("loading")}</p>
      ) : (
        <>
          <p className="text-sm text-stone-600 dark:text-stone-400">
            {t("currentStatus", { status: formatAuditStatus(cycles?.status ?? engagementStatus) })}
          </p>

          {cycles && cycles.cycles.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100">{t("historyTitle")}</h3>
              <ul className="space-y-2">
                {cycles.cycles
                  .slice()
                  .reverse()
                  .map((cycle) => (
                    <li
                      key={`${cycle.cycle_number}-${cycle.archived_at}`}
                      className="rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700"
                    >
                      <p className="font-medium">
                        {t("cycleLabel", { number: cycle.cycle_number })} · {cycle.verdict ?? cycle.status}
                      </p>
                      <p className="text-xs text-stone-500">
                        {cycle.attested_at
                          ? new Date(cycle.attested_at).toLocaleDateString()
                          : new Date(cycle.archived_at).toLocaleDateString()}
                        {cycle.attestation_hash ? ` · ${cycle.attestation_hash.slice(0, 12)}…` : ""}
                      </p>
                      {cycle.notes ? <p className="mt-1 text-xs text-stone-600">{cycle.notes}</p> : null}
                    </li>
                  ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-stone-500">{t("historyEmpty")}</p>
          )}

          {canStart ? (
            <div className="space-y-3 rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-900/40">
              <p className="text-sm text-stone-700 dark:text-stone-300">{t("startHint")}</p>
              <label className="block text-sm">
                <span className="mb-1 block text-stone-600">{t("notesLabel")}</span>
                <textarea
                  className="input w-full min-h-[72px]"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("notesPlaceholder")}
                />
              </label>
              <button
                type="button"
                className="btn-primary text-sm"
                disabled={start.isPending}
                onClick={() => start.mutate()}
              >
                {start.isPending ? t("starting") : t("startButton")}
              </button>
              {start.error ? (
                <p className="text-sm text-rose-700">{errorMessage(start.error)}</p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-stone-500">{t("attestedRequired")}</p>
          )}
        </>
      )}
    </AuditPanelShell>
  );
}
